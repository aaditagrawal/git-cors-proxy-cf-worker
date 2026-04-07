# gitcorsworker-cf

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

## Usage with isomorphic-git

```js
await git.clone({
  corsProxy: 'https://your-worker.workers.dev',
  url: 'https://github.com/user/repo.git',
  // ...
})
```
