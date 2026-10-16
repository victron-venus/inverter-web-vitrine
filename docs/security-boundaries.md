# Security and analysis boundaries

The browser code is public and read-only. It requests only relative
`/api/gateway/health` and `/api/gateway/snapshot` endpoints. It never receives
gateway/Cloudflare credentials. The `.herenow/proxy.json.example` file contains
placeholders and exact HTTPS upstream GET routes; actual host credentials and
configuration are private and must not enter the served files. Restrict proxy
methods/routes and preserve HTTPS certificate verification at the host.

A snapshot is public telemetry, potentially revealing occupancy. Choose which
fields to publish. Text status is assigned with textContent. Numeric output is
converted through Number before fixed markup is added; a supplied HTML string
cannot become executable markup. Real browser tests verify this and prohibit
unexpected network requests. Old health responses cannot overwrite newer state.

The maintained application does not implement cryptographic primitives or user
password storage. Browsers and the separately administered HTTPS host terminate
TLS. Its Python/JavaScript validation helpers operate on local synthetic data;
Node SHA-256 binds the tested page identity. GitHub HTTPS delivers source. No
claim is made that a source-level test validates a live proxy's key lengths,
secret handling or deployment.

CodeQL analyzes maintained JavaScript, Python and Actions. Source checks, VM
behavioral tests and nine real-browser scenarios complement analysis. A full
statement/branch-coverage measurement and a current fuzzing campaign have not
been established. Hardware and production endpoints are never used by CI.

See [SECURITY.md](../SECURITY.md), [governance](../GOVERNANCE.md) and the
[roadmap](roadmap.md). No backup maintainer or tested one-week recovery exists.
