
import irisSetup from '..';

async function wait(time: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(
      () => {
        resolve();
      },
      time
    );
  });
}

irisSetup({})
  .then(({ register }) => {

    type TInput = {times: number};
    type TOutput = {result: number};
    return register<TInput, TOutput>({pattern: 'test', async handler({payload}) {
      const {times} = payload || {times: 1};

      const rand = Math.random();
      if (rand > 0.8) {
        return Promise.reject(new Error('I have a 20% of rejecting you know'));
      } else if (rand < 0.2) {
        throw new Error('And a 20% chance of blowing up badly');
      } else if (rand <= 0.8 && rand >= 0.6) {
        await wait(100);
      } else {
        return {result: rand * times};
      }
    }});
  })
  .then(() => {
    console.log(`Connection stablished`);
  })
  .catch(console.error);
