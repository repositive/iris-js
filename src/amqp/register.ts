import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';

export interface SetupRegisterOpts {
  ch: Channel;
  exchange: string;
  namespace?: string;
}

export interface HandlerOpts {
  payload: Buffer;
}

export interface RegisterOpts {
  pattern: string;
  handler: (params: (HandlerOpts)) => Promise<Buffer | void>;
  namespace?: string;
}

export async function setupRegister({
  exchange,
  ch,
  namespace = 'default'
}: SetupRegisterOpts) {
  await ch.assertExchange(exchange, 'topic', {durable: true});

  const _namespace = arguments[0].namespace;
  return async function subscribe({
    pattern,
    handler
  }: RegisterOpts): Promise<void> {
    const __namespace = arguments[0].namespace || namespace;
    const queueName = `${__namespace}-${pattern}`;
    return await all([
      ch.assertQueue(queueName),
      ch.prefetch(1),
      ch.bindQueue(queueName, exchange, pattern),
      ch.consume(
        queueName,
        (msg: Message) => {
          function onError(err?: Error) {
            return ch.publish(
              '',
              msg.properties.replyTo,
              Buffer.from(JSON.stringify({error: (err && err.message) || 'Unexpected error'})),
              {correlationId: msg.properties.correlationId, headers: {code: 1}}
            );
          }
          try {
            return handler({payload: msg.content})
              .then((response?: Buffer) => {
                if (msg.properties && msg.properties.replyTo && msg.properties.correlationId) {
                  return ch.publish(
                    '',
                    msg.properties.replyTo,
                    response || Buffer.alloc(0),
                    {correlationId: msg.properties.correlationId, headers: {code: 0}}
                  );
                }
              })
              .catch(onError)
              .then(() => {
                ch.ack(msg);
              });
          } catch(err) {
            onError(err);
            ch.ack(msg);
          }
        },
        {noAck: false}
      )
    ]).then(_ => undefined);
  };
}
