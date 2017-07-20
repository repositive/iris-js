declare namespace R {
  interface Static {
        /**
         * Creates a new function that runs each of the functions supplied as parameters in turn,
         * passing the return value of each function invocation to the next function invocation,
         * beginning with whatever arguments were passed to the initial invocation.
         */
        pipeP<V0, T1>(fn0: (x0: V0) => Promise<T1>): (x0: V0) => Promise<T1>;
        pipeP<V0, V1, T1>(fn0: (x0: V0, x1: V1) => Promise<T1>): (x0: V0, x1: V1) => Promise<T1>;
        pipeP<V0, V1, V2, T1>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>): (x0: V0, x1: V1, x2: V2) => Promise<T1>;

        pipeP<V0, T1, T2>(fn0: (x0: V0) => Promise<T1>, fn1: (x: T1) => Promise<T2>): (x0: V0) => Promise<T2>;
        pipeP<V0, V1, T1, T2>(fn0: (x0: V0, x1: V1) => Promise<T1>, fn1: (x: T1) => Promise<T2>): (x0: V0, x1: V1) => Promise<T2>;
        pipeP<V0, V1, V2, T1, T2>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>, fn1: (x: T1) => Promise<T2>): (x0: V0, x1: V1, x2: V2) => Promise<T2>;

        pipeP<V0, T1, T2, T3>(fn0: (x: V0) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>): (x: V0) => Promise<T3>;
        pipeP<V0, V1, T1, T2, T3>(fn0: (x0: V0, x1: V1) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>): (x0: V0, x1: V1) => Promise<T3>;
        pipeP<V0, V1, V2, T1, T2, T3>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>): (x0: V0, x1: V1, x2: V2) => Promise<T3>;

        pipeP<V0, T1, T2, T3, T4>(fn0: (x: V0) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>): (x: V0) => Promise<T4>;
        pipeP<V0, V1, T1, T2, T3, T4>(fn0: (x0: V0, x1: V1) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>): (x0: V0, x1: V1) => Promise<T4>;
        pipeP<V0, V1, V2, T1, T2, T3, T4>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>): (x0: V0, x1: V1, x2: V2) => Promise<T4>;

        pipeP<V0, T1, T2, T3, T4, T5>(fn0: (x: V0) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>, fn4: (x: T4) => Promise<T5>): (x: V0) => Promise<T5>;
        pipeP<V0, V1, T1, T2, T3, T4, T5>(fn0: (x0: V0, x1: V1) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>, fn4: (x: T4) => Promise<T5>): (x0: V0, x1: V1) => Promise<T5>;
        pipeP<V0, V1, V2, T1, T2, T3, T4, T5>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>, fn4: (x: T4) => Promise<T5>): (x0: V0, x1: V1, x2: V2) => Promise<T5>;

        pipeP<V0, T1, T2, T3, T4, T5, T6>(fn0: (x: V0) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>, fn4: (x: T4) => Promise<T5>, fn5: (x: T5) => Promise<T6>): (x: V0) => Promise<T6>;
        pipeP<V0, V1, T1, T2, T3, T4, T5, T6>(fn0: (x0: V0, x1: V1) => Promise<T1>, fn1: (x: T1) => Promise<T2>, fn2: (x: T2) => Promise<T3>, fn3: (x: T3) => Promise<T4>, fn4: (x: T4) => Promise<T5>, fn5: (x: T5) => Promise<T6>): (x0: V0, x1: V1) => Promise<T6>;
        pipeP<V0, V1, V2, T1, T2, T3, T4, T5, T6>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>,
                                                 fn1: (x: T1) => Promise<T2>,
                                                 fn2: (x: T2) => Promise<T3>,
                                                 fn3: (x: T3) => Promise<T4>,
                                                 fn4: (x: T4) => Promise<T5>,
                                                 fn5: (x: T5) => Promise<T6>): (x0: V0, x1: V1, x2: V2) => Promise<T6>;

        pipeP<V0, T1, T2, T3, T4, T5, T6, T7>(fn0: (x: V0) => Promise<T1>,
                                             fn1: (x: T1) => Promise<T2>,
                                             fn2: (x: T2) => Promise<T3>,
                                             fn3: (x: T3) => Promise<T4>,
                                             fn4: (x: T4) => Promise<T5>,
                                             fn5: (x: T5) => Promise<T6>,
                                             fn: (x: T6) => Promise<T7>): (x: V0) => Promise<T7>;
        pipeP<V0, V1, T1, T2, T3, T4, T5, T6, T7>(fn0: (x0: V0, x1: V1) => Promise<T1>,
                                                 fn1: (x: T1) => Promise<T2>,
                                                 fn2: (x: T2) => Promise<T3>,
                                                 fn3: (x: T3) => Promise<T4>,
                                                 fn4: (x: T4) => Promise<T5>,
                                                 fn5: (x: T5) => Promise<T6>,
                                                 fn6: (x: T6) => Promise<T7>): (x0: V0, x1: V1) => Promise<T7>;
        pipeP<V0, V1, V2, T1, T2, T3, T4, T5, T6, T7>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>,
                                                     fn1: (x: T1) => Promise<T2>,
                                                     fn2: (x: T2) => Promise<T3>,
                                                     fn3: (x: T3) => Promise<T4>,
                                                     fn4: (x: T4) => Promise<T5>,
                                                     fn5: (x: T5) => Promise<T6>,
                                                     fn6: (x: T6) => Promise<T7>): (x0: V0, x1: V1, x2: V2) => Promise<T7>;

        pipeP<V0, T1, T2, T3, T4, T5, T6, T7, T8>(fn0: (x: V0) => Promise<T1>,
                                                 fn1: (x: T1) => Promise<T2>,
                                                 fn2: (x: T2) => Promise<T3>,
                                                 fn3: (x: T3) => Promise<T4>,
                                                 fn4: (x: T4) => Promise<T5>,
                                                 fn5: (x: T5) => Promise<T6>,
                                                 fn6: (x: T6) => Promise<T7>,
                                                 fn: (x: T7) => Promise<T8>): (x: V0) => Promise<T8>;
        pipeP<V0, V1, T1, T2, T3, T4, T5, T6, T7, T8>(fn0: (x0: V0, x1: V1) => Promise<T1>,
                                                     fn1: (x: T1) => Promise<T2>,
                                                     fn2: (x: T2) => Promise<T3>,
                                                     fn3: (x: T3) => Promise<T4>,
                                                     fn4: (x: T4) => Promise<T5>,
                                                     fn5: (x: T5) => Promise<T6>,
                                                     fn6: (x: T5) => Promise<T6>,
                                                     fn7: (x: T7) => Promise<T8>): (x0: V0, x1: V1) => Promise<T8>;
        pipeP<V0, V1, V2, T1, T2, T3, T4, T5, T6, T7, T8>(fn0: (x0: V0, x1: V1, x2: V2) => Promise<T1>,
                                                         fn1: (x: T1) => Promise<T2>,
                                                         fn2: (x: T2) => Promise<T3>,
                                                         fn3: (x: T3) => Promise<T4>,
                                                         fn4: (x: T4) => Promise<T5>,
                                                         fn5: (x: T5) => Promise<T6>,
                                                         fn6: (x: T5) => Promise<T6>,
                                                         fn7: (x: T7) => Promise<T8>): (x0: V0, x1: V1, x2: V2) => Promise<T8>;
  }
}

declare module 'ramda' {
  let ramda: R.Static;
  export = ramda;
}
