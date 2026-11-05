// Only the standard HTTP APIs consumed by this binding-free Worker are declared here.
// A stream is handed through unchanged. Its brand prevents other objects being used as bodies.
declare const byteStream: unique symbol;
interface ProxyByteStream {
  readonly [byteStream]: true;
}

interface ProxyCorsHeaders {
  "access-control-allow-origin": string;
  "access-control-allow-methods": string;
  "access-control-allow-headers": string;
  "access-control-expose-headers": string;
}

declare class Headers {
  constructor(init?: Headers | ProxyCorsHeaders);
  get(name: string): string | null;
  set(name: string, value: string): void;
  delete(name: string): void;
}

interface Request {
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  readonly body: ProxyByteStream | null;
}

interface ProxyResponseOptions {
  status?: number;
  headers?: Headers | ProxyCorsHeaders;
}

declare class Response {
  constructor(body?: string | ProxyByteStream | null, init?: ProxyResponseOptions);
  readonly status: number;
  readonly headers: Headers;
  readonly body: ProxyByteStream | null;
}

declare class URL {
  constructor(input: string);
  readonly href: string;
}

interface ProxyFetchOptions {
  method?: string;
  headers?: Headers;
  body?: ProxyByteStream | null;
  redirect?: "error" | "follow" | "manual";
}

declare function fetch(input: string, init?: ProxyFetchOptions): Promise<Response>;
