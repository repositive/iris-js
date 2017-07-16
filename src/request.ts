import { SerializationOpts } from './serialization';
import serialization from './serialization';
import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';

export interface RequestOpts<P> {
  pattern: string;
  payload?: P;
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

export interface SetupRequestOpts<S> {
  ch: Channel;
  exchange: string;
  _serialization?: SerializationOpts<S>;
  _setTimeout?: typeof setTimeout;
  _clearTimeout?: typeof clearTimeout;
  _log?: typeof console;
}

export async function setupRequest<S>({
  ch,
  exchange,
  _serialization = serialization,
  _setTimeout = setTimeout,
  _clearTimeout = clearTimeout,
  _log = console
}: SetupRequestOpts<S>) {

  return async function request<P, R>({
    pattern,
    payload,
    timeout = 100
  }: RequestOpts<P>): Promise<R> {
    const q = await ch.assertQueue('', {exclusive: true});
    const correlation  = v4();
    const content = payload ? _serialization.serialize(payload) : Buffer.alloc(0);
    ch.publish(exchange, pattern, content, {
      correlationId: correlation,
      replyTo: q.queue
    });

    return new Promise<R>((resolve, reject) => {

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
          _clearTimeout(time);
          ch.deleteQueue(q.queue);
          if (msg.properties.headers.code === 0) {
            resolve(_serialization.parse(msg.content));
          } else {
            reject(new RPCError(msg.content.toString()));
          }
          ch.ack(msg);
        }

        //TODO: If the correlationId does not mach... We should never get here. If that's the case maybe move the msg to error queue?
      });
    });
  };
}
