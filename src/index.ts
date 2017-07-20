import IrisAMQP from './amqp';
import {LibOpts as IrisAMQPLibOpts} from './amqp';
import {parse, serialize} from './serialization';
import {pipeP} from 'ramda';

export default async function(opts: IrisAMQPLibOpts = {}) {
  const backend = await IrisAMQP(opts);

  return {
    request: pipeP(
      async ({pattern, payload}: {pattern: string, payload: any}) => ({pattern, payload: serialize(payload)}),
      backend.request
    )
  };
}
