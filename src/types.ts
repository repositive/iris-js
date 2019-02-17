import {RPCError} from './errors';
import { Subject, Observable } from 'rxjs';
export type RequestInput<T> = {pattern: string, payload?: T, timeout?: number};
export type CollectInput<T> = RequestInput<T>;
export type EmitInput<T> = {pattern: string, payload?: T};
export type RegisterHandlerInput<P> = {payload?: P, context: RegisterActiveContext};
export type RegisterHandler<P, R> = (opts: RegisterHandlerInput<P>) => Promise<R>;
export type RegisterInput<P, R> = {
  pattern: string;
  handler: RegisterHandler<P, R>;
  namespace?: string;
  retry?: number;
};

export type AMQPSubject = Subject<Buffer>;
export type AMQPObservable = Observable<AMQPSubject>;

export interface IrisBackend {
  request: (rq: RequestInput<Buffer>) => Promise<Buffer | undefined>;
  register: (re: RegisterInput<Buffer, Buffer>) => Promise<RegisterActiveContext>;
  emit: (rq: EmitInput<Buffer>) => Promise<undefined>;
  collect: (rq: CollectInput<Buffer>) => Promise<(Buffer | RPCError)[]>;
  observe: (pattern: string) => AMQPObservable;
  stream: (pattern: string) => AMQPObservable;
}

export interface RegisterActiveContext {
  pause: () => Promise<RegisterPausedContext>;
}
export interface RegisterPausedContext {
  resume: () => Promise<RegisterActiveContext>;
}

export interface Iris {
  backend: IrisBackend;
  request: <I, O>(rq: RequestInput<I>) => Promise<O | undefined>;
  register: <I, O>(re: RegisterInput<I, O>) => Promise<RegisterActiveContext>;
  emit: <I>(rq: EmitInput<I>) => Promise<undefined>;
  collect: <I, O>(rq: CollectInput<I>) => Promise<(O | RPCError)[]>;
  observe: (pattern: string) => AMQPObservable;
  stream: (pattern: string) => AMQPObservable;
}
