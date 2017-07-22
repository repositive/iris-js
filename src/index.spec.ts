import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import { toPromise } from '.';

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
