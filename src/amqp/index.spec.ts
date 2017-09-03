import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import iris from './index';
import { restartConnection } from './index';

const _restartConnection = spy();

function mockConnect() {
  return {
    createChannel: spy(),
    on: spy()
  };
}

function wait(time: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
}

function mockOpts() {
  const connectResponse = mockConnect();
  const register = spy();
  const request = spy();
  const emit = spy();
  const collect = spy();
  const registrations = {'test': {pattern: 'test', handler: spy()}};
  return {
    steps: {
      emit,
      request,
      register,
      collect,
      connectResponse
    },
    mocks: {
      uri: '',
      exchange: '',
      registrations,
      _setupRequest: stub().returns(Promise.resolve({request, collect})),
      _setupRegister: stub().returns(Promise.resolve(register)),
      _setupEmit: stub().returns(Promise.resolve(emit)),
      _restartConnection: stub().returns(Promise.resolve({request, register, emit})),
      _connect: stub().returns(Promise.resolve(connectResponse)),
      _log: {log: spy(), info: spy(), warn: spy(), error: spy()} as any
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

  async function test() {
    const result = await iris(opts.mocks);

    t.ok(opts.steps.register.calledOnce, 'Add is being call for each one of the provided registrations');

    const passAddition = opts.steps.register.getCall(0).args[0];

    t.deepEqual(opts.mocks.registrations.test, passAddition, 'The subscription passed to register is the expected one');

    opts.steps.register.reset();
    await result.register({pattern: '', handler: spy()});
    t.ok(opts.steps.register.calledOnce, 'Returns an initialized register function');
    await result.request({pattern: '', payload: Buffer.from('{}')});
    t.ok(opts.steps.request.calledOnce, 'Returns an initialized act function');
    await result.emit({pattern: ''});
    t.ok(opts.steps.emit.calledOnce, 'Returns an initialized emit function');
    await result.collect({pattern: ''});
    t.ok(opts.steps.collect.calledOnce, 'Returns an initialized collect function');

    const on0 = opts.steps.connectResponse.on.getCall(0);
    const on1 = opts.steps.connectResponse.on.getCall(1);

    t.equals(on0 && on0.args[0], 'error', 'It adds a handler to connection error');
    t.equals(on1 && on1.args[0], 'close', 'It adds a handler to connection close');

    // Mocks of backend for restart.
    const register = spy();
    const request = spy();
    const emit = spy();
    const collect = spy();

    opts.mocks._restartConnection.returns(Promise.resolve({request, register, emit, collect}));

    on0.args[1]();

    t.ok(opts.mocks._restartConnection.calledOnce, 'Restart connection is called on connection close');

    await wait(0); // Wait for the connection to stablish again;

    await result.register({pattern: '', handler: spy()});
    t.ok(register.calledOnce, 'After successfull restart register is reasigned');

    await result.request({pattern: '', payload: Buffer.from('')});
    t.ok(request.calledOnce, 'After successfull restart request is reasigned');

    await result.emit({pattern: '', payload: Buffer.from('')});
    t.ok(emit.calledOnce, 'After successfull restart emit is reasigned');

    await result.collect({pattern: '', payload: Buffer.from('')});
    t.ok(collect.calledOnce, 'After successfull restart collect is reasigned');

    opts.mocks._restartConnection.returns(Promise.reject({}));

    on0.args[1]();

    await result.register({pattern: '', handler: spy()}).then(() => {
      t.ok(true, 'Subscribe works on errored library');
    });

    await result.request({pattern: '', payload: Buffer.alloc(0)})
      .then(() => {
        t.ok(false, 'Request should fail on errored library');
      })
      .catch(err => {
        t.ok(true, 'Request rejects the promise if the pipe is broken');
      });

    await result.emit({pattern: '', payload: Buffer.alloc(0)})
      .then(() => {
        t.ok(false, 'Emit should fail on errored library');
      })
      .catch(err => {
        t.ok(true, 'Emit rejects the promise if the pipe is broken');
      });

    await result.collect({pattern: ''})
      .then(() => {
        t.ok(false, 'Collect should fail on errored library');
      })
      .catch((err) => {
        t.ok(true, 'Collect rejects the promise if hte pipe is broken');
      });

  }

  test()
    .then(() => t.end())
    .catch(console.error);
});

