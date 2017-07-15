
import irisSetup from '..';

const config = {
  uri: process.env.RABBIT_URI,
  exchange: 'test'
};

irisSetup(config)
  .then(({ request }) => {

    async function work() {
      const result = await request({pattern: 'test', payload: {times: 2}});
      console.log(result);
    }

    setInterval(() => {
      work().catch((err) => {
        console.error(err);
      });
    }, 3000);

  });
