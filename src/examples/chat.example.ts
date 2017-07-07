import irisSetup from '..';

const config = {
  url: 'amqp://repositive:repositive@localhost:5672',
  exchange: 'test'
};

const readLine = require('readline');

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question({
  query,
  _rl = rl
}:{
  query: string,
  _rl?: typeof rl
}): Promise<string> {
  return new Promise((resolve, reject) => {
    _rl.question(query, (answer: string) => {
      resolve(answer);
    });
  });
}

interface Msg {
  author: string;
  comment: string;
}

async function chatListener(msg: any): Promise<any> {
  console.log(`${msg.author}>> ${msg.comment}`);
  return {ack: true};
}

async function init(
{ /* Default argument definition */
  _question = question,
  _irisSetup = irisSetup
}:{ /*Type signature of parameters */
  _question?: typeof question,
  _irisSetup?: typeof irisSetup
}): Promise<void> {
  const {act, add} = await _irisSetup(config);
  const username = await _question({query: 'Your username: '});

  add({pattern: `chat.${username}`, implementation: chatListener});

  const talkTo = await _question({ query: 'Insert user: '});

  const talkToUser = act({pattern: `chat.${talkTo}`});
  while (true) {
    const msg = await _question({query: ''});
    talkToUser({
      author: username,
      comment: msg
    });
  }
}

init({}).catch(console.error);
