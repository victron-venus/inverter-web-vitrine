# Screenshot artwork

The source is this repository's actual `index.html` at commit `7bde23d055e25cbc9e3bd6edf5d84f89f403d5e7`, rendered by Chrome at 1280 × 720. A local fixture answered the two gateway API routes with synthetic values. No live gateway, device, token, or customer telemetry was used. The connected label is part of the simulated response, not a claim about a live installation.

`vitrine-demo.jpg` is the retained flat source. Its SHA-256 is
`2e1c0e69ea88af3abc1c77afe3f1ceb7c8889b7c2bb5e9ef3e1cc748afc4f5f2`.
The README links the perspective hero to this source for readable detail.

`app-hero.png` applies only a geometric perspective projection, rounded outer
corners and a soft shadow on a neutral background. No interface text, controls,
charts or readings are generated or repainted. This artwork is documentation,
not test or release acceptance evidence.

## Regenerate

Install ImageMagick 7, then run from the repository root:

```sh
bash scripts/render-docs-hero.sh
```

The output is a static 1600 × 1050 PNG. The script checks source dimensions,
uses a temporary directory, strips metadata and replaces the hero only after a
successful render. Same source and ImageMagick version produce identical output;
resampling can differ across versions. Initially rendered with ImageMagick 7.1.2-31.

When replacing a screenshot, use synthetic or explicitly public data, record the
application version, review the complete flat image for private information,
and update this provenance and the README caption before regenerating.
