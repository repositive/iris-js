import {Pattern} from './types';
import {LibOptions} from './types';
import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';
import {v4} from 'uuid';

export interface AddOptions {
  queue_namespace?: string;
}

export const defaultAddOptions = {};

export default async function setupAdd(ch: Channel, options: LibOptions) {
  const exchange = options.exchange; // Request exchange

  await ch.assertExchange(exchange, 'topic', {durable: true});

  return async function add(pattern: string, implementation: (msg: Buffer) => Promise<Buffer>, opts: AddOptions = {}): Promise<void> {
    const _opts = Object.assign({}, opts, defaultAddOptions);

    const queue = _opts.queue_namespace || v4();
    //TODO Match for invalid patterns.
    const queueName = `${pattern}-${queue}`;
    await all([
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
