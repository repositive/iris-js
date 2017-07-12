

# @repositive/iris

[![codecov](https://codecov.io/gh/repositive/iris-js/branch/master/graph/badge.svg)](https://codecov.io/gh/repositive/iris-js)

# Iris Service #

The Iris service is called after the Greek personification of the rainbow, as a representation a bridge between mortals and gods and a way of communication between them.

* [Purpose](#purpose)  
* [Installation](#installation)  
* [Usage](#usage)  
* [Internals and Architecture](#internals-and-architecture)
* [Notes](#notes)  

## Purpose ##

Iris will provides operations to ask and receive information without the need of knowing who is providing it. For that Iris would be using an exchange queue in  _RabitMQ_ full of requests identified by a pattern. Iris then will check witch of the services could response to that request to do it and send back an answer to the origin.




<p align="center">
    <img src="https://github.com/repositive/iris-js/blob/master/docs/imgs/abstractIris.png?raw=true" alt="Abstraction of Iris"/>
    <p align="center">What a services sees.</p>
</p>


## Installation ##

  - Using npm:
  ```
  npm install @repositive/iris
  ```


## Usage ##

Steps:

- **Setup** Iris: Provide to iris the basic information for it to work by using the `setup(options: LibOptions)`.  

`export interface LibOptions {url:string; exchange: string;}`  
`url`: Path to RabbitMQ.  
`exchange`: Name of the exchange queue.  

It would return the functions `{act, add}`

- **Add** an implementation to response to a pattern:  
`add(pattern, implementation, namespace):AddOptions<M, R>`:  
  - `pattern`: Pattern to which this service will respond.  
  - `implementation`: Logic to manage the message to return a proper response.
  - `namespace`: Allows to provide several add implementations for the same pattern with out conflict. That way something acting on that pattern will get the responses of all of the implementations an not just one.  

It will return  `Promise<void>`.

- **Act** on a pattern to get return from the implementations of all the services that had added one to that pattern for an specific payload:  
`act(pattern: string, payload, timeout?): ActOptions<M> `  
  - `pattern`: Pattern to which this service will act on.    
  - `payload`: Message to send as input to the implementation.
  - `Timeout`: If there is no answer after the specified timeout, `act` will reject the promise.  

It will return the output of the remote implementation as `Promise<R>`


## Internals and Architecture ##



<p align="center">
    <img src="https://github.com/repositive/iris-js/blob/master/docs/imgs/Iris.png?raw=true" alt="Iris arq"/>
    <p align="center">How It works</p>
</p>

