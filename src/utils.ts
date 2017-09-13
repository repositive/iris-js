export interface JSObj {[k: string]: any; }

export type F<I, O> = (input: I) => O;

export function inject<A extends JSObj, I extends JSObj, O>({
    args,
    func
}: {
    args: A,
    func: F<I & A, O>
}): F<I, O> {
  return function(input: I): O {
    return func(Object.assign({}, args, input));
  };
}
