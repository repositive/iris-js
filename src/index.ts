import {connect, Channel} from 'amqplib';
import {SetupRegisterOpts, RegisterOpts, setupRegister} from './register';
import {SetupRequestOpts, RequestOpts, setupRequest} from './request';
import {v4} from 'uuid';
import {SerializationOpts} from './serialization';
import serialization from './serialization';

export interface LibOpts<S> {
  uri?: string;
  exchange?: string;
  registrations?: {[k: string]: RegisterOpts<any, any>};
  namespace?: string;
  _serialization?: SerializationOpts<S>;
  _setupRequest?: typeof setupRequest;
  _setupRegister?: typeof setupRegister;
  _connect?: typeof connect;
  _restartConnection?: typeof restartConnection;
  _log?: typeof console;
}

export function restartConnection<S extends any>({
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

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  namespace: 'default',
  registrations: {},
  _serialization: serialization,
  _setupRequest: setupRequest,
  _setupRegister: setupRegister,
  _connect: connect,
  _restartConnection: restartConnection,
  _log: console
};

export default async function setup<S>(opts: LibOpts<S> = defaults) {
  const _opts = {...defaults, ...opts};
  const {
    uri, exchange,
    registrations,
    _serialization, _setupRequest,
    _setupRegister, _connect,
    _restartConnection, _log
  } = _opts;

  const common_options = {durable: true, noAck: true};
  const conn = await _connect(uri, common_options);

  const channel = await conn.createChannel();

  const options = {ch: channel, ..._opts};
  const operations = await Promise.all([
    _setupRequest<S>(options as SetupRequestOpts<S>),
    _setupRegister<S>(options as SetupRegisterOpts<S>)
  ]);

  let errored = false;

  function onError(error: Error) {
    if (!errored) {
      errored = true;
      _log.warn(`Connection errored...`);

      _restartConnection({opts: _opts}).then(({register, request}) => {
        operations[0] = request;
        operations[1] = register;
        errored = false;
        _log.info('Connection recovered');
      })
      .catch((err) => {
        _log.error(err);
        /* This promise should never reject */
      });
    }
  }

  conn.on('error', onError);
  conn.on('close', onError);

  // If the connection failed there may be subscriptions from previous connection, so add them again.
  await Promise.all(Object.keys(registrations).map(k => {
    const registration = registrations[k];
    return operations[1](registration);
  }));

  return {
    async register<P extends S, R extends S>(ropts: RegisterOpts<P, R>): Promise<void> {
      const id = `${ropts.pattern}-${ropts.namespace || ''}`;
      if (!registrations[id]) {
        registrations[id] = ropts;
      }
      if (errored) {
        return Promise.resolve();
      } else {
        return operations[1](ropts);
      }
    },
    async request<P extends S, R extends S>(ropts: RequestOpts<P>): Promise<R> {
      if (errored) {
        return Promise.reject(new Error('Broken pipe'));
      } else {
        return operations[0](ropts) as Promise<R>;
      }
    }
  };
}
