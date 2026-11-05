// Compile-only contracts for the HTTP operations used by the proxy.
declare const request: Request;
const headers = new Headers(request.headers);
headers.delete("host");
headers.set("authorization", "Bearer fixture");
const _origin: string | null = headers.get("origin");
const response = new Response(request.body, { status: 201, headers });
const _responseBody: ProxyByteStream | null = response.body;
new Response("offline", { status: 502, headers });
new URL(request.url);
fetch(request.url, { method: request.method, headers, body: request.body, redirect: "follow" });

// @ts-expect-error Header values must be strings.
headers.set("authorization", false);
// @ts-expect-error Headers cannot be copied from a number.
new Headers(123);
// @ts-expect-error A status must be a number.
new Response(null, { status: "200" });
// @ts-expect-error A body must be text or the unmodified byte stream.
new Response(123);
// @ts-expect-error Arbitrary objects cannot masquerade as streams.
fetch(request.url, { method: "POST", body: { locked: true } });
// @ts-expect-error Redirect modes are finite.
fetch(request.url, { redirect: "sometimes" });
// @ts-expect-error URL parsing requires a string.
new URL(123);
// @ts-expect-error Fetch handlers must return a Response.
const _invalidHandler = { fetch: async () => "wrong" } satisfies {
  fetch(request: Request): Promise<Response>;
};
