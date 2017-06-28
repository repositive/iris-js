

repositive/iris
---
# Iris Service #

The Iris service is called after the Greek personification of the rainbow, as a representation a bridge between mortals and gods and a way of communication between them.

* [Purpose](#purpose)  
* [Usage](#usage)  
* [Installation](#installation)  
* [Internals and Architecture](#internals-and-architecture)
* [Notes](#notes)  

## Purpose ##

Iris will provides operations to ask and receive information without the need of knowing who is providing it. For that Iris would be using an exchange queue in  _RabitMQ_ full of requests identified by a pattern. Iris then will check witch of the services could response to that request to do it and send back an answer to the origin.




<p align="center">
    <img src="https://github.com/repositive/iris-js/blob/mvp/docs/imgs/abstractIris.png" alt="Abstraction of Iris"/>
    <p align="center">What a services see.</p>
</p>
<p align="center">
    <img src="https://github.com/repositive/iris-js/blob/mvp/docs/imgs/Iris.png" alt="Iris arq"/>
    <p align="center">How It works</p>
</p>


## Usage ##

Steps:

- **Setup** Iris: Provide to iris the basic information for it to work by using the `setup(options: LibOptions)`.  

`export interface LibOptions {url:string; exchange: string;}`                                                                                                                                                                                                                                                                                                                                                                                                                                         
`url`: Path to RabbitMQ.  
`exchange`: Name of the exchange queue.  

It would return the functions `{act, add}`

- **Add** a service as provider using `add(pattern: string, implementation: (msg: Buffer) => Promise<Buffer>, opts: AddOptions = {})`:  
`pattern`: Pattern to which this service will response.  
`implementation`: Logic to manage the message to return a proper response.  
`opts`:  `{queue_namespace?: string;}`                             

It will return  `Promise<void>`.

- **Get** responses from services  using `act(pattern: string, opts: ActOptions = {}): `  
`pattern`: Pattern to which this service will response.    
`opts`:  `{sync?:boolean, timeout?: number, multi?: boolean}`  

It will return the proper implementation to get the response needed`((payload: Buffer) => Promise<Buffer>) `


## Installation ##

## Internals and Architecture ##



## Notes ##

The repository has git hooks on `precommit` and `prepush`. You need to pass the linting criteria before commit and the test and coverage criteria before push. The test requirements are 80% overall.

The only file that is not evaluated during testing is the `index.ts`. DO NOT MODIFY THIS FILE unless is completely necessary.
