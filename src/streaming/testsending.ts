import { Channel, Connection, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import * as Bluebird from 'bluebird';
import { Observable, Observer, Subject, AnonymousSubject } from 'rxjs';
import { Option } from 'funfix';
import { inspect } from 'util';
import * as R from 'ramda';
import { observeOn } from 'rxjs/operator/observeOn';
import { setImmediate } from 'timers';
import { setupAMQPRequest, AMQPSubject, ObserverStream } from './handler';
import { createReadStream } from 'fs';

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  _log: console
};

function establishConnection(): Observable<{connection: Connection, channel: Channel}> {
  const observable = Observable.create((observer: Observer<{connection: Connection, channel: Channel}>) =>connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.on('error', (err: Error) => { observer.error([err]); });
    connection.on('close', (err: Error) => { observer.error([err]); });
    connection.createChannel()
      .then(channel => {
        observer.next({connection, channel});
      });
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
.map(({connection, channel}) => {
  setupAMQPRequest(channel, 'testStreaming')
  .map((stream: AMQPSubject) => {
    stream.subscribe();
    process.nextTick(() => {
      const fileStream = createReadStream('/dev/urandom');
      fileStream.pipe(new ObserverStream(stream));
    });
        //const rst = createReadStream('/dev/random');
    //rst.pipe(new ObserverStream(stream));

  })
  .subscribe(() => {/**/}, console.error, () => console.log('Done!'));
})
.subscribe(() => console.log('Listening'), console.error, () => console.info('done'));
