import {connect, Channel} from 'amqplib';
import {SetupRegisterOpts, setupRegister} from './register';
import {SetupRequestOpts, setupRequest} from './request';
import {SetupEmitOpts, setupEmit} from './emit';
import {RPCError} from '../errors';
import {IrisBackend, RegisterActiveContext, RegisterInput, RequestInput, CollectInput, EmitInput} from '..';
import { setupAMQPObservable, setupAMQPStreamRequest} from './streaming';
import * as R from 'ramda';
import { Observable, Observer } from 'rxjs';
import {v4} from 'uuid';

export interface LibOpts {
  uri?: string;
  exchange?: string;
  namespace?: string;
  logger?: {
    info: (...o: any[]) => void;
    error: (...o: any[]) => void;
    debug: (...o: any[]) => void;
  };
}

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  namespace: 'default',
  logger: console
};

function establishConnection(uri: string, options: any): Observable<Channel> {
  const observable = Observable.create((observer: Observer<Channel>) => {
    return connect(uri, options)
    .then(connection => {
      connection.on('error', (err: Error) => { observer.error([err]); });
      connection.on('close', (err: Error) => { observer.error([err]); });
      return connection.createChannel()
        .then(channel => {
          observer.next(channel);
        });
    })
    .catch(error => observer.error(error));
  });
  return observable;
}

export default function setup(opts: LibOpts = defaults): Observable<IrisBackend> {
  const _opts = {...defaults, ...opts};
  const {
    uri, exchange, logger
  } = _opts;


  const common_options = {durable: true, noAck: true};

  return Observable.defer(() => establishConnection(uri, common_options).map(channel => {
    channel.setMaxListeners(Infinity);
    const options = {ch: channel, ..._opts};

    const setupReqP = setupRequest(options as SetupRequestOpts);
    const setupRequestP = setupReqP.then(req => req.request);
    const setupCollectP = setupReqP.then(req => req.collect);
    const setupRegisterP = setupRegister(options as SetupRegisterOpts);
    const setupEmitP = setupEmit(options as SetupEmitOpts);
    const observe = R.curry(setupAMQPObservable)(channel);
    const stream = R.curry(setupAMQPStreamRequest)(channel);
    return Observable.fromPromise(Promise.all([setupRequestP, setupCollectP, setupRegisterP, setupEmitP]))
      .do(() => {
        logger.info(`Connection established`);
      })
      .map(([request, collect, register, emit]) => ({request, collect, register, emit, observe, stream}));
  }))
  .mergeAll()
  .retryWhen((errors: Observable<any>) => {
    return errors.do((error) => {
      logger.error(`Error on AMQP connection`, error);
      logger.info(`Retrying connection in 10s`);
    })
    .delay(10000)
    .do(() => {
      logger.info(`Retrying connection...`);
    });
  }) as any;

}
