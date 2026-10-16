# Source changelog

## 2026-10-16 source delivery

- Correct the real keyboard-navigation browser check: macOS WebKit uses
  Option+Tab; Windows and Linux use Tab. All platforms still must focus the
  gateway link through a keyboard event. No browser target was removed.
- Document maintainer responsibilities, conduct reporting, source versioning
  and the roadmap through October 2027.

Upgrade: update to the accepted full commit SHA. This source delivery changes
validation and documentation; the rendered page and proxy routes are unchanged.
No deployment occurs automatically. Keep the previous accepted SHA for rollback.

Security: no assigned runtime vulnerability is fixed by this update.

## Prior source baseline (through fe8dad838d9b80020627c744d2931d0c03faac2a)

- Add real-browser coverage for telemetry, health polling, stale responses,
  untrusted status text, mobile layout and keyboard navigation.
- Retain the last confirmed gateway health between snapshot-only polls, clear
  optimistic health when a health check begins, and ignore superseded responses.

Upgrade: use a reviewed immutable source version and recheck proxy secrets, exact
read-only routes and chosen public fields at the host. No data migration applies.
Security: no public vulnerability identifier was assigned to these changes.
