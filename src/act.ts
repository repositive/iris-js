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
  constructor(msg: string) {
    super(msg);
  }
}

export interface SetupActOpts<S> {
  ch: Channel;
  exchange: string;
  _serialization?: SerializationOpts<S>;
}

export async function setupAct<S, M, R>({
  ch,
  exchange,
  _serialization = serialization
}: SetupActOpts<S>) {

  return async function act({
    pattern,
    payload,
    timeout = 100
  }: ActOpts<M>): Promise<R> {
    const q = await ch.assertQueue('', {exclusive: true});
    const correlation  = v4();
    const content = serialization.serialize(payload);
    ch.publish(exchange, pattern, content, {
      correlationId: correlation,
      replyTo: q.queue
    });

    return new Promise<R>((resolve, reject) => {

      const time = setTimeout(
        () => {
          ch.deleteQueue(q.queue)
            .then(() => {
              reject(new Error('Timeout'));
            })
            .catch(reject);
        },
        timeout
      );

      ch.consume(q.queue, (msg?: Message) => {
        if (msg && msg.properties.correlationId === correlation) {
          clearTimeout(time);
          resolve(serialization.parse(msg.content));
          ch.ack(msg);
        }
        //TODO: Move msg to error queue
      });
    });
  };
}
