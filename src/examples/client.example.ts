
import irisSetup from '..';

const config = {
  url: 'amqp://repositive:repositive@localhost:5672',
  exchange: 'test'
};

irisSetup(config)
  .then(({ request }) => {

    async function work() {
      const result = await request({pattern: 'test', timeout: 10000, payload: {secret: 'chourizo'}});
      console.log(result);
    }

    setInterval(() => {
      work().catch((err) => {
        console.error(err);
      });
    }, 3000);

  });
