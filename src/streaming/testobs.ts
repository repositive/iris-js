import { Channel, Connection, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import * as Bluebird from 'bluebird';
import { Observable, Observer, Subject, AnonymousSubject } from 'rxjs';
import { Option } from 'funfix';
import { inspect } from 'util';
import * as R from 'ramda';
import { observeOn } from 'rxjs/operator/observeOn';
import { setImmediate } from 'timers';
import { setupAMQPHandler, AMQPSubject, ObserverStream } from './handler';
import { createReadStream } from 'fs';

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  _log: console
};

function establishConnection(): Observable<Channel> {
  const observable = Observable.create((observer: Observer<Channel>) =>connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.on('error', (err: Error) => { observer.error([err]); });
    connection.on('close', (err: Error) => { observer.error([err]); });
    connection.createChannel()
      .then(channel => {
        observer.next(channel);
        console.log('Connection stablished');
      })
      .catch(error => observer.error(error));
  }));
  return observable;
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
.map(channel => {
  setupAMQPHandler(channel, 'testStreaming')
  .map((stream: AMQPSubject) => {
    stream.subscribe(console.log, console.error);
  })
  .subscribe(() => {/**/}, console.error, () => console.log('Done!'));
})
.subscribe(() => console.log('Listening'), console.error, () => console.info('done'));
