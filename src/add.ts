import { SerializationOpts } from './serialization';
import serialization from './serialization';
import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';

export interface SetupAddOpts<T> {
  ch: Channel;
  exchange: string;
  queue: string;
  _serialization?: SerializationOpts<T>;
}

export async function setupAdd<S>({
  exchange,
  ch,
  queue,
  _serialization = serialization
}: SetupAddOpts<S>) {
  await ch.assertExchange(exchange, 'topic', {durable: true});

  return async function add({
    pattern,
    implementation
  }: {
    pattern: string,
    implementation: (msg: S) => Promise<S>
  }): Promise<void> {

    //TODO Match for invalid patterns.
    const queueName = `${pattern}-${queue}`;
    const errorName = `${pattern}-${queue}-error`;
    return await all([
      ch.assertQueue(queueName),
      ch.prefetch(1),
      ch.bindQueue(queueName, exchange, pattern),
      ch.consume(
        queueName,
        (msg: Message) => {
          const content: S = serialization.parse(msg.content);
          return implementation(content)
            .then((response: S) => {
              if (msg.properties && msg.properties.replyTo && msg.properties.correlationId) {
                return ch.sendToQueue(
                  msg.properties.replyTo,
                  serialization.serialize(response),
                  {correlationId: msg.properties.correlationId}
                );
              }
            })
            .catch((err?: Error) => {
              return all([
                ch.sendToQueue(
                  errorName,
                  msg.content,
                  {correlationId: msg.properties.correlationId}
                ),
                ch.sendToQueue(
                  msg.properties.replyTo,
                  Buffer.from(JSON.stringify({error: (err && err.message) || 'Unexpected error'})),
                  {correlationId: msg.properties.correlationId}
                )
              ]);
            })
            .then(() => {
              ch.ack(msg);
            });
        },
        {noAck: false}
      )
    ]).then(_ => undefined);
  };
}
