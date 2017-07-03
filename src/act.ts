import { SerializationOpts } from './serialization';
import serialization from './serialization';
import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';

export interface ActOpts {
  pattern: string;
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

export async function setupAct<S>({
  ch,
  exchange,
  _serialization = serialization
}: SetupActOpts<S>) {

  return function act({
    pattern,
    timeout = 100
  }: ActOpts): ((payload: S) => Promise<S>) {
    return async function _act(payload: S) {
      const q = await ch.assertQueue('', {exclusive: true});
      const correlation  = v4();
      const content = serialization.serialize(payload);
      ch.publish(exchange, pattern, content, {
        correlationId: correlation,
        replyTo: q.queue
      });

      return new Promise<S>((resolve, reject) => {

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
  };
}
