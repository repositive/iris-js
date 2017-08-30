import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';
import { TimeoutError, RPCError } from '../errors';

export interface RequestOpts {
  pattern: string;
  payload?: Buffer;
  timeout?: number;
}

export interface SetupRequestOpts {
  ch: Channel;
  exchange: string;
  _setTimeout?: typeof setTimeout;
  _clearTimeout?: typeof clearTimeout;
  _log?: typeof console;
}

type RequestCorrelation = {
  time: any,
  resolve: any,
  reject: any
};

function isRequestCorrelation(o?: any): o is RequestCorrelation {
  return o && o.time && o.resolve && o.reject;
}

type CollectCorrelation = {
  responses: any[]
};

export async function setupRequest<S>({
  ch,
  exchange,
  _setTimeout = setTimeout,
  _clearTimeout = clearTimeout,
  _log = console
}: SetupRequestOpts) {

  const correlations: {[k: string]: RequestCorrelation | CollectCorrelation} = {};

  await ch.consume('amq.rabbitmq.reply-to', (msg?: Message) => {
    const correlation = correlations[msg && msg.properties.correlationId];
    if (isRequestCorrelation(correlation)) {
      _clearTimeout(correlation.time);
      if (msg && msg.properties.headers.code === 0) {
        correlation.resolve(msg.content);
      } else {
        correlation.reject(new RPCError(msg && msg.content.toString()));
      }
    } else if(correlation) {
      if (msg && msg.properties.headers.code === 0) {
        correlation.responses.push(msg && msg.content);
      } else {
        correlation.responses.push(new RPCError(msg && msg.content.toString()));
      }
    }
  }, {noAck: true});

  return {
    async request({
      pattern,
      payload,
      timeout = 100
    }: RequestOpts): Promise<Buffer | void> {

      return new Promise<Buffer>((resolve, reject) => {
        const id  = v4();
        const content = payload ? payload : Buffer.alloc(0);
        ch.publish(exchange, pattern, content, {
          correlationId: id,
          replyTo: 'amq.rabbitmq.reply-to',
          expiration: timeout
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
    },

    async collect({
      pattern,
      payload,
      timeout = 100
    }: RequestOpts): Promise<void | (Buffer | RPCError)[]> {

      return new Promise<(Buffer | RPCError)[]>((resolve, reject) => {
        const id  = v4();
        const content = payload ? payload : Buffer.alloc(0);
        ch.publish(exchange, pattern, content, {
          correlationId: id,
          replyTo: 'amq.rabbitmq.reply-to',
          expiration: timeout
        });

        const time = _setTimeout(
          () => {
            resolve((correlations[id] as CollectCorrelation).responses);
            delete correlations[id];
          },
          timeout
        );

        correlations[id] = {time, responses: []};
      });
    }
  };
}
