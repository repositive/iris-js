import { Channel, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import { Observable, Observer, Subject } from 'rxjs/Rx';
import { Option } from 'funfix';
import { inspect } from 'util';
import * as R from 'ramda';
import { observeOn } from 'rxjs/operator/observeOn';
import { setImmediate } from 'timers';


export interface SetupRegisterOpts {
  ch: Channel;
  exchange: string;
  namespace?: string;
}

interface IrisMsg {
  content: Buffer;
  stream_id: string;
  origin_pattern: string;
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

function observePattern({
  ch,
  pattern,
  namespace = 'default'
}: {
    ch: Channel,
    pattern: string,
    namespace?: string;
  }): Observable<IrisMsg> {
  const queueName = `${namespace}-${pattern}`;
  return Observable.create((observer: Observer<IrisMsg>) => {
    ch.assertQueue(queueName)
      .then(() => {
        ch.prefetch(100);
        ch.bindQueue(queueName, 'iris', pattern);
      })
      .then(() => {
        ch.consume(queueName, (msg: Message) => {
          observer.next({
            stream_id: msg.properties.correlationId,
            origin_pattern: msg.properties.replyTo,
            eos: msg.properties.headers.eos,
            content: msg.content
          });
          ch.ack(msg);
        });
      });

  });
}

connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.createChannel()
      .then(channel => {
        const observingPattern = observePattern({ ch: channel, pattern: 'testObservable' })
          .groupBy((msg) => msg.stream_id)
          .do(group => {
            const end = new Subject<IrisMsg>();
            const subscription = group
              .takeUntil(end)
              .do((msg) => {
                if (msg.eos) {
                  end.next();
                  subscription.unsubscribe();
                }
              })
              .reduce((acc, elem) => ({stream_id: elem.stream_id, count: acc.count + 1}), {count: 1})
              .subscribe(
              (msg) => {
                console.log(msg);
              },
              err => console.error(err),
              () => console.log('Done!')
            );
          })
          .map(group => ({id: group.key}))
          .subscribe(
          x => {/*console.log('Observer got a next value: ' + inspect(x))*/},
          err => console.error('Observer got an error: ' + err),
          () => console.log('Observer got a complete notification')
          );
      });
  });

