import { SerializationOpts } from './index';
import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';

export interface SetupAddOpts<T> {
  ch: Channel;
  serialization: SerializationOpts<T>;
  exchange: string;
  queue: string;
}

export async function setupAdd<S>(args: SetupAddOpts<S>) {
  const { exchange, ch, queue } = args; // Request exchange
  await ch.assertExchange(exchange, 'topic', {durable: true});

  return async function add({
    pattern,
    implementation
  }: {
    pattern: string,
    implementation: (msg: Buffer) => Promise<Buffer>
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
          return implementation(msg.content)
            .then(response => {
              if (msg.properties && msg.properties.replyTo && msg.properties.correlationId) {
                return ch.sendToQueue(
                  msg.properties.replyTo,
                  response,
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
