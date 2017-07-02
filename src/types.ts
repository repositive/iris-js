export type Pattern = {[k: string]: string};

export interface LibOptions {
  url: string;
  exchange: string;
}

export class RCPError extends Error {
  constructor(msg: string) {
    super(msg);
  }

  write() {
    return `{
      "_type": "RCPError",
      "error": ${this.message}
    }`;
  }
}
