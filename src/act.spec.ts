import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import { setupAdd } from './add';
import {Channel} from 'amqplib';
import { setupAct } from './act';

function mockChannel(): any {
  return {
    assertQueue: stub().returns({queue: 'test'}),
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

function wait(time: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
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
        t.ok(ch.deleteQueue.calledOnce, 'Deletes queue on timeout');
        t.equals(err && err.message, 'Timeout', 'Throws timeout if there is no response');
      });

    ch.publish.reset();
    ch.deleteQueue.reset();
    ch.consume.reset();
    const pResult2 = act({pattern, payload});

    await wait(0);
    const pCall = ch.publish.getCall(0);
    t.deepEquals(ch.publish.calledOnce && pCall.args[2], Buffer.from(JSON.stringify(payload)), 'Publishes the payload');
    const cCall = ch.consume.getCall(0);
    t.equals(ch.consume.calledOnce && ch.consume.getCall(0).args[0], 'test', 'Consumes the queue');

    const r = Math.random();
    ch.consume.getCall(0).args[1]({content: Buffer.from(JSON.stringify({r})), properties: pCall.args[3]});

    await pResult2
      .then((result) => {
        t.deepEquals({r}, result, 'On success get the expected result');
        t.ok(ch.deleteQueue.calledOnce, 'Deletes the queue on message received');
        t.ok(ch.ack.calledOnce, 'Acknowledges the message reception');
      })
      .catch((err) => {
        t.notOk(true, 'On success it should not reject');
      });
  }

  test()
    .then(() => t.end())
    .catch(console.error);
});
