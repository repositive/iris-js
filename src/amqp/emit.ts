import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';
import { TimeoutError, RPCError } from '../errors';

export interface EmitOpts {
  pattern: string;
  payload?: Buffer;
}

export interface SetupEmitOpts {
  ch: Channel;
  exchange: string;
  _setTimeout?: typeof setTimeout;
  _clearTimeout?: typeof clearTimeout;
  _log?: typeof console;
}

export async function setupEmit({
  ch,
  exchange,
  _setTimeout = setTimeout,
  _clearTimeout = clearTimeout,
  _log = console
}: SetupEmitOpts) {

  return async function emit({
    pattern,
    payload
  }: EmitOpts): Promise<void> {
    const correlation  = v4();
    const content = payload ? payload : Buffer.alloc(0);
    ch.publish(exchange, pattern, content, {
      correlationId: correlation
    });
  };
}
