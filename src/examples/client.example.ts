
import irisSetup from '..';

const config = {
  url: 'amqp://guest:guest@localhost:5672',
  exchange: 'test'
};

irisSetup(config)
  .then(({ act }) => {

    async function work() {
      const result = await act({pattern: 'test', timeout: 10000, payload: {secret: 'chourizo'}});
      console.log(result);
    }

    setInterval(() => {
      work().catch((err) => {
        console.error(err);
      });
    }, 3000);

  });
