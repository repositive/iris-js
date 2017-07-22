import IrisAMQP from './amqp';
import {LibOpts as IrisAMQPLibOpts} from './amqp';
import {parse, serialize} from './serialization';
import {curry, pipeP, lensProp, over} from 'ramda';

type F1<T, R> = (t: T) => R;
const toPromise = curry(function toPromise<T, R>(f: F1<T, R>, val: T) {
  return Promise.resolve(f(val));
});

const lensPayload = lensProp('payload');
const lensHandler = lensProp('handler');
const serializePayload = toPromise(over(lensPayload, serialize));
const parsePayload = toPromise(over(lensPayload, parse));

const serializeP = toPromise(serialize);

const transformHandler = toPromise(over(lensHandler, (handler) => pipeP(parsePayload, handler, serializeP)));
export default async function(opts: IrisAMQPLibOpts = {}) {
  const backend = await IrisAMQP(opts);


  type RequestInput<T> = {pattern: string, payload?: T};
  type RegisterInput<P, R> = {
    pattern: string,
    handler: (opts: {payload: P}) => Promise<R>
  };

  return {
    request<T, R>(inp: RequestInput<T>) {
      return pipeP<RequestInput<T>, any, any, R>(
        serializePayload,
        backend.request,
        parse
      )(inp);
    },
    register<T, R>(inp: RegisterInput<T, R>) {
      return pipeP<RegisterInput<T, R>, any, void>(
        transformHandler,
        backend.register
      )(inp);
    }
  };
}
