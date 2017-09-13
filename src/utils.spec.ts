import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import {inject} from './utils';

test('Inject tests', (t: Test) => {
  type A = {one: string};
  type B = {two: string};
  function f (ab: A & B) {
    return ab;
  }

  const f2 = inject<B, A, A&B>({args: {two: 'two'} as B, func: f});

  const res = f2({one: 'one'});

  t.deepEqual(res, {one: 'one', two: 'two'}, 'Injected should be equivalent as single object');

  t.end();
});
