import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import { setupAdd } from './add';
import {Channel} from 'amqplib';
import { setupAct } from './act';

function mockChannel(): any {
  return {
    assertQueue: stub().returns({queue: ''}),
    consume: spy(),
    sendToQueue: spy(),
    ack: spy(),
    publish: spy(),
    deleteQueue: stub().returns(Promise.resolve())
  };
}

function mockSerialization() {
  return {
    parse: stub().returns({}),
    serialize: stub().returns(Buffer.from('{}'))
  };
}

test('Test act', (t: Test) => {

  const ch = mockChannel();
  const _serialization = mockSerialization();
  const exchange = '';

  async function test() {
    const pSetupAct = setupAct({ch, _serialization, exchange});
    t.ok(pSetupAct instanceof Promise, 'Setup returns a promise');

    const act = await pSetupAct;

    const pattern = '';
    const payload = {};

    const pResult1 = act({pattern, payload});

    t.ok(pResult1 instanceof Promise, 'Act returns a promise');

    await pResult1
      .then(() => {
        t.notOk(true, 'Should not return if there was no response');
      })
      .catch(err => {
        t.equals(err && err.message, 'Timeout', 'Throws timeout if there is no response');
      });

  }

  test()
    .then(() => t.end())
    .catch(console.error);
});
