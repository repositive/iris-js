import {RPCError} from './errors';

export type RequestInput<T> = {pattern: string, payload?: T, timeout?: number};
export type CollectInput<T> = RequestInput<T>;
export type EmitInput<T> = {pattern: string, payload?: T};
export type RegisterHandler<P, R> = (opts: {payload: P}) => Promise<R>;
export type RegisterInput<P, R> = {
  pattern: string,
  handler: RegisterHandler<P, R>
};

export interface IrisBackend {
  request: (rq: RequestInput<Buffer>) => Promise<Buffer | void>;
  register: (re: RegisterInput<Buffer, Buffer>) => Promise<void>;
  emit: (rq: EmitInput<Buffer>) => Promise<void>;
  collect: (rq: CollectInput<Buffer>) => Promise<(Buffer | RPCError)[]>;
}

export interface Iris {
  backend: IrisBackend;
  request: <I, O>(rq: RequestInput<I>) => Promise<O | void>;
  register: <I, O>(re: RegisterInput<I, O>) => Promise<void>;
  emit: <I>(rq: EmitInput<I>) => Promise<void>;
  collect: <I, O>(rq: CollectInput<I>) => Promise<(O | RPCError)[]>;
}
