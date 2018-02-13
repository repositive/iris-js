import { Channel, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import { Observable, Observer } from 'rxjs/Rx';
import { Option } from 'funfix';
import { inspect } from 'util';
// import { Observable} from 'rxjs/Observable';
// import { of } from 'rxjs/observable/of';
// import { map } from 'rxjs/operator/map';
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
}

interface InternalStream {
  content: Observable<Buffer>;
  id: string;
  observer: Observer<Buffer>;
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
  }): Observable<IrisStreamEvent> {
  const queueName = `${namespace}-${pattern}`;
  return Observable.create((observer: Observer<IrisStreamEvent>) => {
    ch.assertQueue(queueName)
      .then(() => {
        ch.prefetch(10);
        ch.bindQueue(queueName, 'iris', pattern);
      })
      .then(() => {
        // WARNING! MEMORY LEAK AHEAD
        const activeStreams: { [k: string]: InternalStream } = {};
        ch.consume(queueName, (msg: Message) => {
          const id = msg.properties.correlationId;
          Option.of<InternalStream>(activeStreams[id])
            .map(o => Promise.resolve(o))
            .getOrElseL<Promise<InternalStream>>(() => {

              const fake = {
                observer: undefined as any,
                id,
                content: undefined as any
              };
              const content = Observable.create.bind(fake)((__observer: Observable<Buffer>) => {
                this.observer = __observer;
                this.content = content;
              });
              return new Promise(resolve => {

                setTimeout(() => {
                  observer.next({
                    type: 'start',
                    content: fake.content,
                    id
                  });
                  resolve(fake);
                }, 10);
              });
            })
            .then((stream) => {
              //

              stream.observer.next(msg.content);
              if (msg.properties.headers.eof) {
                stream.observer.complete();
                delete activeStreams[stream.id];
              }
              ch.ack(msg);
            });
          // .getOrElseL(() => {
          //   let newObserver: any = undefined;
          //   const content = Observable.create((_observer: Observable<Buffer>) => {
          //     newObserver = _observer;
          //   });
          //   const newStream = {
          //     content,
          //     id: msg.properties.correlationId,
          //     observer: newObserver
          //   };
          //   activeStreams[msg.properties.correlationId] = newStream;
          //   observer.next({
          //     id: msg.properties.correlationId,
          //     type: 'start',
          //     content
          //   });
          //   return newStream;
          // });

          // if (!msg) observer.complete();
        });
      });

  });
}

connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.createChannel()
      .then(channel => {
        const observingPattern = observePattern({ ch: channel, pattern: 'testObservable' })
          // .delay(200)
          .map(group => {
            if (group.type === 'start') {
              group.content.subscribe(
                (elem) => {
                  console.log(elem);
                },
                console.error,
                () => console.log('Done!', group.id)
              );
            }

          })
          //     // DOES OBJECT WITH ID EXIST IN ACC?
          //     const existingStream = Option.of<IrisStream>(activeStreams[curr.stream_id]).getOrElseL(() => {
          //       let _internal: any = undefined;
          //       const content = Observable.create((observer: Observer<Buffer>) => {
          //         _internal = observer;
          //       });
          //       const stream = {
          //         content,
          //         _internal
          //       };
          //       activeStreams[curr.stream_id] = stream;
          //       return stream as IrisStream;
          //     });
          //     existingStream._internal.next(curr.content);
          //     return existingStream;
          // }, Observable.empty)
          // .subscribe((payload: any) => console.log(payload));
          .subscribe(
          x => console.log('Observer got a next value: ' + console.log(x)),
          err => console.error('Observer got an error: ' + err),
          () => console.log('Observer got a complete notification')
          );
      });
  });


  // end of stream signal
