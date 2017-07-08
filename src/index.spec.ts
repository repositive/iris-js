import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import iris from './index';

const setupAct: any = (spy: any) => stub().returns(Promise.resolve(spy));
const setupAdd: any = (spy: any) => stub().returns(Promise.resolve(spy));

test('Tests setup funcion' , (t: Test) => {

  const add = spy();
  const act = spy();
  const _connect = stub().returns({
    createChannel: stub(),
    on: spy()
  });

  iris({url: 'urls', exchange: 'ex', _setupAct: setupAct(act), _setupAdd: setupAdd(add), _connect})
    .then((result: any) => {
      result.add({pattern: ''});
      t.ok(add.calledOnce, 'Returns an initialized add function');
      result.act();
      t.ok(act.calledOnce, 'Returns an initialized act function');
      t.end();
    });
});

