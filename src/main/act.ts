import {LibOptions, Pattern} from './types';
import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';

export interface ActOptions {
  sync?: boolean;
  timeout?: number;
  multi?: boolean;
}

export const defaultOptions: ActOptions = {
  sync: true,
  timeout: 100,
  multi: false
};

export class TimeoutError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export default async function setupAct(ch: Channel, options: LibOptions) {
  const exchange = options.exchange;

  return function act<T>(pattern: string, opts: ActOptions = {}): ((payload: Buffer) => Promise<T[]>) {
    const _opts = Object.assign({}, opts, defaultOptions);
    return async function _act(payload: Buffer) {
      const q = await ch.assertQueue('', {exclusive: true});
      const correlation  = v4();
      ch.publish(exchange, pattern, payload, {
        correlationId: correlation,
        replyTo: q.queue
      });

      return new Promise((resolve, reject) => {
        const responses: Buffer[] = [];

        const timeout = setTimeout(
          () => {
            ch.deleteQueue(q.queue)
              .then(() => {
                if (_opts.multi) {
                  resolve(responses);
                } else {
                  reject(new Error('Timeout'));
                }
              })
              .catch(reject);
          },
          _opts.timeout
        );

        ch.consume(q.queue, (msg?: Message) => {
          if (msg && msg.properties.correlationId === correlation) {
            if (!_opts.multi) {
              clearTimeout(timeout);
              resolve(msg.content);
            } else {
              responses.push(msg.content);
            }
            ch.ack(msg);
          }
          //TODO: Move msg to error queue
        });
      });
    };
  };
}
