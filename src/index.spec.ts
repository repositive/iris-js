import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import iris from './index';
import { restartConnection } from './index';

const setupAct: any = (spy: any) => stub().returns(Promise.resolve(spy()));
const setupAdd: any = (spy: any) => stub().returns(Promise.resolve(spy()));
const _restartConnection = spy();

function mockConnect() {
  return {
    createChannel: spy(),
    on: spy()
  };
}

function mockOpts() {
  const connectResponse = mockConnect();
  const add = spy();
  const act = spy();
  return {
    steps: {
      act,
      add,
      connectResponse
    },
    mocks: {
      url: '',
      exchange: '',
      _setupAct: stub().returns(Promise.resolve(act)),
      _setupAdd: stub().returns(Promise.resolve(add)),
      _restartConnection: spy(),
      _connect: stub().returns(Promise.resolve(connectResponse))
    }
  };
}

test('Test restartConnection', (t: Test) => {
  const _setup = stub().returns(Promise.resolve());

  const opts = mockOpts();
  const _setTimeout = spy();

  const url = '';
  const exchange = '';
  const result = restartConnection({opts: opts.mocks, _setup, _setTimeout});

  t.ok(result instanceof Promise, 'RestartConnection returns a promise');

  t.ok(_setTimeout.calledOnce, 'Set a timeout');
  t.notOk(opts.mocks._restartConnection.called, 'Do not iterate before timeout');
  t.notOk(_setup.called, 'Do not run setup before timeout');

  const timeoutCb = _setTimeout.getCall(0).args[0];
  timeoutCb();

  t.ok(_setup.calledOnce, 'Run setup un timeout');
  t.notOk(opts.mocks._restartConnection.called, 'Do not iterate if setup succeds');

  _setup.reset();
  _setup.returns(Promise.reject({}));

  timeoutCb();

  setTimeout(() => {
    t.ok(opts.mocks._restartConnection.calledOnce, 'Iterate if setup blows up on timeout');

    t.end();
  }, 0);

});

test('Tests setup funcion' , (t: Test) => {

  const opts = mockOpts();

  iris(opts.mocks)
    .then((result: any) => {
      result.add({pattern: ''});
      t.ok(opts.steps.add.calledOnce, 'Returns an initialized add function');
      result.act();
      t.ok(opts.steps.act.calledOnce, 'Returns an initialized act function');
      t.end();
    });
});

