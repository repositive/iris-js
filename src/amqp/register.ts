import {Channel, Message} from 'amqplib';
import {all} from 'bluebird';
import {RegisterInput, RegisterHandler, RegisterActiveContext, RegisterPausedContext} from '..';

export interface SetupRegisterOpts {
  ch: Channel;
  exchange: string;
  namespace?: string;
}

function _resume({
  ch,
  handler,
  retry,
  queueName,
  _activeContext
}: {
  ch: Channel,
  handler: RegisterHandler<Buffer, Buffer>,
  retry: number,
  queueName: string,
  _activeContext: RegisterActiveContext
}) {
  return ch.consume(
    queueName,
    (msg: Message) => {
      function onError(err?: Error) {
        const currentRetry = msg.properties.headers.retry || 0;
        if (currentRetry < retry) {
          return ch.sendToQueue(
            queueName,
            msg.content,
            {...msg.properties, headers: {...msg.properties.headers, retry: currentRetry + 1}}
          );
        } else if (msg.properties.correlationId) {
          return ch.publish(
            '',
            msg.properties.replyTo,
            Buffer.from(JSON.stringify({error: (err && err.message) || 'Unexpected error'})),
            {correlationId: msg.properties.correlationId, headers: {code: 1}}
          );
        }
      }
      try {
        return handler({payload: msg.content, context: _activeContext})
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
  );
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
    retry = 0
  }: RegisterInput<Buffer, Buffer>): Promise<RegisterActiveContext> {
    const __namespace = arguments[0].namespace || namespace;
    const queueName = `${__namespace}-${pattern}`;

    // _pause and _reg are equired to keep the pause function working without any object binding. Library users can thanks to this compose on top of pause without having to worry about the context of the function.
    let _pause: () => Promise<RegisterPausedContext> = () => Promise.reject(new Error('Not yet initialized')) as any;
    let _paused: false | Promise<RegisterPausedContext> = false;

    const _activeContext: RegisterActiveContext = {
      pause: () => {
        if (!_paused) {
          _paused = _pause();
        }
        return _paused;
      }
    };
    Object.freeze(_activeContext);

    const _pausedContext: RegisterPausedContext = {
      resume: () => {
        return _resume({ch, handler, retry, queueName, _activeContext})
          .then(createContext)
          .then((res) => {
            _pause = res.pause;
            _paused = false;
            return _activeContext;
          }) as any;
      }
    };
    Object.freeze(_pausedContext);

    const createContext = (r: any) => ({
      async pause(time?: number): Promise<RegisterPausedContext> {
        await ch.cancel(r.consumerTag);
        return _pausedContext;
      }
    });

    return await all([
      ch.assertQueue(queueName),
      ch.prefetch(10),
      ch.bindQueue(queueName, exchange, pattern),
      _resume({ch, handler, retry, queueName, _activeContext})
    ])
    .then(([q, p, b, r]) => r)
    .then(createContext)
    .then((res) => {
      _pause = res.pause;
      return _activeContext;
    });
  };
}
