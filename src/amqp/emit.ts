import { all } from 'bluebird';
import {Channel, Message} from 'amqplib';
import {v4} from 'uuid';
import { TimeoutError, RPCError } from '../errors';
import { EmitInput } from '..';

export interface SetupEmitOpts {
  ch: Channel;
  exchange: string;
  _log?: typeof console;
}

export async function setupEmit({
  ch,
  exchange,
  _log = console
}: SetupEmitOpts) {

  return async function emit({
    pattern,
    payload
  }: EmitInput<Buffer>): Promise<void> {
    const correlation  = v4();
    const content = payload ? payload : Buffer.alloc(0);
    ch.publish(exchange, pattern, content, {
      correlationId: correlation
    });
  };
}
