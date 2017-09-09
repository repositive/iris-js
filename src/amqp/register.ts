import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';
import {RegisterInput} from '..';

export interface SetupRegisterOpts {
  ch: Channel;
  exchange: string;
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
    handler,
    maxRetrys = 0
  }: RegisterInput<Buffer, Buffer>): Promise<void> {
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
            const retry = msg.properties.headers.retry || 0;
            if (retry < maxRetrys) {
              return ch.sendToQueue(
                queueName,
                msg.content,
                {...msg.properties, headers: {...msg.properties.headers, retry: retry + 1}}
              );
            } else if (msg.properties.correlationId) {
              return ch.publish(
                '',
                msg.properties.replyTo,
                Buffer.from(JSON.stringify({error: (err && err.message) || 'Unexpected error', retry})),
                {correlationId: msg.properties.correlationId, headers: {code: 1}}
              );
            }
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
