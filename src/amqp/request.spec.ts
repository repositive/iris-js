import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import {Channel} from 'amqplib';
import { setupRequest } from './request';
import { RPCError } from '../errors';

function mockChannel(): any {
  return {
    assertQueue: stub().returns({queue: 'test'}),
    consume: spy(),
    sendToQueue: spy(),
    publish: spy()
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

test('Test request', (t: Test) => {

  const ch = mockChannel();
  const exchange = '';

  async function test() {
    const pSetupRequest = setupRequest({ch, exchange});
    t.ok(pSetupRequest instanceof Promise, 'Setup returns a promise');

    const requests = await pSetupRequest;

    const pattern = '';
    const payload = Buffer.from('');

    const pResult1 = requests.request({pattern, payload});

    t.ok(pResult1 instanceof Promise, 'Act returns a promise');

    await pResult1
      .then(() => {
        t.notOk(true, 'Should not return if there was no response');
      })
      .catch(err => {
        t.equals(err && err.message, 'Timeout', 'Throws timeout if there is no response');
      });

    ch.publish.reset();
    const pResult2 = requests.request({pattern, payload});

    await wait(0);
    const pCall = ch.publish.getCall(0);
    t.deepEquals(ch.publish.calledOnce && pCall.args[2], payload, 'Publishes the payload');
    const cCall = ch.consume.getCall(0);

    const r = Math.random();
    const content = Buffer.from(JSON.stringify({r}));
    const properties = pCall.args[3];
    properties.headers = {code: 0};
    ch.consume.getCall(0).args[1]({content, properties});

    await pResult2
      .then((result) => {
        t.deepEquals(Buffer.from(JSON.stringify({r})), result, 'On success get the expected result');
      })
      .catch((err) => {
        t.notOk(true, 'On success it should not reject');
      });

    ch.publish.reset();

    const pResult3 = requests.request({pattern, payload});

    await wait(0);

    const errContent = Buffer.from(JSON.stringify({r}));
    const pCall3 = ch.publish.getCall(0);
    const prop3 = pCall3.args[3];
    prop3.headers = {code: 1};
    ch.consume.getCall(0).args[1]({content: errContent, properties: prop3});

    await pResult3
      .then((result) => {
        t.notOk(true, 'On error can not execute then');
      })
      .catch((err) => {
        t.ok(err instanceof RPCError, 'The error is an instance of RPCError');
        t.deepEquals(err.message, JSON.stringify({r}), 'On error get the expected error message');
      });
  }

  test()
    .then(() => t.end())
    .catch(console.error);
});

test('Test collect', (t: Test) => {

  const ch = mockChannel();
  const exchange = '';

  async function test() {
    const pSetupRequest = setupRequest({ch, exchange});

    const requests = await pSetupRequest;

    const pattern = '';
    const payload = Buffer.from('');

    const pResult1 = requests.collect({pattern, payload});

    t.ok(pResult1 instanceof Promise, 'Collect returns a promise');

    await pResult1
      .then((res) => {
        t.deepEqual(res, [], 'If there is no response collect returns and empty array');
      })
      .catch(err => {
        t.notOk(true, 'Collect nevel fails');
      });

    ch.publish.reset();
    const pResult2 = requests.collect({pattern, payload});

    await wait(0);
    const pCall = ch.publish.getCall(0);
    t.deepEquals(ch.publish.calledOnce && pCall.args[2], payload, 'Publishes the payload');
    const cCall = ch.consume.getCall(0);

    const r = Math.random();
    const content = Buffer.from(JSON.stringify({r}));
    const properties = pCall.args[3];
    properties.headers = {code: 0};
    ch.consume.getCall(0).args[1]({content, properties});

    await pResult2
      .then((result) => {
        t.deepEquals([Buffer.from(JSON.stringify({r}))], result, 'On success get the expected result');
      })
      .catch((err) => {
        t.notOk(true, 'On success it should not reject');
      });

    ch.publish.reset();

    const pResult3 = requests.collect({pattern, payload});

    await wait(0);

    const errContent = Buffer.from(JSON.stringify({r}));
    const pCall3 = ch.publish.getCall(0);
    const prop3 = pCall3.args[3];
    prop3.headers = {code: 1};
    ch.consume.getCall(0).args[1]({content: errContent, properties: prop3});

    await pResult3
      .then((result) => {
        t.ok(result, 'If it contacts the server it returns the array always');
        if (Array.isArray(result)) {
          const [err] = result;
          t.ok(err instanceof RPCError, 'The error is an instance of RPCError');
          if (err instanceof RPCError) {
            t.deepEquals(err.message, JSON.stringify({r}), 'On error get the expected error message');
          }
        }
      })
      .catch((err) => {
        t.notOk(true, 'On error collect does not fail, just wraps the error in the array');
      });
  }

  test()
    .then(() => t.end())
    .catch(console.error);
});
