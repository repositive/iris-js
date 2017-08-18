export class TimeoutError extends Error {
  constructor(msg?: string) {
    super(msg || 'Timeout');
  }
}

export class RPCError extends Error {
  constructor(msg?: string) {
    super(msg || 'Remote rejection');
  }
}

