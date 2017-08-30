import _IrisAMQP from './amqp';
import {LibOpts as IrisAMQPLibOpts} from './amqp';
import {parse, serialize} from './serialization';
import {curry, pipeP, lensProp, over} from 'ramda';

export const IrisAMQP = _IrisAMQP;

type F1<T, R> = (t: T) => R;
export const toPromise = curry(function toPromise<T, R>(f: F1<T, R>, val: T) {
  return Promise.resolve(f(val));
});

const lensPayload = lensProp('payload');
const lensHandler = lensProp('handler');
const serializePayload = toPromise(over(lensPayload, serialize));
const parsePayload = toPromise(over(lensPayload, parse));

const serializeP = toPromise(serialize);

const transformHandler = toPromise(over(lensHandler, (handler) => pipeP(parsePayload, handler, serializeP)));

export default async function(opts: (IrisAMQPLibOpts & {
  _IrisAMQP?: typeof IrisAMQP
})) {
  const __IrisAMQP = opts._IrisAMQP || IrisAMQP;

  const backend = await __IrisAMQP(opts);


  type RequestInput<T> = {pattern: string, payload?: T, timeout?: number};
  type EmitInput<T> = {pattern: string, payload?: T};
  type RegisterInput<P, R> = {
    pattern: string,
    handler: (opts: {payload: P}) => Promise<R>
  };

  const request: <T, R>(o: RequestInput<T>) => Promise<R | void> = pipeP(
    serializePayload,
    backend.request,
    parse
  );

  const register: <T, R> (o: RegisterInput<T, R>) => Promise<void> = pipeP(
    transformHandler,
    backend.register
  );

  const emit: <T>(o: EmitInput<T>) => Promise<void> = pipeP(
    serializePayload,
    backend.emit
  );

  return {
    request,
    register,
    emit
  };
}
