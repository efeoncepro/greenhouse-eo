# Demo 35 Blog Magazine

Operational reference for the future WordPress blog home candidate. Canonical
evidence: `docs/audits/public-site/2026-08-22-demo35-elementor-runtime-contract.md`.

## Identity and role

- Source page: `225984`, `Demo 35: Blog Magazine`, publish.
- URL: `https://efeoncepro.com/homedemo35-elementor/`.
- It is a normal Elementor `page`, not the WordPress posts archive.
- Current blog page: `18456`, canonical `https://efeoncepro.com/blog/`.
- Runtime observed 2026-08-22: WordPress `7.1`, Ohio `3.7.0`, Elementor
  `4.2.3`, Elementor Pro `4.2.2`, Ohio Extra `3.7.0`.
- Keep `page_for_posts=0`. Assigning this page as the posts page makes
  WordPress ignore its Elementor content and render the Ohio archive template.

Source guards:

```text
roots=7 nodes=113 containers=55 widgets=58 ohio_recent_posts=15
elementor_data_sha256=e63a70342e2cb83fae341637968ac05ccb30d0679438e143b8a8f3b047537394
elementor_settings_sha256=36761a168eb691d20edf88ace3d06fb63ec9112f257ac2f20fce1afdc331b40b
```

Treat IDs and hashes as source diagnostics. A legitimate clone will produce
new IDs/hashes; address it by path + element type + fingerprint.

## Seven-root composition

| Root | Role | Contract |
| --- | --- | --- |
| `f4e20e4` | Hero | heading/copy/anchor CTA + featured post |
| `6c7ed5e` | Top Headlines | CSS ID `top_headlines`, 75/25 main/rail |
| `b800f9b` | Science feature | full bleed image, content width 38% |
| `51f2ec7` | Categories/In Brief/Staff Picks | category row then 75/25 and staff row |
| `59f0fbb` | Goal feature | full bleed image + translateY background motion |
| `1a02c7d` | Don't Miss It | 75/25 main/rail |
| `449646c` | Subscription | `#D4CBA8`, `clb__dark_mode_light`, CF7 widget |

Desktop uses the Ohio 86vw central container and full-width feature roots.
Mobile stacks the rails and four category banners to 350px inside 20px gutters.
The authenticated mobile admin bar can widen the document to 440px; distinguish
that from Elementor overflow and recheck anonymously.

## Widget contracts

- `ohio_recent_posts` x15: 14 have fixed `posts`; five references are media
  attachments. Empty widgets: `bec16ae`, `cb38ece`, `39ce29e`, `d5477e5`.
  Mixed lists `3bd665e` and `0e874e4` each lose one slot.
- `ohio_heading` x14: section title/subtitle/heading tag and local typography.
- `ohio_button` x8: five “See More” controls have no link and render `#`.
- `ohio_banner` x4: inner/equal-height/scale cards for Tech, Podcasts, Social,
  Careers. All `/demo35/category/*` destinations are `404`.
- `divider` x10 and `text-editor` x4 support section rhythm/copy.
- `ohio_badge` x2 labels the two feature sections.
- `ohio_contact_form#7740c26`: Elementor `form=5`, rendered CF7 `242255`.

Recent-post mapping and exact fixed IDs live in the canonical audit. Before
deleting demo content, classify every instance as `manual`, `query`, or
`remove`. Do not bulk-clear `posts`: the widget's fallback query can produce
uncontrolled editorial results.

## Ohio shell dependency

The source uses default template with header title, breadcrumbs and top padding
disabled. Other header/footer/sidebar controls inherit Ohio. `/blog/` currently
renders a different Ohio shell (`with-header-6` with sidebar) while Demo 35 uses
`with-header-3`. Copying the Elementor tree alone is insufficient.

Snapshot and deliberately preserve or set:

- Elementor document settings and edit/template metas;
- Ohio `page_*` metas, template and featured image;
- page identity, slug, Yoast metadata, menu references and redirects.

## Future mutation sequence

1. Run SSH preflight and inspect source `225984` plus destination `18456`.
2. Keep source published and create a governed draft/clone for adaptation.
3. Never set it as `page_for_posts`; preserve one canonical `/blog/` URL.
4. Resolve recent-post sources before deleting Ohio demo posts/attachments.
5. Replace demo copy/assets, category links, five `#` links, Ohio external
   feature links and the subscription contract.
6. Save through Elementor `Document::save([elements, settings])`; never write
   `_elementor_data` directly. Preserve Ohio metas outside the tree.
7. Regenerate Elementor CSS and purge Kinsta only after authorized mutation.
8. Verify anonymous 1440/390 render, roots/sections/cards, header/footer,
   internal 404s, console, reduced motion, form and horizontal overflow.

No source page, blog page, option, form or cache was changed during the
2026-08-22 discovery.

