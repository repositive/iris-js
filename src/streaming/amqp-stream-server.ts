import _amqpStream = require('amqp-stream');
import { connect } from 'amqplib';
import { Observable } from 'rxjs';
import { Duplex } from 'stream';

const amqpStream = Observable.bindNodeCallback(_amqpStream);

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  _log: console
};

function undef<T>(t: T): () => T {
  return () => t;
}

function establishConnection(): Observable<AMQPStream> {
  function _internalImplementation(): Observable<Observable<Duplex>> {
    const conn = connect(defaults.uri, { durable: true, noAck: true })
    .then(connection => {
      const connErrors = Observable.fromEvent(connection, 'error').map(err => {
        throw err;
      });
      const connClosing = Observable.fromEvent(connection, 'close').map(err => {throw err; });
      console.info('Connection established');
      return amqpStream({connection}).merge(connErrors, connClosing);
    });
    return Observable.defer(() => conn);
  }

  const observable = Observable.defer(_internalImplementation)
    .mergeAll()
    .retryWhen((errors: Observable<any>) => {
      return errors.do((err) => {
        console.error('ERROR on amqp connection', err);
        console.info('Retrying connectionin 10s');
      })
      .delay(10000)
      .do(() => {
        console.log('Retrying connection...');
      });
    });
  return observable;
}

establishConnection()
.map(stream => {
})

