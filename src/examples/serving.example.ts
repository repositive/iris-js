
import irisSetup from '..';

const config = {
  url: 'amqp://repositive:repositive@localhost:5672',
  exchange: 'test'
};

irisSetup<any, any, any>(config)
  .then(({ subscribe }) => {

    return subscribe({pattern: 'test', async handler({payload}) {
      return Promise.reject(new Error('Shit happened'));
    }});
  })
  .then(() => {
    console.log(`Connection stablished using the ${config.exchange} exchange`);
  })
  .catch(console.error);
