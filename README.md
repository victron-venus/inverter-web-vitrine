# inverter-web-vitrine

Public, **read-only** status page for a Victron plant — a thin web UI that talks to [`inverter-gateway`](https://github.com/victron-venus/inverter-gateway) through a same-origin proxy (here.now today; any static host + edge proxy works the same way).

**Live demo:** [https://inverter.alvit.here.now/](https://inverter.alvit.here.now/)

## Why this exists

The rest of the stack (`inverter-dashboard`, `inverter-dashboard-go`, `inverter-control`, `inverter-desktop`) is great on LAN / VPN. This repo answers a different question:

> Can we **safely expose a slice of live energy data on the public web** without opening the home network?

Yes — if the browser never talks to Cerbo or MQTT directly, and the only public surface is a hardened gateway.

## What it is

| Layer | Role |
| --- | --- |
| Browser | Static HTML; polls `/api/gateway/health` + `/api/gateway/snapshot` |
| Edge proxy (here.now) | Same-origin routes → `inverter-gateway` HTTPS upstream; injects Access + API credentials from **server-side variables** |
| Cloudflare Access | Service-token auth in front of the tunnel hostname |
| [`inverter-gateway`](https://github.com/victron-venus/inverter-gateway) | Read-only HTTPS API over Cerbo MQTT (health, snapshot, …) |
| Cerbo / Venus OS | Stays on LAN — never exposed |

Architecture sketch:

```text
Browser  →  static site + /api/gateway/* proxy
                 ↓  (CF Access service token + gateway bearer — never in the page)
         inverter-gateway  →  Cerbo MQTT (LAN)
```

Companion Terraform for Access: [`terraform-cloudflare-inverter-gateway`](https://github.com/victron-venus/terraform-cloudflare-inverter-gateway).

## Benefits

- **No inbound ports** to the house — egress tunnel + Access, not port-forwarding.
- **Read-only contract** — the vitrine only needs health + snapshot; control planes stay private.
- **Secrets stay off the client** — CF Access client id/secret and the gateway API token live in host variables (`${CF_ACCESS_CLIENT_ID}`, …), not in git or `index.html`.
- **Portable pattern** — same HTML works behind here.now, Cloudflare Workers, Caddy, or nginx; swap the proxy, keep the UI.
- **Org coverage** — shows how `inverter-gateway` is meant to be consumed from the public internet, not only from desktop/LAN apps.

## Nice to have

- A **shareable URL** for “is the plant up?” without VPN.
- A **reference implementation** for other read-only exports (weather, tank levels, …) on the same gateway + Access pattern.
- A clean **portfolio piece** for the `victron-venus` org: gateway → Zero Trust → public UI.

## What’s in this repo

- `index.html` — vitrine UI (polls the proxy every ~15s).
- `.herenow/proxy.json.example` — example same-origin proxy routes (variable placeholders only).
- `snapshot.example.json` — documented JSON shape (zeros; not live plant data).

## What is intentionally not here

- API tokens, Cloudflare Access credentials, tunnel tokens
- LAN addresses, Tailscale/ZeroTier notes, private hostnames
- Write/control endpoints

Configure secrets in your host’s variable store (for here.now: account/workspace variables pinned to the gateway upstream host). Copy `proxy.json.example` → `.herenow/proxy.json` (gitignored) when publishing.

## Related

- [`inverter-gateway`](https://github.com/victron-venus/inverter-gateway) — the API this page consumes
- [`terraform-cloudflare-inverter-gateway`](https://github.com/victron-venus/terraform-cloudflare-inverter-gateway) — Access / Zero Trust in front of the gateway
- [`inverter-dashboard`](https://github.com/victron-venus/inverter-dashboard) / [`inverter-dashboard-go`](https://github.com/victron-venus/inverter-dashboard-go) — full LAN dashboards
- [`inverter-control`](https://github.com/victron-venus/inverter-control) — control plane (not exposed here)
- [`inverter-desktop`](https://github.com/victron-venus/inverter-desktop) — desktop client

## License

MIT (via org template when the GitHub repo is created).
