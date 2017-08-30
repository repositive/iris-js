# @repositive/iris

[![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://choosealicense.com/licenses/lgpl-3.0/)
[![codecov](https://codecov.io/gh/repositive/iris-js/branch/master/graph/badge.svg)](https://codecov.io/gh/repositive/iris-js)
[![npm version](https://badge.fury.io/js/%40repositive%2Firis.svg)](https://badge.fury.io/js/%40repositive%2Firis)

In Greek mythology, Iris ([/ˈaɪrᵻs/][wikipedia]) is the personification of the rainbow and messenger of the gods.

* [Purpose](#purpose)  
* [Installation](#installation)  
* [Usage](#usage)
* [Extending Iris](#extending-iris)
* [CLI Tool](#cli-tool)

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

```bash
$ npm install @repositive/iris
```

## Usage

- [Import](#import)
- [Setup](#setting-up-iris)
- [Functionality](#functionality)
- [Examples](#examples)

### Import
The library exports a single default function to run the setup.

```ts
import irisSetup from `@repositive/iris`;
```

### Setting up Iris
Provide to iris the basic information

```ts
irisSetup(options?: LibOpts)
```  

Where LibOpts is:
```ts
export interface LibOpts {
  uri?: string; // URI of rabbitMQ defaults to ~"amqp://guest:guest@localhost"~
  exchange?: string; // Exchange use for routing defaults to ~"iris"~
  namespace?: string; // Namespace used by default by all registrations defaults to ~"default"~
}
```

### Functionality

Running the setup will return a `Promise<{register, request, emit}>` that will succeed if the connection to the broker could be established correctly.

- **register** a handle that is triggered to a pattern event, the reply is not fault-tolerant; they will be discarded if hte client that publishes the original request subsequently disconnects. The assumption is that an RPC client will reconnect and submit another request in this case. In the case of clients that emit events and opt to not handle responses the response of the RPC server will be always discarded:

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

- **request** on a pattern, expecting a single response from one of the handlers registered on a matching pattern. The call ensures that the message is dispatched to the RPC server and that it handles the event, the RPC server will reply to the client but the reply messages sent using this mechanism are in general not fault-tolerant; check the register functionality notes for more details.

```ts
request<M, R>(opts: RequestOpts<M>): Promise<R>`  
```

Where RequestOpts is:

```ts
interface RequestOpts<M> {
  pattern: string; // Pattern used to route the message
  payload?: M; // The message payload
  timeout?: number; // If there is no answer after this amount of ms the operation will be rejected with a Timeout error
}
```

If the operation is successful it will return `Promise<R>` where R is the output of the remote handler.

- **emit** to a pattern. No response will be returned but the system will ensure that the handlers that listen to the pattern receive the event, take in account that for this to work the handlers must be registered at some poing in time before the event gets emitted.

```ts
emit<M>(opts: EmitOpts<M>): Promise<void>`
```

Where EmitOpts is:

```ts
interface EmitOpts<M> {
  pattern: string; // Pattern used to route the message
  payload?: M; // The message payload
}
```

If the operation is successful it will return `Promise<void>`, this ensures that the message was placed in the processing queues ant it will be processed at some point. It's now responsability of the RPC servers to handle it.

### Examples

**Server**
```ts
irisSetup()
  .then(({ register, emit }) => {

    return register({pattern: 'test', async handler({payload}) {
      const {times} = payload;

      const rand = Math.random();
      const result = rand * times;

      await emit({pattern: 'test.handled', payload: result});

      return result;
    }});
  })
  .then(() => {
    console.log(`Iris is running`);
  })
  .catch(console.error);
```

**Client**
```ts
irisSetup()
  .then(({ request, emit }) => {

    async function work() {
      const result = await request({pattern: 'test', payload: {times: 2}});
      console.log(result);
    }

  });
```

## Extending Iris

Iris is extensible through [Functional Composition](https://en.wikipedia.org/wiki/Function_composition), you just need to import the backend directly instead of the default export.

The following examples use [Ramda pipes](http://ramdajs.com/docs/#pipeP) but you are free to use or implement your own solution.



**Serialization:**

The default export of the library comes with built-in JSON serialization. Internally it uses composition to achieve it, let's look at it: (Example lighly modified to increase clarity)

[`index.ts`](https://github.com/repositive/iris-js/blob/master/src/index.ts)
```ts
import { IrisAMQP } from '@repositive/iris';

const backend = await IrisAMQP();

// Iris Request with JSON serialization on payload and response
const request: <T, R>(o: RequestInput<T>) => Promise<R | void> = pipeP(
  serializePayload,
  backend.request,
  parse
);

// Iris registration with handler JSON serialization decoration
const register: <T, R> (o: RegisterInput<T, R>) => Promise<void> = pipeP(
  transformHandler,
  backend.register
);
```

## CLI Tool

The library ships also with a cli utility to help to interact with the services.

**Iris in global mode**
```bash
$ npm install -g @repositive/iris
```

**Options available**
```bash
$ iris
```

**Usage**
```bash
$ iris pattern.to.act.on -p '{"contentof": "payload"}'
```

[wikipedia]: https://en.wikipedia.org/wiki/Iris_(mythology)
