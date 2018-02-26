import { Channel, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import { Observable, Observer } from 'rxjs/Rx';
import { Option } from 'funfix';
import { v4 } from 'uuid';
// import { Observable} from 'rxjs/Observable';
// import { of } from 'rxjs/observable/of';
// import { map } from 'rxjs/operator/map';
import * as R from 'ramda';


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

interface IrisStream {
  content: Observable<Buffer>;
  _internal: Observer<Buffer>;
}

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  _log: console
};

function stream({
  ch,
  pattern,
  namespace = 'default'
}: {
    ch: Channel,
    pattern: string,
    namespace?: string;
  }) {
  const queueName = `${namespace}-${pattern}`;
  ch.assertQueue(queueName)
    .then(() => {
      ch.prefetch(10);
    })
    .then(async () => {
      Observable.interval(0)
      .groupBy(counter => Math.floor(counter / 10) )
      .do((group) => {
        const correlationId = v4();
        group.
          do(counter => {
            ch.publish('iris', pattern, Buffer.from('HELLO'), { correlationId, headers: { eos: (counter + 1) % 10 === 0 } });
          })
          .subscribe();
        })
      .subscribe();
    });
}

connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.createChannel()
      .then(channel => {
        stream({ ch: channel, pattern: 'testObservable' });
        // .delay(200)
        //.groupBy((msg) => msg.stream_id)
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
      });
  });


  // end of stream signal
