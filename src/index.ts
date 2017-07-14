import {connect, Channel} from 'amqplib';
import {SetupSubsOpts, SubsOpts, setupSubscribe} from './subscribe';
import {SetupEmitOpts, EmitOpts, setupEmit} from './emit';
import {v4} from 'uuid';
import {SerializationOpts} from './serialization';
import serialization from './serialization';

export interface LibOpts<S> {
  url: string;
  exchange: string;
  subscriptions?: {[k: string]: SubsOpts<any, any>};
  _serialization?: SerializationOpts<S>;
  _setupEmit?: typeof setupEmit;
  _setupSubscribe?: typeof setupSubscribe;
  _connect?: typeof connect;
  _restartConnection?: typeof restartConnection;
  _log?: typeof console;
}

export function restartConnection<S>({
  opts,
  timeout = 100,
  attempt = 0,
  _setup = setup,
  _setTimeout = setTimeout
}: {
  opts: LibOpts<S>,
  timeout?: number,
  attempt?: number,
  _setup?: typeof setup,
  _setTimeout?: typeof setTimeout
}) {
  return new Promise((resolve, reject) => {
    const _log = opts._log || console;
    const _restartConnection = opts._restartConnection || restartConnection;

    _log.info(`Retrying connection in ${attempt * timeout}ms`);
    _setTimeout(
      () => {
        resolve(_setup(opts).catch((innerErr: Error) => {
          return _restartConnection({opts, timeout, _setup, attempt: attempt <= 100 ? attempt + 10 : attempt});
        }));
      },
      attempt * timeout
    );
  });
}

export default async function setup<S, M extends S, R extends S>({
  url,
  exchange,
  subscriptions = {},
  _serialization = serialization,
  _setupEmit = setupEmit,
  _setupSubscribe = setupSubscribe,
  _connect = connect,
  _restartConnection = restartConnection,
  _log = console
}: LibOpts<S>) {

  const common_options = {durable: true, noAck: true};
  const conn = await _connect(url, common_options);

  const channel = await conn.createChannel();

  const options = Object.assign({}, {ch: channel}, arguments[0]);
  const operations = await Promise.all([
    _setupEmit<S, M, R>(options as SetupEmitOpts<S>),
    _setupSubscribe<S, M, R>(options as SetupSubsOpts<S>)
  ]);

  let errored = false;

  function onError(error: Error) {
    errored = true;
    _log.warn(`Connection errored...`);

    _restartConnection({opts: {
      url, exchange,
      subscriptions,
      _serialization, _setupEmit,
      _setupSubscribe, _connect,
      _restartConnection, _log
    }}).then((result: any) => {
      operations[0] = result.emit;
      operations[1] = result.subscribe;
      errored = false;
      _log.info('Connection recovered');
    })
    .catch((err) => {
      _log.error(err);
      /* This promise should never reject */
    });
  }

  conn.on('close', onError);

  // If the connection failed there may be subscriptions from previous connection, so add them again.
  await Promise.all(Object.keys(subscriptions).map(k => {
    const subscription = subscriptions[k];
    return operations[1](subscription);
  }));

  return {
    async subscribe(opts: SubsOpts<M, R>): Promise<void> {
      const id = `${opts.pattern}-${opts.namespace || ''}`;
      if (!subscriptions[id]) {
        subscriptions[id] = opts;
      }
      if (errored) {
        return Promise.resolve();
      } else {
        return operations[1](opts);
      }
    },
    async emit(opts: EmitOpts<M>): Promise<R> {
      if (errored) {
        return Promise.reject(new Error('Broken pipe'));
      } else {
        return operations[0](opts);
      }
    }
  };
}
