import {connect} from 'amqplib';
import {LibOptions} from './types';
import setupAdd from './add';
import {ActOptions} from './act';
import setupAct from './act';

export * from './add';
export * from './act';
export * from './types';

async function createChannel(options: LibOptions) {
  const common_options = {durable: true, noAck: true};
  const connection = await connect(options.url, common_options);
  return connection.createChannel();
}

export default async function setup(options: LibOptions) {
  const channel = await createChannel(options);
  const act = await setupAct(channel, options);
  const add = await setupAdd(channel, options);

  return {act, add};
}
