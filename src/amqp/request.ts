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

  const correlations: {[k: string]: {time: any, resolve: any, reject: any}} = {};

  await ch.consume('amq.rabbitmq.reply-to', (msg?: Message) => {
    const correlation = correlations[msg && msg.properties.correlationId];
    if (correlation) {
      _clearTimeout(correlation.time);
      if (msg && msg.properties.headers.code === 0) {
        correlation.resolve(msg.content);
      } else {
        correlation.reject(new RPCError(msg && msg.content.toString()));
      }
    }
  }, {noAck: true});

  return async function request({
    pattern,
    payload,
    timeout = 100
  }: RequestOpts): Promise<Buffer | void> {

    return new Promise<Buffer>((resolve, reject) => {
      const id  = v4();
      const content = payload ? payload : Buffer.alloc(0);
      ch.publish(exchange, pattern, content, {
        correlationId: id,
        replyTo: 'amq.rabbitmq.reply-to'
      });
      const time = _setTimeout(
        () => {
          delete correlations[id];
          reject(new TimeoutError('Timeout'));
        },
        timeout
      );

      correlations[id] = {time, reject, resolve};
    });
  };
}
