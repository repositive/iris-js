import _IrisAMQP from './amqp';
import {LibOpts as IrisAMQPLibOpts} from './amqp';
import {parse, serialize} from './serialization';
import {is, identity, ifElse, map, curry, pipeP, lensProp, over} from 'ramda';
import {RPCError} from './errors';
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

const parseArray = toPromise(map(ifElse(is(Buffer), parse, identity))) as any;

const transformHandler = toPromise(over(lensHandler, (handler) => pipeP(parsePayload, handler, serializeP)));

export type RequestInput<T> = {pattern: string, payload?: T, timeout?: number};
export type CollectInput<T> = RequestInput<T>;
export type EmitInput<T> = {pattern: string, payload?: T};
export type RegisterInput<P, R> = {
  pattern: string,
  handler: (opts: {payload: P}) => Promise<R>
};

export interface Iris {
  request: <I, O>(rq: RequestInput<I>) => Promise<O | void>;
  register: <I, O>(re: RegisterInput<I, O>) => Promise<void>;
  emit: <I>(rq: EmitInput<I>) => Promise<void>;
  collect: <I, O>(rq: CollectInput<I>) => Promise<(O | RPCError)[]>;
}

export default async function(opts: (IrisAMQPLibOpts & {
  _IrisAMQP?: typeof IrisAMQP
})): Promise<Iris> {
  const __IrisAMQP = opts._IrisAMQP || IrisAMQP;

  const backend = await __IrisAMQP(opts);

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

  const collect: <T, R> (o: CollectInput<T>) => Promise<(R | RPCError)[]> = pipeP(
    serializePayload,
    backend.collect,
    parseArray
  );

  return {
    request,
    register,
    emit,
    collect
  };
}
