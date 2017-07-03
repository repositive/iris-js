import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import iris from './index';
import { createChannel } from './index';

const setupAct: any = (spy: any) => stub().returns(Promise.resolve(spy));
const setupAdd: any = (spy: any) => stub().returns(Promise.resolve(spy));

test('This passes', (t: Test) => {
  t.assert(true, 'Simple assertion');
  t.end();
});

test('Create channel function handles connection to RMQ', (t: Test) => {
  const url = 'amqp://test';
  const expectedResponse = Symbol();
  const chCreate = stub().returns(expectedResponse);
  const _connect = stub().returns(Promise.resolve({createChannel: chCreate}));
  createChannel({url, _connect}).then(r => {
    t.equals(r, expectedResponse, 'Create channel returns a channel Rmq');
    t.end();
  })
  .catch(console.error);
});

test('Tests setup funcion' , (t: Test) => {

  const add = spy();
  const act = spy();
  const _createChannel = spy();

  iris({url: 'urls', exchange: 'ex', _setupAct: setupAct(act), _setupAdd: setupAdd(add), _createChannel})
    .then((result: any) => {
      t.equal(result.add, add, 'Returns an initialized add function');
      t.equal(result.act, act, 'Returns an initialized act function');
      t.end();
    });
});

