import * as test from 'tape';
import {Test} from 'tape';
import { stub, spy } from 'sinon';
import { serialize, parse } from './serialization';


test('Parse tests', (t: Test) => {
  t.equals(parse(Buffer.alloc(0)), undefined, 'Parses emtpy buffer as undefined');
  t.equals(parse(Buffer.from('""')), '', 'Parses strings');
  t.deepEquals(parse(Buffer.from('{}')), {}, 'Parses objects');
  t.equals(parse(Buffer.from('1')), 1, 'Parses numbers');
  t.equals(parse(Buffer.from('null')), null, 'Parses null');
  t.end();
});

test('Serialize tests', (t: Test) => {

  t.deepEquals(serialize(undefined), Buffer.alloc(0), 'Serializes undefined as empty buffer');
  t.deepEquals(serialize(''), Buffer.from('""'), 'Serializes strings');
  t.deepEquals(serialize({}), Buffer.from('{}'), 'Serializes objects');
  t.deepEquals(serialize(1), Buffer.from('1'), 'Serializes numbers');
  t.deepEquals(serialize(null), Buffer.from('null'), 'Serializes null');

  t.end();
});
