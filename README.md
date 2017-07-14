# @repositive/iris

[![codecov](https://codecov.io/gh/repositive/iris-js/branch/master/graph/badge.svg)](https://codecov.io/gh/repositive/iris-js)

In Greek mythology, Iris ([/ˈaɪrᵻs/][wikipedia]) is the personification of the rainbow and messenger of the gods.

* [Purpose](#purpose)  
* [Installation](#installation)  
* [Usage](#usage)  
* [Internals and Architecture](#internals-and-architecture)

## Purpose ##

Iris provides an abstraction interface to request and handle information without the need of know which service is on the other side of the wire.

**Provided operations**
- Add a new handler for a specific pattern.
- Send a message asking for a remote computational response.
- Send a message and do not expect or wait for a response (broadcast).
- Send a message and wait for multiple responses.

We aim to provide a high level of extensibility enabling the implementation of custom backends. The current goal of the project is to achieve a reasonable satisfaction using AMQP as its first backend. Other implementations (like SWIM) will follow.

<p align="center">
    <img src="https://github.com/repositive/iris-js/blob/master/docs/imgs/abstractIris.png?raw=true" alt="Abstraction of Iris"/>
</p>


## Installation

```
npm install @repositive/iris
```

## Usage

- [Import](#import)
- [Setup](#setting-up-iris)
- [Functionality](#functionality)
- [Examples](#examples)

### Import
The library exports a single default function to run the setup.

```ts
import setupIris from `@repositive/iris`;
```

### Setting up Iris
Provide to iris the basic information

```ts
setupIris(options: LibOpts)
```  

Where LibOpts is:
```ts
export interface LibOpts {
  uri: string; // URI of rabbitMQ ~"amqp://user:password@host"~
  exchange: string; // Exchange use for routing ~"iris"~
  namespace?: string; // Namespace used by default by all registrations ~"servicename"~
}
```

### Functionality

Running the setup will return a `Promise<{register, request}>` that will succeed if the connection to the broker could be established correctly.

- **register** a handle that answers to a pattern:  
```ts
register<M, R>(opts: RegisterOpts<M, R>): Promise<void>
```

Where RegisterOpts is:
```ts
interface RegisterOpts<M, R> {
  pattern: string; // The pattern to which this handler will answer.
  handler: (opts: HandlerOpts<M>) => Promise<R>; // Logic to handle the mesage.
  namespace?: string; // Allows to provide several handlers for the same pattern simultaneously"
}

interface HandlerOpts<M> {
  msg: M; // The message sent from the client.
}
```

- **request** on a pattern, expecting a single request from one of the handlers registered on a matching pattern.

```ts
request<M, R>(opts: RequestOpts<M>): Promise<R>`  
```

Where RequestOpts is:

```ts
interface RequestOpts<M> {
  pattern: string; // Pattern used to route the message
  payload: M; // The message payload
  timeout?: number; // If there is no answer after this amount of ms the operation will be rejected with a Timeout error
}
```

If the operation is successful it will return `Promise<R>` where R is the output of the remote handler.

## Examples

**Server**
```ts
irisSetup(config)
  .then(({ register }) => {

    return register({pattern: 'test', async handler({payload}) {
      const {times} = payload;

      const rand = Math.random();
      return {result: rand * times};
    }});
  })
  .then(() => {
    console.log(`Iris is running`);
  })
  .catch(console.error);
```

**Client**
```ts
irisSetup(config)
  .then(({ request }) => {

    async function work() {
      const result = await request({pattern: 'test', payload: {times: 2}});
      console.log(result);
    }

  });
```

[wikipedia]: https://en.wikipedia.org/wiki/Iris_(mythology)
