# Source changelog

## 2026-10-24 CI reliability

- Pin CodeRabbit Autofix to the reviewed toolkit revision with bounded retries
  for temporary GitHub metadata-read failures, including truncated JSON and
  refused connections. Each GET has at most three attempts and a 30-second
  timeout; progress is visible in the Actions log.
- Keep permission/rate-limit errors fail-fast and comment POST requests
  single-attempt. After an uncertain write, inspect the existing Autofix marker
  before retrying. See the [toolkit recovery guide](https://github.com/victron-venus/venus-os-ci-toolkit/blob/d24d978fe3e07c4342742af2ca5af83f7c3e7714/docs/CODERABBIT.md#request-autofix-after-a-completed-review).

Upgrade: merge the workflow pin onto the default branch to activate it for new
CodeRabbit events. No application redeployment or data migration is required.
Security: no assigned runtime vulnerability is fixed by this update.

## 2026-10-21 source delivery

- Ignore superseded snapshot responses and failures, including delayed JSON
  bodies. Only an accepted snapshot changes measurements and their update time.
- Apply independent health results without replaying a full poll's older
  snapshot or clearing a newer snapshot error. Keep existing pending-health and
  failure behavior across snapshot-only polls.
- Add deterministic response-order regressions and real-browser checks for late
  snapshots and slow full polls across the existing browser matrix.

Upgrade: use the accepted full commit SHA. Poll intervals and proxy routes stay
the same. This validation-only project has no beta/RC artifacts and is not
deployed automatically; retain the previous accepted SHA for rollback.

Security: this is a display consistency fix, with no assigned vulnerability ID.

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

Project links now use explicit zero tab stops; keyboard tests require forward navigation through all five and backward navigation on every supported browser.
