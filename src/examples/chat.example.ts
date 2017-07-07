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
  console.log(`${msg.author}: ${msg.comment}`);
  return {ack: true};
}

function prepareNameListener({username}: {username: string}) {
  return async function nameListener(msg: any): Promise<any> {
    return {
      name: username
    };
  };
}

type ChatParams = {
  act: (params: {pattern: string}) => (payload: any) => Promise<any>,
  username: string,
  target: string,
  _question?: typeof question,
  _cmds?: typeof cmds
};

const cmds: {[k: string]: (params: {oldParams: ChatParams, _question?: typeof question}) => Promise<ChatParams>} = {
  'cntg': async ({oldParams, _question = question}) => {
    const target = await _question({query: 'New target: '});
    return {...oldParams, target};
  }
};

async function chat({
  act,
  username,
  target,
  _question = question,
  _cmds = cmds
}: ChatParams): Promise<void> {

  const talk = act({pattern: `chat.${target}`});

  while (true) {
    const msg = await _question({query: ''});
    if(/:[a-z]/.test(msg)) {
      const cmd = msg.substring(1);
      return chat(await _cmds[cmd]({oldParams: {act, username, target, _question}}));
    } else {
      talk({
        author: username,
        comment: msg
     });
    }
  }
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

  add({pattern: `chat.name.${username}`, implementation: prepareNameListener({username})});

  const target = await _question({ query: 'Insert user: '});

  return chat({act, username, target});
}

init({}).catch(console.error);
