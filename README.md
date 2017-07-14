

# @repositive/iris

[![codecov](https://codecov.io/gh/repositive/iris-js/branch/master/graph/badge.svg)](https://codecov.io/gh/repositive/iris-js)

# Iris Service #

The Iris service is called after the Greek personification of the rainbow, as a representation a bridge between mortals and gods and a way of communication between them.

* [Purpose](#purpose)  
* [Installation](#installation)  
* [Usage](#usage)  
* [Internals and Architecture](#internals-and-architecture)

## Purpose ##

Iris provides an abstraction to request and handle information without the need of know which service is on the other side of the wire.

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

Running the setup will return a Promise<{register, request}> that will succeed if the connection to the broker could be stablished correctly.

- **register** a handle that answers to a pattern:  
```ts
register<M, R>(opts: RegisterOpts<M, R>): Promise<void>
```

Where RegisterOpts<M, R> is:
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

Where RequestOpts<M> is:

```ts
interface RequestOpts<M> {
  pattern: string; // Pattern used to route the message
  payload: M; // The message payload
  timeout?: number; // If there is no answer after this amount of ms the operation will be rejected with a Timeout error
}
```

If the operation is successful it will return `Promise<R>` where R is the output of the remote handler.

## Internals and Architecture

<p align="center">
    <img src="https://github.com/repositive/iris-js/blob/master/docs/imgs/Iris.png?raw=true" alt="Iris arq"/>
    <p align="center">How It works</p>
</p>

