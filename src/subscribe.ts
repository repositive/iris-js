import { SerializationOpts } from './serialization';
import serialization from './serialization';
import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';

export interface SetupAddOpts<S> {
  ch: Channel;
  exchange: string;
  _serialization?: SerializationOpts<S>;
}

export interface AddOpts<M, R> {
  pattern: string;
  implementation: (msg: M) => Promise<R>;
  namespace?: string;
}

export async function setupAdd<S, M extends S, R extends S>({
  exchange,
  ch,
  _serialization = serialization
}: SetupAddOpts<S>) {
  await ch.assertExchange(exchange, 'topic', {durable: true});

  return async function add({
    pattern,
    implementation,
    namespace
  }: AddOpts<M, R>): Promise<void> {

    //TODO Match for invalid patterns.
    const queueName = `${pattern}${namespace ? `-${namespace}` : ''}`;
    const errorName = `${pattern}${namespace ? `-${namespace}` : ''}-error`;
    return await all([
      ch.assertQueue(queueName),
      ch.prefetch(1),
      ch.bindQueue(queueName, exchange, pattern),
      ch.consume(
        queueName,
        (msg: Message) => {
          const content: M = serialization.parse(msg.content);
          function onError(err?: Error) {
            return ch.sendToQueue(
              msg.properties.replyTo,
              Buffer.from(JSON.stringify({error: (err && err.message) || 'Unexpected error'})),
              {correlationId: msg.properties.correlationId, headers: {code: 1}}
            );
          }

          try {
          return implementation(content)
            .then((response: R) => {
              if (msg.properties && msg.properties.replyTo && msg.properties.correlationId) {
                return ch.sendToQueue(
                  msg.properties.replyTo,
                  serialization.serialize(response),
                  {correlationId: msg.properties.correlationId, headers: {code: 0}}
                );
              }
            })
            .catch(onError)
            .then(() => {
              ch.ack(msg);
            });
          } catch(err) {
            onError(err);
            ch.ack(msg);
          }
        },
        {noAck: false}
      )
    ]).then(_ => undefined);
  };
}
