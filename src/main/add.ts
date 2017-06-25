import {Pattern} from './types';
import {LibOptions} from './types';
import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';

export default async function setupAdd(ch: Channel, options: LibOptions) {
  const exchange = options.exchange; // Request exchange
  const queue = options.queue; // The base queue for the service

  await all([
    ch.assertExchange(exchange, 'topic', {durable: true})
  ]);

  return async function add<I, R>(pattern: string, implementation: (msg: Buffer) => Promise<R>): Promise<void> {
    //TODO Match for invalid patterns.
    const queueName = `${queue}-${pattern}`;
    await all([
      ch.assertQueue(queueName),
      ch.prefetch(1),
      ch.bindQueue(queueName, exchange, pattern),
      ch.consume(
        queueName,
        (msg: Message) => {
          implementation(msg.content)
            .then(response => {
              if (msg.properties && msg.properties.replyTo && msg.properties.correlationId) {
                return ch.sendToQueue(
                  msg.properties.replyTo,
                  Buffer.from(JSON.stringify(response)),
                  {correlationId: msg.properties.correlationId}
                );
              }
            })
            .then(() => {
              ch.ack(msg);
            })
            .catch(err => {
              // TODO : Move message to error queue
              console.error(err);
            });
        },
        {noAck: false}
      )
    ]);
  };
}
