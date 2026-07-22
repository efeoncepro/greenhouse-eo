# TASK-1505 — approved Globe Creative Producer source

Status: approved visual and interaction baseline  
Source mode: source-led  
Captured: 2026-07-22  
Owner: Globe / Product Design

## Authority

`approved-prototype.dc.html` is the complete approved target for the Globe
Creative Producer surface. It is not a disposable concept, a screenshot-only
reference, or permission to reduce scope. Runtime implementation may replace
fixtures and local interactions with governed services, but it must preserve
the approved product capabilities and visual hierarchy unless a later explicit
product decision supersedes this baseline.

The original source was copied from:

`/Users/jreye/Documents/Globe/Producer/Suite de IA Generativa Creativa`

## Runnable baseline

Serve this directory over HTTP and open `approved-prototype.dc.html`. The
versioned runnable set contains the HTML, Design Components support runtime,
AXIS bundle/styles/tokens, and the referenced SVG marks. The prototype also
loads the Tabler icon webfont from jsDelivr, so icon rendering depends on
network access; production code must use governed assets and dependencies.

The three source PNGs and `.thumbnail` were inspected as secondary evidence but
are intentionally not the authority: the HTML and its interaction model are.

## Provenance hashes (SHA-256)

The table records the original source bytes. The three SVG files versioned in
this directory have one normalization only: a final newline was added by the
repository patcher. Their rendered content is otherwise byte-identical; their
versioned hashes are listed in the note below.

| Source file | SHA-256 |
|---|---|
| `Globe Creative Producer.dc.html` | `7d0d689b7daeb6e409ae01c1bf478d700ea09059e0f20f7da3c85a53bb10e93f` |
| `support.js` | `c60c49083997f51a592df118c0068475337afd20b8cfd8e1cd9d5eb0c7e254f6` |
| `_ds/.../_ds_bundle.js` | `f30b9043547171b05689caa5c70e92e34999790f005b516ff6c13de7f1747240` |
| `_ds/.../styles.css` | `abdc3215602f51135b58ab9b0ab85cacdc7eb69ec3ee7d9f2d6e4f9da6498d5a` |
| `assets/isotipo-globe-negativo.svg` | `14de5af58e69085f26f71d2518713ce9bc6f69c771bc2f7a7e88112c24fca541` |
| `assets/efeonce-negative.svg` | `6a6b0c803c8ba7d2e545539bf62a5f4c3c2a34174e22447aee41f01c8a162694` |
| `assets/globe-negativo.svg` | `701bb7c493c578731ace16eca5b36041373bc5d3c92f3ebd48c759d2f1a82dbd` |

Versioned normalized SVG hashes: `isotipo-globe-negativo.svg`
`5df03e0a0d7525cf4abde35c1e9bf9e8071cbd175302931d6faa670e773dc626`,
`efeonce-negative.svg`
`c41a5363533114d6c41072b7005e657d45d4e5e5ea717ed736e4e3f5bd59cc41`,
and `globe-negativo.svg`
`7136274b88d855f8ecef6ba3f0783adcef5eaf2c4304eee341b44e5d40862be3`.

## Implementation interpretation

- Preserve the full image, video, and audio composer; feed/library; candidate
  viewer; lineage; review; bulk; sharing; budget; onboarding; shortcuts; and
  workspace interactions represented by the approved source.
- Replace every fixture, local timer, local estimate, local rights decision,
  unconditional C2PA claim, and toast-only command with canonical readers,
  commands, evidence, and durable state.
- Map literals to Globe/AXIS tokens and reusable primitives. The prototype's
  inline styles are evidence of appearance and behavior, not production code.
- Fix the verified mobile overflow (`scrollWidth 630` at a `390` px viewport),
  dialog/tab/focus/selection accessibility gaps, destructive-action recovery,
  and invented progress without changing the approved information architecture.
- Use GVC desktop and 390 px scenarios, an approved baseline promotion, a review
  dossier, and the premium scorecard before declaring UI acceptance.

Canonical direction, flow, motion, wireframe, dependencies, and deviations are
tracked by the `TASK-1505` artifacts under `docs/ui/` and `docs/tasks/`.
