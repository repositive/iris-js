import * as yargs from 'yargs';
import irisSetup from '.';

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
    const _serialization = {
      parse: (b: Buffer) => b.toString(),
      serialize: (str: string) => Buffer.from(str)
    };
    const iris = await irisSetup({uri, exchange, _serialization});
    const res =  await iris.request( {pattern, payload});

    console.log(res);
    process.exit(0);
  }
}

handler().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
