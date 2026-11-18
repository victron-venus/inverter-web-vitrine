# Documentation

A static presentation page for the inverter projects, with its browser
compatibility, security boundaries and source versioning.

## The page

- [Source versions and upgrades](source-versioning.md) — how a reviewed source commit becomes the delivered page.
- [Browser compatibility](browser-compatibility.md) — the shared TypeScript/browser pipeline the validation workflow calls.
- [Screenshot artwork](images/README.md) — the actual `index.html` capture and its source commit.
- [Security and analysis boundaries](security-boundaries.md) — what the browser code does and the only requests it makes.
- [Roadmap through October 2027](roadmap.md) — the compatibility and interface priorities.

## Assurance and release

- [OpenSSF Best Practices evidence: inverter-web-vitrine](openssf-evidence.md) — the index behind the assessment.
- [CI and release policy](CI_WORKFLOW.md) — the validation-only policy and its events.
- [Release helper TLS profile](release-tls-profile.md) — the qualified `gh` transport profile.
- [CI and release operations](release-workflow.md) — `.release-policy.json` and the required status.
