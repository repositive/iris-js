export interface SerializationOpts<T> {
  serialize: (o: T) => Buffer;
  parse: (b: Buffer) => T;
}

// TODO This should be SerializationOptions of type <JSON> check how to do this.
export function serialize(o: any) {
  return Buffer.from(JSON.stringify(o));
}

export function parse(b?: Buffer) {
  if (!b || b.length === 0) {
    return undefined;
  } else {
    return JSON.parse(b.toString());
  }
}
