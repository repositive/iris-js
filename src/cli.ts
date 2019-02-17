import * as yargs from 'yargs';
import {IrisAMQP} from '.';
import { Observable } from 'rxjs';

async function handler() {
  const yarg = yargs
    .strict()
    .version()
    .alias('version', 'v')
    .usage('Usage: $0  <pattern> [...opts]')
    .nargs('pattern', 1)
    .option('payload', {
      describe: 'Object to send to the patternt your requesting',
      type: 'string',
      alias: 'p'
    })
    .option('uri', {
      describe: 'Location of the exchange',
      type: 'string',
      alias: 'u',
      default: 'amqp://guest:guest@localhost'
    })
    .option('exchange', {
      describe: 'The exchange used',
      type: 'string',
      alias: 'e',
      default: 'iris'
    })
    .option('timeout', {
      describe: 'How much to wait for the response before giving up',
      type: 'number',
      alias: 't',
      default: 100
    });

  const args = yarg.argv;

  const {_, payload, exchange, uri, timeout} = args;
  const [pattern] = _;

  if (!pattern) {
    yarg.showHelp();
  } else {
    IrisAMQP({uri, exchange})
    .map(iris => {
      return Observable.fromPromise(iris.request( {pattern, timeout, payload: payload ? Buffer.from(payload) : Buffer.alloc(0)}));
    }).mergeAll()
    .subscribe(
      (res) => {
        console.log(res && res.toString());
        process.exit(0);
      },
      (error) => {
        console.error(error);
        process.exit(1);
      },
      () => {/**/}
    );
  }
}

handler().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
