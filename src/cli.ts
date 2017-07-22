import * as yargs from 'yargs';
import {IrisAMQP} from '.';

async function handler() {
  const yarg = yargs
    .strict()
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
    });

  const args = yarg.argv;

  const {_, payload, exchange, uri} = args;
  const [pattern] = _;

  if (!pattern) {
    yarg.showHelp();
  } else {
    const iris = await IrisAMQP({uri, exchange});
    const res =  await iris.request( {pattern, payload: payload ? Buffer.from(payload) : Buffer.alloc(0)});

    console.log(res && res.toString());
    process.exit(0);
  }
}

handler().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
