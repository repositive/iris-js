import {connect, Channel} from 'amqplib';
import {SetupAddOpts, AddOpts, setupAdd} from './add';
import {SetupActOpts, ActOpts, setupAct} from './act';
import {v4} from 'uuid';
import {SerializationOpts} from './serialization';
import serialization from './serialization';

export interface LibOpts<S> {
  url: string;
  exchange: string;
  additions?: {[k: string]: AddOpts<any, any>};
  _serialization?: SerializationOpts<S>;
  _setupAct?: typeof setupAct;
  _setupAdd?: typeof setupAdd;
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
  additions = {},
  _serialization = serialization,
  _setupAct = setupAct,
  _setupAdd = setupAdd,
  _connect = connect,
  _restartConnection = restartConnection,
  _log = console
}: LibOpts<S>) {

  const common_options = {durable: true, noAck: true};
  const conn = await _connect(url, common_options);

  const channel = await conn.createChannel();

  const options = Object.assign({}, {ch: channel}, arguments[0]);
  const operations = await Promise.all([
    _setupAct<S, M, R>(options as SetupActOpts<S>),
    _setupAdd<S, M, R>(options as SetupAddOpts<S>)
  ]);

  let errored = false;

  function onError(error: Error) {
    errored = true;
    _log.warn(`Connection errored...`);

    _restartConnection({opts: {
      url, exchange,
      additions,
      _serialization, _setupAct,
      _setupAdd, _connect,
      _restartConnection, _log
    }}).then((result: any) => {
      operations[0] = result.act;
      operations[1] = result.add;
      errored = false;
      _log.info('Connection recovered');
    })
    .catch((err) => {
      _log.error(err);
      /* This promise should never reject */
    });
  }

  conn.on('close', onError);

  // If the connection failed there may be additions from previous connection, so add them again.
  await Promise.all(Object.keys(additions).map(k => {
    const addition = additions[k];
    return operations[1](addition);
  }));

  return {
    async add(opts: AddOpts<M, R>): Promise<void> {
      const id = `${opts.pattern}-${opts.namespace || ''}`;
      if (!additions[id]) {
        additions[id] = opts;
      }
      if (errored) {
        return Promise.resolve();
      } else {
        return operations[1](opts);
      }
    },
    async act(opts: ActOpts<M>): Promise<R> {
      if (errored) {
        return Promise.reject(new Error('Broken pipe'));
      } else {
        return operations[0](opts);
      }
    }
  };
}
