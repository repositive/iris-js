import { Channel, Connection, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import * as Bluebird from 'bluebird';
import { Observable, Observer, Subject, AnonymousSubject } from 'rxjs';
import { Option } from 'funfix';
import { inspect } from 'util';
import * as R from 'ramda';
import { observeOn } from 'rxjs/operator/observeOn';
import { setImmediate } from 'timers';
import { setupAMQPObservable } from './subjects';


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

function stablishChannel(connection: Connection): Promise<IrisRegister> {
  return toNativePromise(connection.createChannel()
    .then(channel => setupAMQPObservable(channel)));
}

function establishConnection(): Promise<Observable<IrisRegister>> {
  const conn = connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    const connErrors = Observable.fromEvent(connection, 'error').map(err => {
        throw err;
      });
    const connClosing = Observable.fromEvent(connection, 'close').map(err => {throw err; });
    console.info('Connection established');
    return Observable.defer(undef(stablishChannel(connection)))
      .merge(connErrors, connClosing);
  });
  return toNativePromise(conn);
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
.mergeAll()
.retryWhen((errors: Observable<any>) => {
  return errors.do((err) => {
    console.error('ERROR on amqp connection', err);
    console.info('Retrying connectionin 10s');
  }).delay(10000).do(() => {
    console.log('Retrying connection...');
  });
})
.map(register => {
  console.log('Time to register stuff');
  register('testObservable')
  .map(stream => {
    stream.reduce((acc: Buffer[], buff: Buffer) => [...acc, buff], [])
    .map(arr => Buffer.concat(arr))
    .do((msg) => console.log(msg.toString()))
    .subscribe();
  })
  .subscribe();
})
.subscribe(() => console.log('Listening'), console.error, () => console.info('done'));
