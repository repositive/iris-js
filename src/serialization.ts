export interface SerializationOpts<T> {
  serialize: (o: T) => Buffer;
  parse: (b: Buffer) => T;
}

// TODO This should be SerializationOptions of type <JSON> check how to do this.
const serialization: SerializationOpts<any> = {
  serialize(o: any) {
    return Buffer.from(JSON.stringify(o));
  },
  parse(b: Buffer) {
    if (b.length === 0) {
      return undefined;
    } else {
      return JSON.parse(b.toString());
    }
  }
};

export default serialization;
