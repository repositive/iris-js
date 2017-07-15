import { SerializationOpts } from './serialization';
import serialization from './serialization';
import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';

export interface SetupRegisterOpts<S> {
  ch: Channel;
  exchange: string;
  namespace?: string;
  _serialization?: SerializationOpts<S>;
}

export interface HandlerOpts<M> {
  payload: M;
}

export interface RegisterOpts<M, R> {
  pattern: string;
  handler: (params: (HandlerOpts<M>)) => Promise<R>;
  namespace?: string;
}

export async function setupRegister<S, M extends S, R extends S>({
  exchange,
  ch,
  namespace = 'default',
  _serialization = serialization
}: SetupRegisterOpts<S>) {
  await ch.assertExchange(exchange, 'topic', {durable: true});

  const _namespace = arguments[0].namespace;
  return async function subscribe({
    pattern,
    handler
  }: RegisterOpts<M, R>): Promise<void> {
    const __namespace = arguments[0].namespace || namespace;
    const queueName = `${__namespace}-${pattern}`;
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
          return handler({payload: content})
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