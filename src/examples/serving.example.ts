
import irisSetup from '..';

const config = {
  url: 'amqp://repositive:repositive@localhost:5672',
  exchange: 'test'
};

irisSetup<any, any, any>(config)
  .then(({ add }) => {

    return add({pattern: 'test', async implementation(msg) {
      return {
        handled: msg.secret || true
      };
    }});
  })
  .then(() => {
    console.log(`Connection stablished using the ${config.exchange} exchange`);
  })
  .catch(console.error);
