import * as test from 'tape';
import {Test} from 'tape';
import * as proxy from 'proxyquire';
import { stub, spy } from 'sinon';

function getAmqplibMock() {
  return {
    connect: stub().returns(Promise.resolve({
      createChannel: stub().returns(spy())
    }))
  };
}

const setupAct = (spy: any) => ({default: stub().returns(Promise.resolve(spy))});
const setupAdd = (spy: any) => ({default: stub().returns(Promise.resolve(spy))});

test('This passes', (t: Test) => {
  t.assert(true, 'Simple assertion');
  t.end();
});

test('Tests setupp funcion' , (t: Test) => {

  const amqplib = getAmqplibMock();
  const add = spy();
  const addModule = setupAdd(add);
  const act = spy();
  const actModule = setupAct(act);
  const indexModule = proxy('../main/index', {
    'amqplib': amqplib,
    './add': addModule,
    './act': actModule
  });


  indexModule.default({url: 'urls', exchange: 'ex'})
    .then((result: any) => {
      t.ok(addModule.default.calledOnce, 'Sets up add function');
      t.equal(result.add, add, 'Returns an initialized add function');
      t.equal(result.act, act, 'Returns an initialized act function');
      t.end();
    });
});

