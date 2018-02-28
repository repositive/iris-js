import _IrisAMQP from './amqp';
import {LibOpts as IrisAMQPLibOpts} from './amqp';
import {parse, serialize} from './serialization';
import {is, identity, ifElse, map, curry, pipeP, lensProp, over} from 'ramda';
import {RPCError} from './errors';
export const IrisAMQP = _IrisAMQP;
import {RegisterActiveContext, RegisterHandler, Iris, RegisterInput, EmitInput, CollectInput,RequestInput} from './types';
import { Observable } from 'rxjs';
export * from './types';
export * from './utils';

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

const transformHandler = toPromise(over(lensHandler, (handler: RegisterHandler<any, any>) => pipeP(parsePayload, handler, serializeP)));

export default function(opts: (IrisAMQPLibOpts & {
  _IrisAMQP?: typeof IrisAMQP
})): Observable<Iris> {
  const __IrisAMQP = opts._IrisAMQP || IrisAMQP;

  return __IrisAMQP(opts).map(backend => {
    const request: <T, R>(o: RequestInput<T>) => Promise<R | undefined> = pipeP(
      serializePayload,
      backend.request,
      parse
    );

    const register: <T, R> (o: RegisterInput<T, R>) => Promise<RegisterActiveContext> = pipeP(
      transformHandler,
      backend.register
    );

    const emit: <T>(o: EmitInput<T>) => Promise<undefined> = pipeP(
      serializePayload,
      backend.emit
    );

    const collect: <T, R> (o: CollectInput<T>) => Promise<(R | RPCError)[]> = pipeP(
      serializePayload,
      backend.collect,
      parseArray
    );

    return {
      backend,
      request,
      register,
      emit,
      collect
    };
  });
}
