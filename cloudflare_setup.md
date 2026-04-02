# Cloudflare Tunnel Setup for Athanor Platform

How we exposed the locally-running Athanor Next.js app via Cloudflare Tunnel for remote browser testing.

---

## 1. Clone the repo and check out the implementation branch

```bash
git clone https://github.com/athanor-ai/athanor.git
cd athanor
git checkout cofounder-cto/scaffold-athanor-platform
```

## 2. Install dependencies

```bash
bun install
```

## 3. Why the dev server was not enough

Running `bun run dev` starts the Next.js development server on `localhost:3000`. This works fine locally but caused problems when exposed through the Cloudflare Tunnel:

- **Blank pages / 500 errors** — the dev server relies on WebSocket-based HMR and on-the-fly compilation that breaks behind the tunnel proxy.
- The dev server is not optimized for serving full pages to external clients and frequently returned incomplete responses.

**Bottom line:** the dev server is meant for local iteration, not for proxied or remote access.

## 4. Build and run in production mode

```bash
bun run build
bun run start
```

This compiles all pages ahead of time and starts a stable production server on `localhost:3000`. Production mode resolved every rendering issue we saw with the dev server.

## 5. Expose with Cloudflare Tunnel

In a separate terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

`cloudflared` prints a public `*.trycloudflare.com` URL. No Cloudflare account or DNS configuration is required — this uses Cloudflare's quick-tunnel feature.

## 6. Verify the public URL

Open the printed URL in your own browser first and confirm the page loads correctly before sharing it for remote testing.

## 7. Use the URL for remote browser testing

Pass the public URL to any remote browser, device, or automated test runner. The tunnel stays active as long as the `cloudflared` process is running.

---

## Failure modes we encountered

| Symptom | Cause | Fix |
|---------|-------|-----|
| **502 Bad Gateway** | `cloudflared` was running but nothing was listening on `localhost:3000` | Start the app (`bun run start`) **before** launching the tunnel |
| **Blank page / 500 errors** | Tunnel was pointing at the Next.js dev server (`bun run dev`) | Use production mode (`bun run build && bun run start`) instead |
| **Intermittent 502s** | Build was still in progress when the tunnel was started | Wait for `bun run start` to print "Ready" before launching `cloudflared` |

---

## Quick-start (copy-paste)

```bash
# 1. Clone & checkout
git clone https://github.com/athanor-ai/athanor.git
cd athanor
git checkout cofounder-cto/scaffold-athanor-platform

# 2. Install
bun install

# 3. Build & serve
bun run build
bun run start          # wait for "Ready" output

# 4. In a second terminal — expose
cloudflared tunnel --url http://localhost:3000
```
