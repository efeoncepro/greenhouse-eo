# High Frequency — release package

This folder contains eighteen campaign JPEG assets across six formats plus six professional motion deliverables.

| Folder | Use | Dimensions |
|---|---|---:|
| `4x5/` | Meta/LinkedIn feed creative | 1080×1350 |
| `9x16/` | Meta Stories/Reels creative | 1080×1920 |
| `3x1/` | Wide display/campaign banner | 1800×600 |
| `16x9/` | Digital landscape/end card | 1920×1080 |
| `a2/` | A2 portrait print production proof | 3508×4961 · 300 ppi |
| `ooh-3x1/` | Static OOH production proof | 6000×2000 · 150 ppi |
| `motion/` | 15 s heroes + 10 s masters + 6 s bumpers, 9:16/16:9 | hero raster 1080×1920 / 1920×1080; source masters 720p |

`asset-matrix.csv` contains filenames, dimensions, exact copy and alt text. Digital deliverables are
sRGB JPEGs under 5 MB. The 9:16 composition protects the top 12% and bottom 20% interface zones.

The A2 and OOH files are deliberately labeled **production proofs**, not press-ready masters. They preserve
the campaign composition at high resolution, but final production must apply the printer/media owner's ICC
profile, physical dimensions, bleed, trim, substrate and ink limits. Delivering generic CMYK without the vendor
profile would create false prepress confidence.

These assets are **creative-ready**, not media-activated. Audience, objective, landing page, UTM convention, trafficking, conversion event, budget, legal approval and experiment cells must be completed before launch.

Release V3 contains 18 stills and six motion files: two 15 s heroes, two 10 s masters and two 6 s
bumpers. The immutable ZIP SHA-256 is
`13a84dbbffd9be389c2304fbc5360c3410cd5d91b2a45e5b14ae372e2322d24b`. The 3.008 s Omni technical
probe is not packaged and its USD 0.390 cost is excluded from the USD 2.965 release path. The heroes add
USD 0 of model inference and include a deterministic 4:5 + 9:16 + 16:9 format wall.

Loudness/peak are measured for all six MP4s. Only the heroes are normalized near −16 LUFS; masters and
bumpers remain measurement-only reference mixes and require a human listening/normalization pass if trafficked.
Seedance reference-to-video was the planned fidelity fallback, but it was not invoked because both Gemini Omni
clean masters passed temporal review.
