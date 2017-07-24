import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';

export interface RequestOpts {
  pattern: string;
  payload?: Buffer;
  timeout?: number;
}

export class TimeoutError extends Error {
  constructor(msg?: string) {
    super(msg || 'Timeout');
  }
}

export class RPCError extends Error {
  constructor(msg?: string) {
    super(msg || 'Remote rejection');
  }
}

export interface SetupRequestOpts {
  ch: Channel;
  exchange: string;
  _setTimeout?: typeof setTimeout;
  _clearTimeout?: typeof clearTimeout;
  _log?: typeof console;
}

export async function setupRequest<S>({
  ch,
  exchange,
  _setTimeout = setTimeout,
  _clearTimeout = clearTimeout,
  _log = console
}: SetupRequestOpts) {

  return async function request({
    pattern,
    payload,
    timeout = 100
  }: RequestOpts): Promise<Buffer | void> {
    const q = await ch.assertQueue('', {exclusive: true});
    const correlation  = v4();
    const content = payload ? payload : Buffer.alloc(0);
    ch.publish(exchange, pattern, content, {
      correlationId: correlation,
      replyTo: q.queue
    });

    return new Promise<Buffer>((resolve, reject) => {

      const time = _setTimeout(
        () => {
          ch.deleteQueue(q.queue)
            .then(() => {
              reject(new TimeoutError('Timeout'));
            })
            .catch(reject);
        },
        timeout
      );

      ch.consume(q.queue, (msg?: Message) => {
        if (msg && msg.properties.correlationId === correlation) {
          try {
            _clearTimeout(time);
            ch.deleteQueue(q.queue);
            if (msg.properties.headers.code === 0) {
              resolve(msg.content);
            } else {
              reject(new RPCError(msg.content.toString()));
            }
          } catch(err) {
            reject(err);
          }
          ch.ack(msg);
        }

        //TODO: If the correlationId does not mach... We should never get here. If that's the case maybe move the msg to error queue?
      });
    });
  };
}
