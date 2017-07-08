
import irisSetup from '..';

const config = {
  url: 'amqp://repositive:repositive@localhost:5672',
  exchange: 'test'
};

irisSetup(config)
  .then(({ act }) => {

    async function work() {
      const result = await act({pattern: 'test', payload: {secret: 'chourizo'}});
      console.log(result);
    }

    setInterval(() => {
      work().catch(() => {
        console.warn('undelivered');
      });
    }, 3000);

  });
