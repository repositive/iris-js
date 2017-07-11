import { SerializationOpts } from './serialization';
import serialization from './serialization';
import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';

export interface ActOpts<M> {
  pattern: string;
  payload: M;
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

export interface SetupActOpts<S> {
  ch: Channel;
  exchange: string;
  _serialization?: SerializationOpts<S>;
  _setTimeout?: typeof setTimeout;
  _clearTimeout?: typeof clearTimeout;
  _log?: typeof console;
}

export async function setupAct<S, M, R>({
  ch,
  exchange,
  _serialization = serialization,
  _setTimeout = setTimeout,
  _clearTimeout = clearTimeout,
  _log = console
}: SetupActOpts<S>) {

  return async function act({
    pattern,
    payload,
    timeout = 100
  }: ActOpts<M>): Promise<R> {
    const q = await ch.assertQueue('', {exclusive: true});
    const correlation  = v4();
    const content = _serialization.serialize(payload);
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
          const code = msg.content[0];
          const data = msg.content.slice(1);
          if (code === 0) {
            resolve(_serialization.parse(data));
          } else {
            reject(new RPCError(data.toString()));
          }
          ch.ack(msg);
        }

        //TODO: If the correlationId does not mach... We should never get here. If that's the case maybe move the msg to error queue?
      });
    });
  };
}
