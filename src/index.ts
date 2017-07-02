import {connect as _connect, Channel} from 'amqplib';
import {SetupAddOpts, setupAdd} from './add';
import {SetupActOpts, ActOpts, setupAct} from './act';
import {v4} from 'uuid';

export async function createChannel({
  url,
  connect = _connect
}: {
  url: string,
  connect?: typeof _connect
}) {
  const common_options = {durable: true, noAck: true};
  const connection = await connect(url, common_options);
  return connection.createChannel();
}

export interface SerializationOpts<T> {
  serialize: (o: T) => Buffer;
  parse: (b: Buffer) => T;
}

// TODO This should be SerializationOptions of type <JSON> check how to do this.
const defaultSerializationOpts: SerializationOpts<any> = {
  serialize(o: any) {
    return Buffer.from(JSON.stringify(o));
  },
  parse(b: Buffer) {
    return JSON.parse(b.toString());
  }
};

export interface LibOpts<S> {
  url: string;
  exchange: string;
  queue?: string;
  serialization?: SerializationOpts<S>;
  _setupAct?: typeof setupAct;
  _setupAdd?: typeof setupAdd;
  _createChannel?: typeof createChannel;
}

const defaultOptions = {
  serialization: defaultSerializationOpts
};

export default async function setup<T>({
  url,
  exchange,
  queue = v4(),
  serialization = defaultSerializationOpts,
  _setupAct = setupAct,
  _setupAdd = setupAdd,
  _createChannel = createChannel
}: LibOpts<T>) {
  const channel = await _createChannel({url});
  const options = Object.assign({ch: channel}, defaultOptions, arguments[0]);
  const act = await _setupAct(options as SetupActOpts<T>);
  const add = await _setupAdd(options as SetupAddOpts<T>);

  return {act, add};
}
