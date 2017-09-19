
import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import {Channel} from 'amqplib';
import { setupEmit } from './emit';
import { RPCError } from '../errors';

function mockChannel(): any {
  return {
    sendToQueue: spy(),
    publish: stub().returns(true),
    once: spy()
  };
}

function wait(time: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
}

test('Test emit', (t: Test) => {

  const ch = mockChannel();
  const exchange = '';

  async function test() {
    const pSetupEmit = setupEmit({ch, exchange});
    t.ok(pSetupEmit instanceof Promise, 'Setup returns a promise');

    const emit = await pSetupEmit;

    const pattern = '';
    const payload = Buffer.from('');

    const pResult1 = emit({pattern, payload});

    t.ok(pResult1 instanceof Promise, 'Act returns a promise');

    await pResult1
      .then(() => {
        t.ok(ch.publish.calledOnce, 'Calls publish');
        t.deepEqual(ch.publish.getCall(0).args[2], payload, 'Publishes the payload');
        t.ok(true, 'Returns a void promise always');
      })
      .catch( (err) => {
        t.notOk(true, 'It should never blow up if the publish to rabbitmq succeeds');
      });

    ch.publish.returns(false);

    let resolved = false;
    emit({pattern, payload}).then(() => {
      resolved = true;
    });

    await wait(10);

    t.notOk(resolved, 'The promise does not resolve until the drain event is emmited from the channel.');

    // Emit the drain event artificially
    ch.once.getCall(0).args[1]();

    await wait(10);

    t.ok(resolved, 'The promise was resolved once the drain event is emmited');
  }

  test()
    .then(() => t.end())
    .catch(console.error);
});

