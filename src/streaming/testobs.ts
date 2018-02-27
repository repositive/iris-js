import { Channel, Connection, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import * as Bluebird from 'bluebird';
import { Observable, Observer, Subject, AnonymousSubject } from 'rxjs';
import { Option } from 'funfix';
import { inspect } from 'util';
import * as R from 'ramda';
import { observeOn } from 'rxjs/operator/observeOn';
import { setImmediate } from 'timers';
import { setupAMQPHandler } from './subjects';


export interface SetupRegisterOpts {
  ch: Channel;
  exchange: string;
  namespace?: string;
}

interface IrisMsg {
  content: Buffer;
  stream_id: string;
  eos: boolean;
}

interface IrisStreamStart {
  type: 'start';
  id: string;
  content: Observable<Buffer>;
}

type IrisStreamEvent = IrisStreamStart | IrisStreamStop;

interface IrisStreamStop {
  type: 'stop';
  id: string;
}

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  _log: console
};

function toNativePromise<T>(b: Bluebird<T>): Promise<T> {
  return b as any;
}

type IrisRegister = (pattern: string) => Observable<AnonymousSubject<Buffer>>;

function undef<T>(t: T): () => T {
  return () => t;
}

function establishConnection(): Observable<Connection> {
  const observable = Observable.create((observer: Observer<Connection>) =>connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.on('error', (err: Error) => { observer.error([err]); });
    connection.on('close', (err: Error) => { observer.error([err]); });
    observer.next(connection);
    console.log('Connection stablished');
  }));
  return observable;
}

function bufferToEnd<T>(): Observable<T[]> {
  const self = this as Observable<T>;
  return Observable.create((observer: Observer<T[]>) => {
    const buffer: T[] = [];
    return self.subscribe(
      res => buffer.push(res),
      err => observer.error(err),
      () => {
        observer.next(buffer);
        observer.complete();
      }
    );
  });
}

class ExtraObservable<T> extends Observable<T> {
  bufferToEnd(): Observable<T[]> {
    return Observable.create((observer: Observer<T[]>) => {
      const buffer: T[] = [];
      return this.subscribe(
        res => buffer.push(res),
        err => observer.error(err),
        () => {
          observer.next(buffer);
          observer.complete();
        }
      );
    });
  }

  static from<Z>(elem: any): ExtraObservable<Z> {
    return new ExtraObservable(elem);
  }
}

Observable.defer(establishConnection)
.retryWhen((errors: Observable<any>) => {
  return errors.do((err) => {
    console.error('ERROR on amqp connection', err);
    console.info('Retrying connectionin 10s');
  }).delay(10000).do(() => {
    console.log('Retrying connection...');
  });
})
.map(connection => {
  setupAMQPHandler(connection, 'testStreaming')
  .subscribe(console.log, console.error, () => console.log('Done!'));
})
.subscribe(() => console.log('Listening'), console.error, () => console.info('done'));
