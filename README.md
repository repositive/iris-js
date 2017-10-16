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

Running the setup will return a `Promise<{backend, register, request, emit, collect}>` that will succeed if the connection to the broker could be established correctly.

- **backend** By default Iris will compose JSON serialization features on top of the AMQP backend.

  If you want to work directly with Buffers you can use the backend methods directly. The backend object contains the same `{register, request, emit, collect}` methods that accept and return Buffers instead of JSON objects, this is useful if you want to avoid the parsing and serialization steps and do your own.

  Check the section about [composition in Iris](#extending-iris) for suggestions on how to extend Iris with your own logic.

- **register** a handle that is triggered to a pattern event, the reply is not fault-tolerant; it will be discarded if the client that publishes the original request subsequently disconnects. The assumption is that an RPC client will reconnect and submit another request in this case. In the case of clients that emit events and opt to not handle responses the response of the RPC server will be always discarded:

  ```ts
  register<M, R>(opts: RegisterOpts<M, R>): Promise<RegisterActiveContext>
  ```
  
  Where RegisterOpts is:
  ```ts
  interface RegisterOpts<M, R> {
    pattern: string; // The pattern to which this handler will answer.
    handler: (opts: HandlerInput<M>) => Promise<R>; // Logic to handle the mesage.
    namespace?: string; // Allows to provide several handlers for the same pattern simultaneously"
  }
  
  interface HandlerInput<M> {
    payload?: M; // The message sent from the client
    context: RegisterActiveContext;
  }  

  interface RegisterActiveContext {
    pause: () => Promise<RegisterPausedContext>;
  }

  interface RegisterPausedContext {
    resume: () => Promise<RegisterActiveContext>;
  }
  ```

  You can pause a register `pause` function, this is useful when working with emit as non ttl applies and it's possible to accumulate items in a queue.

  There are two ways to access the `pause` function:

  - Using the returned context object when creating a new registration
    ```ts
    const registerContext = await register({pattern: 'test', handler});
    registerContext.pause().then(() => console.log(`The registered pattern is no longer accepting messages`))
    ```
  - Using the new `context` attribute injected to the handler
    ```ts
    register({pattern, async handler({payload, context}) {
      context.pause().then(() => console.log(`The registered pattern is no longer accepting messages`))
    }})
    ```
  Calling pause returns a RegisterPausedState that contains the `resume` function used to continue with the normal operation of the register.

- **request** on a pattern, expecting a single response from one of the handlers registered on a matching pattern. The call ensures that the message is dispatched to the RPC server and that it handles the event, if the server does not pick up the message in the timeout interval the message will be discarded, if you want to dispatch an event with no ttl use `emit` instead.
 
  If the message is handled on time the RPC server will reply to the client but the reply messages sent using this mechanism are in general not fault-tolerant; check the register functionality notes for more details.

  ```ts
  request<M, R>(opts: RequestOpts<M>): Promise<R>`  
  ```
  
  Where RequestOpts is:
  
  ```ts
  interface RequestOpts<M> {
    pattern: string; // Pattern used to route the message
    payload?: M; // The message payload
    timeout?: number; // If there is no answer after this amount of ms the operation will be rejected with a Timeout error
    retry?: number; // In case the handler returns an error iris will put the message again in the queue up to the number of times specified here, if not specified it defaults to 0 and won't do retries
  }
  ```
  
  If the operation is successful it will return `Promise<R>` where R is the output of the remote handler.


- **collect** on a pattern, expecting a multiple responses from one of the handlers registered on a matching pattern. The call ensures that the message is dispatched to the RPC server and that it handles the event, if the server does not pick up the message in the timeout interval the message will be discarded, if you want to dispatch an event with no ttl use `emit` instead.

  If the message is handled on time the RPC server will reply to the client but the reply messages sent using this mechanism are in general not fault-tolerant; check the register functionality notes for more details.

  ```ts
  collect<M, R>(opts: CollectOpts<M>): Promise<(R | RPCError)[]>`  
  ```
  
  Where CollectOpts is:
  
  ```ts
  interface CollectOpts<M> {
    pattern: string; // Pattern used to route the message
    payload?: M; // The message payload
    timeout?: number; // How much you to wait for responses.
  }
  ```

- **emit** to a pattern. No response will be returned but the system will ensure that the handlers that listen to the pattern receive the event, take in account that for this to work the handlers must be registered at some poing in time before the event gets emitted.

  ```ts
  emit<M>(opts: EmitOpts<M>): Promise<undefined>`
  ```
  
  Where EmitOpts is:
  
  ```ts
  interface EmitOpts<M> {
    pattern: string; // Pattern used to route the message
    payload?: M; // The message payload
  }
  ```
  
  If the operation is successful it will return `Promise<undefined>`, this ensures that the message was placed in the processing queues ant it will be processed at some point. It's now responsability of the RPC servers to handle it.

### Examples

**Server**
```ts
irisSetup()
  .then(({ backend, register, request, emit, collect }) => {

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
  .then(({ backend, register, request, emit, collect }) => {

    async function work() {
      const result = await request({pattern: 'test', payload: {times: 2}});
      console.log(result);
    }

  });
```

## Extending Iris

Iris is extensible through [Functional Composition](https://en.wikipedia.org/wiki/Function_composition), you just need to import the backend directly instead of the default export.

The following examples use [Ramda pipes](http://ramdajs.com/docs/#pipeP) but you are free to use or implement your own solution.

## Handler Injection

It's possible to inject properties in handlers. Iris provides a `inject` function to help with it:

```ts
import {inject, RegisterHandlerInput} from '@repositive/iris';
import * as _fetch from 'node-fetch';

interface CustomArgs {
  _fetch: typeof fetch
}

async function handler({payload, _fetch}: RegisterHandlerInput & CustomArgs) {
  return await _fetch(/*Implementation details*/)
}

const irisHandler = inject<CustomArgs, RegisterHandlerInput, Promise<any>>({args: {_fetch: fetch}, func: handler})
```



**Serialization:**

The default export of the library comes with built-in JSON serialization. Internally it uses composition to achieve it, let's look at it: (Example lighly modified to increase clarity)

[`index.ts`](https://github.com/repositive/iris-js/blob/master/src/index.ts)
```ts
import { IrisAMQP } from '@repositive/iris';

const backend = await IrisAMQP();

// Iris Request with JSON serialization on payload and response
const request: <T, R>(o: RequestInput<T>) => Promise<R | undefined> = pipeP(
  serializePayload,
  backend.request,
  parse
);

// Iris registration with handler JSON serialization decoration
const register: <T, R> (o: RegisterInput<T, R>) => Promise<undefined> = pipeP(
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
