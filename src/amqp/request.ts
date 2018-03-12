import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';
import { TimeoutError, RPCError } from '../errors';
import { RequestInput } from '..';

export interface SetupRequestOpts {
  ch: Channel;
  exchange: string;
  _setTimeout?: typeof setTimeout;
  _clearTimeout?: typeof clearTimeout;
  logger?: {
    info: (...o: any[]) => void;
    debug: (...o: any[]) => void;
    error: (...o: any[]) => void;
  };
}

type RequestCorrelation = {
  time: any,
  pattern: string,
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
  logger = console
}: SetupRequestOpts) {

  const correlations: {[k: string]: RequestCorrelation | CollectCorrelation} = {};

  await ch.consume('amq.rabbitmq.reply-to', (msg?: Message) => {
    const correlationId = msg && msg.properties.correlationId;
    const correlation = correlations[correlationId];
    if (isRequestCorrelation(correlation)) {
      logger.debug(`Receiving correlated message`, {correlationId, pattern: correlation.pattern});
      _clearTimeout(correlation.time);
      if (msg && msg.properties.headers.code === 0) {
        correlation.resolve(msg.content);
      } else {
        correlation.reject(new RPCError(msg && msg.content.toString()));
      }
      logger.debug(`Done with request`, {correlationId, pattern: correlation.pattern});
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
      timeout = 5000
    }: RequestInput<Buffer>): Promise<Buffer | undefined> {

      return new Promise<Buffer>((resolve, reject) => {
        const id  = v4();
        const content = payload ? payload : Buffer.alloc(0);
        logger.debug(`Starting request`, {correlationId: id, pattern});
        ch.publish(exchange, pattern, content, {
          correlationId: id,
          replyTo: 'amq.rabbitmq.reply-to',
          expiration: timeout
        });

        const time = _setTimeout(
          () => {
            delete correlations[id];
            logger.debug(`Request to "${pattern}" timmed out after ${timeout}`);
            reject(new TimeoutError('Timeout'));
          },
          timeout
        );

        correlations[id] = {time, reject, resolve, pattern};
      });
    },

    async collect({
      pattern,
      payload,
      timeout = 100
    }: RequestInput<Buffer>): Promise<undefined | (Buffer | RPCError)[]> {

      return new Promise<(Buffer | RPCError)[]>((resolve, reject) => {
        const id  = v4();
        logger.debug(`Starting collect`, {correlationId: id, pattern});
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
