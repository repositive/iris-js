import * as yargs from 'yargs';
import irisSetup from '.';


async function handler() {
  const args = yargs
    .strict()
    .usage('Usage: $0  <pattern> [payload]')
    .nargs('pattern', 1)
    .option('payload', {
      describe: 'Object to send to the patternt your requesting',
        type: 'string',
        alias: 'p',
        default: '{}'
    })
    .option('uri', {
      describe: 'Location of the exchange',
        type: 'string',
        alias: 'u'
    })
    .option('exchange', {
      describe: 'The exchange used',
        type: 'string',
        alias: 'e'
    })
    .argv;

  const {_, p, e, u} = args;
  const [pattern] = _;
  const payload = p;
  const uri = u || 'amqp://guest:guest@localhost';

  if (!pattern) {
    console.log('You must specify a pattern');
  } else {
    console.log({payload, pattern});
    const iris = await irisSetup({uri, exchange: e || 'iris'});
    const res =  await iris.request( {pattern, payload});

    console.log(res);
    process.exit(0);
  }
}

handler().catch( console.error);
/*
let linterGod = yargs
  .strict()
  .version()
  .help()
  .alias('help', 'h')
  .usage('Usage:\n  rps <cmd>')
  .option('noprompt', {
    alias: ['y'],
    describe: 'Do not ask for confirmation',
    default: false,
    type: 'boolean'
  })
  .option('verbose', {
    <Down>alias: ['v'],
    describe: 'Verbose mode',
    default: false,
    type: 'boolean'
  })
  .argv;
*/
