import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import { setupRegister } from './register';
import {Channel} from 'amqplib';

const consumeResponse = Promise.resolve({consumerTag: 'testis'});

function mockChannel(): any {
  return {
    publish: spy(),
    cancel: spy(),
    sendToQueue: spy(),
    assertExchange: spy(),
    assertQueue: spy(),
    prefetch: spy(),
    bindQueue: spy(),
    consume: stub().returns(consumeResponse),
    ack: spy()
  };
}

function mockSerialization() {
  return {
    parse: stub().returns({}),
    serialize: stub().returns(Buffer.from('{}'))
  };
}

function fakeMessage() {
  return {
    content: Buffer.from('{}'),
    properties: {
      replyTo: 'any-queue',
      correlationId: 'unique',
      headers: {code: 0}
    }
  };
}

const libOptions = {
  url: 'amqp://rabbit',
  exchange: 'rpc_exchange',
  queue: 'test'
};

function wait(time: number): Promise<undefined> {
  return new Promise<undefined>((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
}

test('Everything goes well in register function', (t: Test) => {

  const ch = mockChannel();

  const expectedResponse = Buffer.from('{}');
  const handler = stub().returns(Promise.resolve(expectedResponse));

  async function test() {
    const args = { ...libOptions, ch };
    const register = await setupRegister(args);

    t.equals(typeof register, 'function', 'setupAdd returns the register function');

    t.ok(ch.assertExchange.calledOnce, 'A new exchange is created if none exists');

    const exCall = ch.assertExchange.getCall(0);
    t.equals(exCall.args[0], libOptions.exchange, 'The exchange used is the one provided in the lib options');
    t.equals(exCall.args[1], 'topic', 'The exchange provided is of type "topic"');

    const pattern = 'simple.test.works';
    await register({pattern, handler});

    t.ok(ch.assertQueue.calledOnce, 'A new queue is created for the functionality');
    t.ok(ch.assertQueue.getCall(0).args[0].indexOf(pattern) > -1, 'The queue name contains the name of the pattern');

    t.ok(ch.bindQueue.calledOnce, 'The queue is binded to the exchange');
    const bindCall = ch.bindQueue.getCall(0);
    t.ok(bindCall.args[0].indexOf(pattern) > -1, 'The queue binded is the created for this functionality');
    t.equals(bindCall.args[1], libOptions.exchange, 'It binds the queue to the configured exchange');

    t.ok(ch.consume.calledOnce, 'It starts consuming the queue');
    const consumeCall = ch.consume.getCall(0);
    t.ok(consumeCall.args[0].indexOf(pattern) > -1, 'The queue consumed is the specific of this service');

    const consumer = consumeCall.args[1];

    const message = fakeMessage();
    await consumer(message);

    t.ok(handler.calledOnce, 'The implemented function is called on message');
    t.deepEquals(handler.getCall(0).args[0].payload, message.content, 'The implementation is called with the message content');

    t.ok(ch.publish.calledOnce, 'The library pipes the response to request service');
    const sendCall = ch.publish.getCall(0);
    t.equals(sendCall.args[1], message.properties.replyTo, 'It replies to the requested queue');
    t.deepEquals(sendCall.args[2], expectedResponse, 'It puts to the queue the response from the implementation');
    t.equals(sendCall.args[3].correlationId, message.properties.correlationId, 'It adds the correlation id received from the message');

    t.ok(ch.ack.calledOnce, 'ACK is being called');
    t.equals(ch.ack.getCall(0).args[0], message, 'ACK is being called with the original message');

    ch.consume.reset();

    await register({pattern, handler, retry: 1});

  }

  test().then(() => t.end());
});

test('Register retries', (t: Test) => {
  const ch = mockChannel();
  const handler = stub().returns(Promise.reject(new Error('I want to blow up')));

  async function _test() {
    const args = { ...libOptions, ch };
    const register = await setupRegister(args);

    const pattern = 'retry.test.works';
    await register({pattern, handler, retry: 1});
    const consumeCall = ch.consume.getCall(0);

    const message = fakeMessage();

    const consumer = consumeCall.args[1];

    await consumer(message);

    t.ok(ch.sendToQueue.calledOnce, 'On error with retries call sendToQueue');

    t.deepEqual(ch.sendToQueue.getCall(0).args, [`default-${pattern}`, message.content, {...message.properties, headers: {...message.properties.headers, retry: 1}}], 'SendToQueue is called with the correct retry header');
  }

  _test().then(t.end).catch(console.error);
});

test('Not everything goes well in register function', (t: Test) => {
  const ch = mockChannel();
  const expectedResponse = Buffer.from('{}');
  const errorResponse = Buffer.from('{"error":"Unexpected error"}');
  async function test() {
    const pattern = 'simple.test.fails';
    const register = await setupRegister({...libOptions, ch });
    const handler = () => {
      throw new Error();
    };

    await register({pattern, handler});

    const consumer = ch.consume.getCall(0).args[1];

    const message = fakeMessage();
    await consumer(message);
    t.ok(ch.ack.calledOnce, 'ACK is being called');
    t.equals(ch.ack.getCall(0).args[0], message ,
      'ACK is being called with the original message.');

    t.ok(ch.publish.calledOnce, 'Sends error reply');

    t.equals(ch.publish.getCall(0).args[1], message.properties.replyTo ,
      '2nd message goes back to the sender');
    t.deepEquals(ch.publish.getCall(0).args[2].toString(), errorResponse.toString(),
      '2nd message is an error message.');
  }
  test()
    .then(() => t.end())
    .catch(console.error);
});

test('Pause register', (t: Test) => {
  const ch = mockChannel();
  const expectedResponse = Buffer.alloc(0);
  async function _test() {

    const pattern = 'pause.register.test';
    const register = await setupRegister({...libOptions, ch});

    const handler = stub().returns(Promise.resolve());

    const regContext = await register({pattern, handler});

    t.equals(typeof regContext.pause, 'function', 'Register exposes the context object with pause');

    const consumer = ch.consume.getCall(0).args[1];

    const message = fakeMessage();
    await consumer(message);

    const handleArgs = handler.getCall(0).args[0];

    t.deepEqual(handleArgs.context.pause, regContext.pause, 'Both handler and regContext share the same function');

    const paused = await regContext.pause();

    t.ok(ch.cancel.calledOnce, 'Calls cancel on the channel');
    t.equals(ch.cancel.getCall(0).args[0], 'testis', 'Calls cancel with the correct consumer id');

    ch.consume.reset();
    ch.consume.returns(consumeResponse);
    await paused.resume();

    t.ok(ch.consume.calledOnce, 'On resume call consume on channel');
  }

  _test()
    .then(() => t.end())
    .catch(console.error);
});

test('Not everything goes well in add function Custom', (t: Test) => {
  const ch = mockChannel();
  const expectedResponse = Buffer.from('{}');
  const customErrorResponse = Buffer.from('{"error":"Custom"}');
  async function test() {
    const pattern = 'simple.test.fails';
    const register = await setupRegister({ ...libOptions, ch});
    const handler = () => Promise.reject(new Error('Custom'));
    await register({pattern, handler});

    const consumer = ch.consume.getCall(0).args[1];
    const message = fakeMessage();
    await consumer(message);

    // Error with Custom message
    t.deepEquals(ch.publish.getCall(0).args[2].toString(), customErrorResponse.toString(),
      'Custom message has a custom content.');
  }
  test().then(() => t.end());
});
