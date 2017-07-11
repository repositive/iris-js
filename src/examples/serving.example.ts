
import irisSetup from '..';

const config = {
  url: 'amqp://repositive:repositive@localhost:5672',
  exchange: 'test'
};

irisSetup<any, any, any>(config)
  .then(({ add }) => {

    return add({pattern: 'test', async implementation(msg) {
      throw new Error();
    }});
  })
  .then(() => {
    console.log(`Connection stablished using the ${config.exchange} exchange`);
  })
  .catch(console.error);
