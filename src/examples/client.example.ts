
import irisSetup from '..';

const config = {
  url: 'amqp://guest:guest@localhost:5672',
  exchange: 'test'
};

irisSetup(config)
  .then(({ act }) => {
    const sendToTest = act({pattern: 'test'});

    async function work() {
      const result1 = await sendToTest({secret: 'chourizo'});
      const result2 = await sendToTest({secret: 'pemento'});

      return {result1, result2};
    }

    work().then(console.log);
  });
