import {Observer, AnonymousSubject, Observable, Subject, Subscriber, Subscription} from 'rxjs';
import { Channel, Message, Connection } from 'amqplib';
import { v4 } from 'uuid';
import { Option } from 'funfix';

export type AMQPSubject = Subject<Buffer>;
export type AMQPObservable = Observable<AMQPSubject>;

export interface BindOptions {
  pattern: string;
  exchange: string;
  exchangeOptions?: any;
}

/**
 *  Creates a new queue, if provided it also binds the queue to an exchange
 */
export function createQueue(connection: Connection, queue: string, _bindOptions?: BindOptions, queueOptions: any = {}): Promise<any> {
  const bindOptions = Option.of(_bindOptions);

  const result = connection.createChannel().then(channel => {
    const createExchange = bindOptions.map(opts => channel.assertExchange(opts.exchange, opts.exchangeOptions || {})).getOrElse(Promise.resolve());
    const createQueue = channel.assertQueue(queue, queueOptions);
    return Promise.all([createExchange, createQueue]).then(() => {
      return bindOptions.map(opts => channel.bindQueue(queue, opts.exchange, opts.pattern));
    });
  });

  return Promise.resolve(result);
}

export function queueObservable(channel: Channel, queue: string): Observable<Message> {
  return Observable.create((observer: Observer<Message>) => {
    return channel.consume(queue, (msg: Message) => {
      // TODO Handle error responses by filtering msg.properties.headers.code
      // TODO Handle end of stream x-stream-eos = true header
      observer.next(msg);
    })
    .catch(error => observer.error(error));
  });
}

type SimpleRPCMessage = Message;

function isSimpleRPCMessage(o: any): o is SimpleRPCMessage {
  return o.properties.headers['content-type'] !== 'application/octet-stream';
}

/**
 * This messages can be acted right away
 */
export function handleSingleRPC(channel: Channel, input: Observable<Message>): Observable<AMQPSubject> {
  return input.filter<Message, SimpleRPCMessage>(isSimpleRPCMessage).map(msg => {
    const correlationId = msg.properties.correlationId;
    const observer: Observer<Buffer> = new AMQPStreamObserver(channel, correlationId);
    const observable = Observable.from([msg.content]);
    return new AnonymousSubject(observer, observable);
  });
}

type StreamRPCMessage = Message;

function isStreamRPCMessage(o: any): o is StreamRPCMessage {
  return o.properties.headers['content-type'] === 'application/octet-stream';
}

export function handleStreamRPC(channel: Channel, input: Observable<Message>): Observable<AMQPSubject> {
  return input.filter<Message, SimpleRPCMessage>(isStreamRPCMessage).groupBy(msg => msg.properties.correlationId).map(group => {
    const correlationId = group.key;
    const requestQueue = `request-${correlationId}`;
    const replyQueue = `reply-${correlationId}`;
    const observer: Observer<Buffer> = new AMQPStreamObserver(channel, correlationId, replyQueue);
    const requestObservable = queueObservable(channel, requestQueue).map(msg => msg.content);
    // TODO When this is done we should delete the remote queues
    const observable = group.map(msg => msg.content).merge(requestObservable);
    return new AnonymousSubject(observer, observable);
  });
}

export function setupAMQPHandler(connection: Connection, pattern: string, namespace = 'default'): AMQPObservable {
  const queueName = `${namespace}-${pattern}`;
  return Observable.create((main: Observer<Observable<AMQPSubject>>) => {
    connection.createChannel()
    .then(channel => {
      return channel.assertQueue(queueName)
        .then(() => {
          channel.prefetch(100);
          channel.bindQueue(queueName, 'iris', pattern);
        })
      .then(() => {
        const subObservable = queueObservable(channel, queueName);
        main.next(Observable.merge(handleSingleRPC(channel, subObservable), handleStreamRPC(channel, subObservable)));
      });
    })
    .catch(error => {
      main.error(error);
    });
  }).mergeAll();
}

export class AMQPStreamObserver implements Observer<Buffer> {
  closed = false;
  // We handle manually the memory of this buffer. Allocate 4Kib
  private internalBuffer: Buffer = Buffer.allocUnsafe(Math.pow(2,10) * 4);
  private bufferSize: number = 0;

  constructor(private channel: Channel, protected correlationId: string, protected queue = 'amq.rabbitmq.reply-to') {}

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
        this.queue,
        this.internalBuffer.slice(0, this.bufferSize),
        {
          correlationId: this.correlationId,
          headers: {
            code: 0,
            'x-stream-eos': eos
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
      this.queue,
      Buffer.alloc(0),
      {
        correlationId: this.correlationId,
        headers: {code: 1, 'x-stream-eos': true}
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
