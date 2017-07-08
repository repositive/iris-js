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
}

function restartConnection<S>({
  opts,
  timeout = 100,
  attempt = 0,
  _setup = setup
}: {
  opts: LibOpts<S>,
  timeout?: number,
  attempt?: number,
  _setup?: typeof setup
}) {
  return new Promise((resolve, reject) => {
    console.log(`Retrying connection in ${attempt * timeout}ms`);
    setTimeout(
      () => {
        resolve(_setup(opts).catch((innerErr: Error) => {
          return restartConnection({opts, timeout, _setup, attempt: attempt <= 100 ? attempt + 10 : attempt});
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
  _connect = connect
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
    console.warn(`Connection errored...`);

    restartConnection({opts: {
      url, exchange,
      additions,
      _serialization, _setupAct,
      _setupAdd, _connect
    }}).then((result: any) => {
      operations[0] = result.act;
      operations[1] = result.add;
      errored = false;
      console.log('Connection recovered');
    });
  }

  conn.on('close', onError);

  await Promise.all(Object.keys(additions).map(k => {
    const addition = additions[k];
    return operations[1](addition);
  }));

  return {
    async add(opts: AddOpts<M, R>): Promise<void> {
      if (!additions[opts.pattern]) {
        additions[opts.pattern] = opts;
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
