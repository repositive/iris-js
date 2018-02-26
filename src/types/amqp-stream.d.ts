
declare module 'amqp-stream' {
  import { Duplex } from 'stream';
  import { Connection } from 'amqplib';

  interface AMQPStream extends Duplex {}

  interface Options {
    connection: Connection;
    exchange?: string;
    queue?: string;
    routingKey?: string;
    autoBind?: boolean;
    exchangeOptions?: any;
    queueOptions?: any;
    publishOptions?: any;
  }

  type Callback = (error: Error, stream: AMQPStream) => void;

  function stream(options: Options, callback: Callback): void;
  export = stream;
}
