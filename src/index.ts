import {connect, Channel} from 'amqplib';
import {SetupAddOpts, setupAdd} from './add';
import {SetupActOpts, ActOpts, setupAct} from './act';
import {v4} from 'uuid';
import {SerializationOpts} from './serialization';
import serialization from './serialization';

export async function createChannel({
  url,
  _connect = connect
}: {
  url: string,
  _connect?: typeof connect
}) {
  const common_options = {durable: true, noAck: true};
  const connection = await _connect(url, common_options);
  return connection.createChannel();
}

export interface LibOpts<S> {
  url: string;
  exchange: string;
  queue?: string;
  _serialization?: SerializationOpts<S>;
  _setupAct?: typeof setupAct;
  _setupAdd?: typeof setupAdd;
  _createChannel?: typeof createChannel;
}

export default async function setup<T>({
  url,
  exchange,
  queue = v4(),
  _serialization = serialization,
  _setupAct = setupAct,
  _setupAdd = setupAdd,
  _createChannel = createChannel
}: LibOpts<T>) {
  const channel = await _createChannel({url});
  const options = Object.assign({ch: channel}, arguments[0]);
  const act = await _setupAct(options as SetupActOpts<T>);
  const add = await _setupAdd(options as SetupAddOpts<T>);

  return {act, add};
}
