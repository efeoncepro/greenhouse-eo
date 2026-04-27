# Payment Logo Inventory

Last updated: 2026-04-27

This inventory mirrors `src/config/payment-instruments.ts` and the auditable manifest in `public/images/logos/payment/manifest.json`. It tracks whether Greenhouse has a verified SVG variant for each payment instrument.

Variant model:

- `full-positive`: complete logo for light surfaces.
- `full-negative`: complete logo for dark surfaces.
- `mark-positive`: compact isotipo/mark for light surfaces.
- `mark-negative`: compact isotipo/mark for dark surfaces.

Status legend:

- `OK`: verified, applied, and present in the manifest.
- `Pending`: no reliable candidate has been approved yet.

| Slug | Brand | Category | Country | Catalog logo | Compact logo | Full + | Full - | Mark + | Mark - | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bci` | BCI | Bank account | CL | `/images/logos/payment/bci.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Needs official source verification. |
| `banco-chile` | Banco de Chile | Bank account | CL | `/images/logos/payment/banco-chile.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Do not confuse with BancoEstado. |
| `banco-estado` | BancoEstado | Bank account | CL | `/images/logos/payment/banco-estado.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Current scraper candidates were not strong enough. |
| `santander` | Santander | Bank account | CL | `/images/logos/payment/Banco_Santander_Logotipo.svg` | `/images/logos/payment/BSAC.svg` | OK | Pending | OK | Pending | User-provided official full logo and isotipo. |
| `scotiabank` | Scotiabank | Bank account | CL | `/images/logos/payment/scotiabank-full-positive.svg` | - | OK | Pending | Pending | Pending | Full logo is official red wordmark. Do not derive mark from this file because it does not include the Scotiabank isotipo. |
| `itau` | Itau | Bank account | CL | `/images/logos/payment/itau.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Needs official source verification. |
| `bice` | BICE | Bank account | CL | `/images/logos/payment/bice.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Needs official source verification. |
| `security` | Banco Security | Bank account | CL | `/images/logos/payment/security.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Needs official source verification. |
| `falabella` | Banco Falabella | Bank account | CL | `/images/logos/payment/falabella-full-positive.svg` | `/images/logos/payment/falabella-mark-positive.svg` | OK | OK | OK | OK | Full negative and isotipos are vector derivations from the verified full SVG. |
| `ripley` | Banco Ripley | Bank account | CL | `/images/logos/payment/ripley-full-positive.svg` | - | OK | Pending | Pending | Pending | Uses official Banco Ripley SVG. Previous false WhatsApp candidate was rejected. |
| `visa` | Visa | Credit card | - | `/images/logos/payment/visa.svg` | `/images/logos/payment/visa-mark-positive.svg` | Pending | Pending | OK | OK | Mark variants from Simple Icons; full variants remain legacy/pending. |
| `mastercard` | Mastercard | Credit card | - | `/images/logos/payment/Mastercard-logo.svg.png` | `/images/logos/payment/Mastercard-Logo.wine.svg` | Pending | Pending | OK | OK | Positive mark is user-provided; negative mark from Simple Icons. |
| `amex` | American Express | Credit card | - | `/images/logos/payment/amex.svg` | `/images/logos/payment/amex-mark-positive.svg` | Pending | Pending | OK | OK | Mark variants from Simple Icons; full variants remain legacy/pending. |
| `paypal` | PayPal | Fintech | - | `/images/logos/payment/paypal.svg` | `/images/logos/payment/paypal-mark-positive.svg` | Pending | Pending | OK | OK | Mark variants from Simple Icons; full variants remain legacy/pending. |
| `wise` | Wise | Fintech | - | `/images/logos/payment/wise.svg` | `/images/logos/payment/wise-mark-positive.svg` | Pending | Pending | OK | OK | Mark variants from Simple Icons; full variants remain legacy/pending. |
| `mercadopago` | MercadoPago | Fintech | - | `/images/logos/payment/mercadopago.svg` | `/images/logos/payment/mercadopago-mark-positive.svg` | Pending | Pending | OK | OK | Mark variants from Simple Icons; full variants remain legacy/pending. |
| `global66` | Global66 | Fintech | - | `/images/logos/payment/global66.svg` | - | Pending | Pending | Pending | Pending | Legacy asset only. Needs official source verification. |
| `deel` | Deel | Payment platform | - | `/images/logos/payment/deel-full-positive.svg` | - | OK | Pending | Pending | Pending | Uses official SVG source. |
| `stripe` | Stripe | Payment platform | - | `/images/logos/payment/stripe.svg` | `/images/logos/payment/stripe-mark-positive.svg` | Pending | Pending | OK | OK | Mark variants from Simple Icons; full variants remain legacy/pending. |
| `previred` | Previred | Payroll processor | CL | `/images/logos/payment/previred-full-positive.svg` | - | OK | Pending | Pending | Pending | Uses official Previred 2025 SVG. |

## Guardrails

- Do not apply candidates that are generic UI/social icons, even when hosted on an official page.
- Chilean banks require brand-distinctive evidence in filename, page metadata, or SVG content before apply.
- If a full logo does not contain the isotipo, mark variants must remain pending until a true mark source is found.
- Generated or AI-assisted assets must remain SVG, preserve provenance, and stay traceable through `manifest.json`.
