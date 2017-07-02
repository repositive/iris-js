import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import iris from './index';

const setupAct: any = (spy: any) => stub().returns(Promise.resolve(spy));
const setupAdd: any = (spy: any) => stub().returns(Promise.resolve(spy));

test('This passes', (t: Test) => {
  t.assert(true, 'Simple assertion');
  t.end();
});

test('Tests setupp funcion' , (t: Test) => {

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

