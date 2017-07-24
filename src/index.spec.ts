import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import { toPromise } from '.';
import irisSetup from '.';

test('toPromise', (t: Test) => {
  const f = (n: number) => 1 + n;
  const fp = toPromise(f);
  t.equals(typeof fp, 'function', 'It returns a function');
  const result = fp(1);
  console.log(result);
  t.ok(result instanceof Promise, 'When called returns a promise');
  result
    .then(r => {
      t.equals(f(1), r, 'The promise resolves in the expected return from the function promisified');
      t.end();
    })
    .catch(console.error);
});

test('Do not break the interface', (t: Test) => {
  const backend = {
    request: stub().returns(Promise.resolve(Buffer.from('2'))),
    register: stub().returns(Promise.resolve())
  };
  const _IrisAMQP = stub().returns(Promise.resolve(backend));

  async function _test() {
    const irisP = irisSetup({_IrisAMQP});

    t.ok(irisP instanceof Promise, 'The setup returns a Promise');

    const {request, register} = await irisP;

    const response = await request({pattern: ''});

    t.equals(response, 2, 'The response is parsed with JSON.parse');

    const bReqCall = backend.request.getCall(0);

    t.deepEquals(bReqCall.args[0], {pattern: '', payload: Buffer.alloc(0)}, 'Serializer preceeds the call to real backend');

    const handlerStub = stub().returns(Promise.resolve(1));
    await register({pattern: '', handler: handlerStub});

    const bRegCall = backend.register.getCall(0);

    const composedHandler = bRegCall.args[0].handler;

    const randomR = Math.random();
    const handR = await composedHandler({payload: Buffer.from(`${randomR}`)});

    t.deepEqual(handR, Buffer.from('1'), 'The response from the handler is serialized to a Buffer');
    const handCall = handlerStub.getCall(0);

    t.equals(handCall.args[0].payload, randomR, 'Handler is called with the parsed payload');

  }
  _test().then(() => t.end()).catch(console.error);
});
