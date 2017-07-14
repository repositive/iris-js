
import irisSetup from '..';

const config = {
  url: 'amqp://guest:guest@localhost:5672',
  exchange: 'test'
};

irisSetup<any, any, any>(config)
  .then(({ add }) => {

    return add({pattern: 'test', async implementation(msg) {
      return Promise.reject(new Error('Shit happened'));
    }});
  })
  .then(() => {
    console.log(`Connection stablished using the ${config.exchange} exchange`);
  })
  .catch(console.error);
