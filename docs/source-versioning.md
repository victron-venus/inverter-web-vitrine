# Source versions and upgrades

This reusable static page is delivered as reviewed source commits. Each accepted
source version has a unique full Git commit SHA; deploy an immutable commit, record
that SHA beside the deployment, and retain the previous page/proxy configuration
for rollback. The project currently has no binary or semantic-version release
channel. A successful validation job does not publish the page.

[CHANGELOG.md](../CHANGELOG.md) summarizes the current source delivery and upgrade
impact. Future user-visible source changes must add a dated entry in the same
pull request. Include known vulnerability identifiers for fixes when assigned.
Git history supplies authorship and exact diffs in addition to these notes.

Copy the committed index.html to your static host. Configure only the two exact
GET routes in the example proxy, with independent secrets held on the server and
HTTPS certificate verification enabled. Do not expose a wildcard gateway proxy.
Check actual host behavior and selected public fields before publishing; the
source test fixture cannot certify the deployment.
