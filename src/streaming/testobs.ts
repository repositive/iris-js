import { Channel, Message, connect } from 'amqplib';
import { all } from 'bluebird';
import { Observable, Observer, Subject, AnonymousSubject } from 'rxjs';
import { Option } from 'funfix';
import { inspect } from 'util';
import * as R from 'ramda';
import { observeOn } from 'rxjs/operator/observeOn';
import { setImmediate } from 'timers';
import { setupAMQPObservable } from './subjects';


export interface SetupRegisterOpts {
  ch: Channel;
  exchange: string;
  namespace?: string;
}

interface IrisMsg {
  content: Buffer;
  stream_id: string;
  eos: boolean;
}

interface IrisStreamStart {
  type: 'start';
  id: string;
  content: Observable<Buffer>;
}

type IrisStreamEvent = IrisStreamStart | IrisStreamStop;

interface IrisStreamStop {
  type: 'stop';
  id: string;
}

const defaults = {
  uri: 'amqp://guest:guest@localhost',
  exchange: 'iris',
  _log: console
};

connect(defaults.uri, { durable: true, noAck: true })
  .then(connection => {
    connection.createChannel()
      .then(channel => {
        const observe = setupAMQPObservable(channel);
      });
  });

