export interface SerializationOpts<T> {
  serialize: (o: T) => Buffer;
  parse: (b: Buffer) => T;
}

export function serialize(o?: any) {
  if (o === undefined) {
    return Buffer.alloc(0);
  } else {
    return Buffer.from(JSON.stringify(o));
  }
}

export function parse(b?: Buffer) {
  if (!b || b.length === 0) {
    return undefined;
  } else {
    return JSON.parse(b.toString());
  }
}
