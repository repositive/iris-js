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

function sleep(n: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, n);
  });
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
      const correlationId  = v4();
      let counter = 0;
      while (counter <= 100) {
        counter++;
        await sleep(0);
        //console.log('sending');
        if (counter % 10000 === 0) {
          console.log(`${counter / 1000}k`);
        }
        await ch.publish('iris', pattern, Buffer.from('HELLO'), { correlationId, headers: { eos: counter === 100 } });
      }
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
