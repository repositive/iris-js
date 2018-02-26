import {Observer, AnonymousSubject, Observable, Subject, Subscriber, Subscription} from 'rxjs';
import { Channel, Message } from 'amqplib';
import * as amqpStream from 'amqp-stream';
import { v4 } from 'uuid';
import { Option } from 'funfix';

type AMQPSubject = AnonymousSubject<Buffer>;
type AMQPObservable = Observable<AMQPSubject>;

export function setupAMQPObservable(channel: Channel, namespace = 'default') {
  return function(pattern: string): AMQPObservable {
    const queueName = `${namespace}-${pattern}`;

    // Control registrations and stop when we run out of memory
    // memoryUsage() can be handy
    const observable: Observable<Message> = Observable.create((main: Observer<Message>) => {
      channel.assertQueue(queueName)
        .then(() => {
          channel.prefetch(100);
          channel.bindQueue(queueName, 'iris', pattern);
        })
      .then(() => {
        channel.consume(queueName, (msg: Message) => {
          main.next(msg);
          // TODO Throttle this thing
        });
      });
    });
    return observable
    .groupBy(msg => msg.properties.correlationId)
    .map(group => {
      const observer = new AMQPStreamObserver(channel, group.key);
      const end = new Subject();
      console.log(`Stream starts ${group.key}`);
      const source = group
        .takeUntil(end)
        .do((imsg) => {
          channel.ack(imsg);
          if (imsg.properties.headers.eos) {
            end.next();
            console.log(`Stream end ${group.key}`);
            // Everything that comes on a closed stream is automatically acknoledge
            group.do(msg => channel.ack(msg)).subscribe();
          }
        })
        .map(o => o.content);
      return new AnonymousSubject(observer, source);
    });
  };
}

export class AMQPStreamObserver implements Observer<Buffer> {
  closed = false;
  // We handle manually the memory of this buffer. Allocate 4Kib
  private internalBuffer: Buffer = Buffer.allocUnsafe(Math.pow(2,10) * 4);
  private bufferSize: number = 0;

  constructor(private channel: Channel, protected correlationId: string, protected exchange = '', protected queue = 'amq.rabbitmq.reply-to') {}

  /**
   * Replies to the stream over rabbitmq, if the buffer size exceeds
   * the regular block size (4Kib) it breaks it,
   * if the buffer size is smaller than the block size
   * then accumulate it in the internal buffer until it reaches the adecuate size.
   */
  next(buffer: Buffer, eos: boolean = false) {
    const written = buffer.copy(this.internalBuffer, this.bufferSize);
    this.bufferSize = this.bufferSize + written;
    if (eos || written < buffer.length) {
      // The internal buffer is full send it over and iterate to break the pending chunk
      this.channel.publish(
        '',
        'amq.rabbitmq.reply-to',
        this.internalBuffer.slice(0, this.bufferSize),
        {
          correlationId: this.correlationId,
          headers: {
            code: 0,
            eos
          }
        }
      );
      this.bufferSize = 0;
      if (written < buffer.length) {
        this.next(buffer.slice(written), eos);
      }
    }
  }

  error(error: Error) {
    // TODO Serialise the error
    this.channel.publish(
      '',
      'amq.rabbitmq.reply-to',
      Buffer.alloc(0),
      {
        correlationId: this.correlationId,
        headers: {code: 1, eos: true}
      }
    );
  }

  complete() {

    if (this.bufferSize > 0) {
      this.next(Buffer.alloc(0), true);
    }
    this.closed = true;
  }

}
