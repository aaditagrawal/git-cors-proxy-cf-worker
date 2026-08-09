export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const target = extractTarget(request.url);
    if (!target) {
      return new Response("Usage: /<target-url>", {
        status: 400,
        headers: corsHeaders(),
      });
    }

    try {
      new URL(target);
    } catch {
      return new Response("Invalid target URL", {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete("host");
    proxyHeaders.delete("origin");
    proxyHeaders.delete("referer");

    const resp = await fetch(target, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "follow",
    });

    const responseHeaders = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders())) {
      responseHeaders.set(k, v);
    }

    return new Response(resp.body, {
      status: resp.status,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler;

function extractTarget(workerUrl: string): string | null {
  // isomorphic-git strips the protocol: /github.com/user/repo.git/...
  // but direct usage keeps it: /https://github.com/user/repo.git/...
  const withProto = workerUrl.match(/^https?:\/\/[^/]+(\/https?:\/\/.+)$/);
  if (withProto) return withProto[1].slice(1);

  const withoutProto = workerUrl.match(/^https?:\/\/[^/]+\/(.+)$/);
  if (withoutProto) return "https://" + withoutProto[1];

  return null;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-expose-headers": "*",
  };
}
