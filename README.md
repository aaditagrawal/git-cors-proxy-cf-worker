# git-cors-proxy-cf-worker

A lightweight Cloudflare Worker that proxies git HTTP requests with CORS headers. Built for [dgit](https://github.com/aaditagrawal/dgit) to enable browser-based git clones via isomorphic-git.

(I got rate limited by a third party proxy, so I rolled my own since it's easy with CF Workers.)

## How it works

Browsers block cross-origin git HTTP requests. This worker sits in between, forwarding requests to the target git server and adding the necessary CORS headers to the response.

Supports any git host — GitHub, GitLab, Bitbucket, Forgejo, Gitea, self-hosted, etc.

## URL format

```
https://<worker-domain>/<target-url>
```

isomorphic-git strips the protocol, so both formats work:

```
https://worker.dev/https://github.com/user/repo.git/info/refs
https://worker.dev/github.com/user/repo.git/info/refs
```

## Deploy

```bash
bun install
bunx wrangler login   # first time only
bun run deploy
```

## Develop locally

```bash
bun run dev
# runs at http://localhost:8787
```

Typechecking uses the app-local HTTP declarations in `src/http.d.ts`. These cover only the APIs this Worker consumes, not the full Workers API. The handler emits the same JavaScript. Extend the declarations and `tests/http.types.ts` together when adding APIs.

```bash
bun run test:types
bun scripts/benchmark-types.mjs --output /tmp/git-cors-types-performance.json
```

The benchmark compares typechecking with the PR base using the pinned Bun version, an offline frozen baseline install, two warmup pairs, and alternating samples. It records wall time, child CPU time, memory, and emitted JavaScript equality.

## Usage with isomorphic-git

```js
await git.clone({
  corsProxy: 'https://your-worker.workers.dev',
  url: 'https://github.com/user/repo.git',
  // ...
})
```
