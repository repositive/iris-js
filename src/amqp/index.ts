import {connect, Channel} from 'amqplib';
import {SetupRegisterOpts, setupRegister} from './register';
import {SetupRequestOpts, setupRequest} from './request';
import {SetupEmitOpts, setupEmit} from './emit';
import {RPCError} from '../errors';
import {IrisBackend, RegisterActiveContext, RegisterInput, RequestInput, CollectInput, EmitInput} from '..';

import {v4} from 'uuid';

export interface LibOpts {
  uri?: string;
  exchange?: string;
  registrations?: {[k: string]: RegisterInput<Buffer, Buffer>};
  namespace?: string;
  _setupRequest?: typeof setupRequest;
  _setupRegister?: typeof setupRegister;
  _setupEmit?: typeof setupEmit;
  _connect?: typeof connect;
  _restartConnection?: typeof restartConnection;
  _log?: typeof console;
}

export function restartConnection({
  opts,
  timeout = 100,
  attempt = 0,
  _setup = setup,
  _setTimeout = setTimeout
}: {
  opts: LibOpts,
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
  _setupRequest: setupRequest,
  _setupRegister: setupRegister,
  _setupEmit: setupEmit,
  _connect: connect,
  _restartConnection: restartConnection,
  _log: console
};

export default async function setup(opts: LibOpts = defaults): Promise<IrisBackend> {
  const _opts = {...defaults, ...opts};
  const {
    uri, exchange,
    registrations,
    _setupRequest,
    _setupRegister,
    _setupEmit, _connect,
    _restartConnection, _log
  } = _opts;

  const common_options = {durable: true, noAck: true};
  const conn = await _connect(uri, common_options);

  const channel = await conn.createChannel();

  channel.setMaxListeners(Infinity);

  const options = {ch: channel, ..._opts};

  const setupReqP = _setupRequest(options as SetupRequestOpts);
  const operations = await Promise.all([
    setupReqP.then(req => req.request),
    _setupRegister(options as SetupRegisterOpts),
    _setupEmit(options as SetupEmitOpts),
    setupReqP.then(req => req.collect)
  ]);

  let errored = false;

  function onError(error: Error) {
    if (!errored) {
      errored = true;
      _log.warn(`Connection errored...`);

      _restartConnection({opts: _opts}).then(({register, request, emit, collect}) => {
        operations[0] = request;
        operations[1] = register;
        operations[2] = emit;
        operations[3] = collect;
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
    async register(ropts: RegisterInput<Buffer, Buffer>): Promise<RegisterActiveContext> {
      const id = `${ropts.pattern}-${ropts.namespace || ''}`;
      if (!registrations[id]) {
        registrations[id] = ropts;
      }
      if (errored) {
        return Promise.reject(new Error('Broken Pipe'));
      } else {
        return operations[1](ropts);
      }
    },
    async request(ropts: RequestInput<Buffer>): Promise<Buffer | void> {
      if (errored) {
        return Promise.reject(new Error('Broken pipe'));
      } else {
        return operations[0](ropts) as Promise<Buffer | void>;
      }
    },
    async emit(eopts: EmitInput<Buffer>): Promise<void> {
      if (errored) {
        return Promise.reject(new Error('Broken pipe'));
      } else {
        return operations[2](eopts) as Promise<void>;
      }
    },
    async collect(eopts: RequestInput<Buffer>): Promise<(Buffer | RPCError)[]> {
      if (errored) {
        return Promise.reject(new Error('Broken pipe'));
      } else {
        return operations[3](eopts) as Promise<(Buffer | RPCError)[]>;
      }
    }
  };
}
