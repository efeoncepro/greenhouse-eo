# Licitación / Propuesta — ajinomoto-lic-962

> **Estado:** borrador · **Deadline:** <YYYY-MM-DD> · **Origen:** <public_tender | private_rfp | direct_sales>
> **Proposal (Studio):** <proposal_id cuando exista> · **Owner:** <nombre> · **Creado:** 2026-08-11

Workspace interno del deal (el "DSR interno"). Las FUENTES viven acá como archivos git; las
SALIDAS versionadas (PDF renderizados) y la quote viven en el aggregate `Proposal`, que referencia
esta carpeta por `proposal_id`. Contrato de la carpeta: `../TENDER_WORKSPACE_TEMPLATE.md`.

## Artefactos

### ➡️ Client-facing (van al cliente — el `.md` es la FUENTE, el PDF se re-emite)

- `oferta-tecnica.md` — narrativa + ledger de evidencia (template canónico ya copiado).
- `oferta-economica.md` — la económica (ver `pricing-garantias-finance.md` de la skill).
- `deck-plan.json` — fuente de composición del deck (`pnpm deck:compose <plan>`).
- `anexos/` — administrativos (declaraciones, poderes, certificados).
- `artifact-manifest.json` — punteros a artefactos VIVOS (Radiografía, Grader) — por enlace.

### 🔒 INTERNOS — NUNCA van al cliente

- `research/` — diagnóstico, benchmark, VoC, fuentes crudas.
- `*-INTERNO.md` — squad-blueprint (loaded cost + piso), matriz de admisibilidad si aplica.

### Fuente normativa

- `bases/` — el RFP, bases admin/técnica/económica, aclaraciones del foro. **Manda sobre todo.**

## Qué falta

- [ ] Cargar el RFP en `bases/`.
- [ ] Correr admisibilidad + bid/no-bid (skill `greenhouse-public-private-tenders`).
- [ ] Investigación en `research/`; cifras al ledger de `oferta-tecnica.md`.
- [ ] Registrar artefactos vivos en `artifact-manifest.json`.
- [ ] Autorar `deck-plan.json` DESDE la oferta técnica; `pnpm deck:compose`.
- [ ] Mantener `proposal-studio.json` actualizado; `deck:compose` solo produce una salida de taller.
- [ ] Registrar el deal como `Proposal` en el Studio y adjuntar las salidas.
