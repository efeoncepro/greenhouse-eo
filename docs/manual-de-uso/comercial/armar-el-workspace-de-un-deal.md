# Armar el workspace de una licitación/propuesta (el "DSR interno")

> **Tipo de documento:** Manual de uso (runbook operador)
> **Versión:** 1.0
> **Creado:** 2026-07-15 por Claude
> **Última actualización:** 2026-07-15 por Claude
> **Contrato técnico:** [TENDER_WORKSPACE_TEMPLATE.md](../../commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md) · [ARTIFACT_MANIFEST_SCHEMA.md](../../commercial/tenders/ARTIFACT_MANIFEST_SCHEMA.md) · [funcional](../../documentation/comercial/digital-sales-room-y-workspace-del-deal.md)

## Para qué sirve

Para arrancar una licitación o propuesta nueva con **toda la estructura en su lugar**, sin olvidar una
carpeta (la de investigación, el manifiesto de artefactos) ni mezclar lo interno con lo que va al
cliente. Es el punto de partida de cualquier deal: primero la carpeta, después la oferta, después el deck.

## Antes de empezar

- Trabajás desde el repo `greenhouse-eo` (las fuentes son archivos git).
- Necesitás el **slug** del deal en kebab-case: `<cliente>-<servicio>-<año>` (ej. `sky-blog-2027`).

## Paso a paso

### 1. Crear el workspace

```bash
pnpm tender:new <slug>
```

Crea `docs/commercial/tenders/<slug>/` con la estructura canónica y te deja un `README.md` adentro con la
checklist. No sobrescribe si ya existe.

### 2. Cargar las bases

Poné el RFP y las bases (administrativas, técnicas, económicas) en **`bases/`**. Es la fuente normativa:
manda sobre todo lo demás. Si hay aclaraciones del foro, van también acá.

### 3. Admisibilidad + bid/no-bid

Antes de escribir la oferta: corré el checklist de admisibilidad y la decisión bid/no-bid (pedíselo a un
agente con la skill `greenhouse-public-private-tenders`). **Nunca un GO sin margen sobre loaded cost.**

### 4. Investigación

La investigación (diagnóstico, benchmark de competencia, voz del cliente, fuentes) va en **`research/`**.
🔒 Es interna — **nunca** cruza al cliente. Las cifras que salgan de acá y vayan a la oferta se anotan en
el ledger de evidencia (paso 5).

### 5. Escribir la oferta técnica

El archivo **`oferta-tecnica.md`** ya viene copiado del template. Se llena en dos zonas:

- **Zona 0 — Ledger de evidencia (primero):** cada cifra/dato con su fuente googleable + fecha. Sin
  fuente, no entra. El evaluador va a buscar la fuente — si no la encuentra, se cae todo lo demás.
- **Zona 1 — Narrativa:** las secciones (resumen, diagnóstico, enfoque, equipo, SLA…). Usá las que
  puntúen en ESA licitación; borrá las que no apliquen. Ninguna cifra que no esté en el ledger.

### 6. Registrar los artefactos vivos

En **`artifact-manifest.json`** anotá las piezas que **no son archivos**: la Radiografía AEO, el informe
del Brand Visibility Grader, un dashboard o demo. Se guardan **por enlace, nunca por captura**
(`render: "by_link"`). Cada uno anota qué evidencia respalda y dónde se usa. Borrá el ejemplo que trae.

### 7. Armar el deck

El **`deck-plan.json`** es la fuente del deck. Se autora **desde** la oferta técnica (no se auto-genera):
elegís qué secciones se vuelven lámina. Después:

```bash
pnpm deck:compose docs/commercial/tenders/<slug>/deck-plan.json
```

### 8. Registrar el deal como Proposal

Cuando la oferta esté lista, registrá el deal en el Proposal Studio y adjuntá las salidas (el PDF del
deck, las ofertas). Ahí quedan versionadas y descargables desde el portal `/admin/commercial/proposals`.

## Qué significan las carpetas

| Carpeta / archivo | Audiencia | Qué es |
|---|---|---|
| `bases/` | fuente normativa | el RFP — manda sobre todo |
| `research/` | 🔒 interno | investigación cruda — nunca al cliente |
| `oferta-tecnica.md` | ➡️ cliente | la oferta (ledger + narrativa) — el `.md` es la FUENTE |
| `oferta-economica.md` | ➡️ cliente | la económica |
| `deck-plan.json` | fuente | de dónde se compone el deck |
| `artifact-manifest.json` | ➡️ cliente | piezas vivas por enlace |
| `anexos/` | ➡️ cliente | administrativos |
| `*-INTERNO.md` | 🔒 interno | blueprint del squad (costos, piso) — NUNCA se entrega |

## Qué no hacer

- **No** mezclar lo interno con lo del cliente: lo de `research/` y `*-INTERNO` nunca sube al portal del
  comprador ni al deck.
- **No** meter una cifra en la oferta o el deck que no esté en el ledger de evidencia con su fuente.
- **No** poner una pieza viva (Radiografía, Grader) como captura: va por enlace, se defiende sola.
- **No** editar el deck a mano esperando que "se sincronice" con el `.md`: son archivos independientes;
  el deck se re-compone del `deck-plan.json`.

## Problemas comunes

- **`pnpm tender:new` dice "ya existe"** → la carpeta ya está; elegí otro slug o trabajá sobre la existente.
- **El slug es rechazado** → tiene que ser kebab-case (minúsculas, números, guiones): `sky-blog-2027`.
- **El deck sale con una cifra "rara" o truncada** → el composer falla cerrado ante cifra sin fuente o
  texto que no cabe; revisá el ledger y el `deck-plan.json`.

## Referencias

- Contrato de la carpeta: `docs/commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md`
- Template de la oferta técnica: `docs/commercial/tenders/TECHNICAL_OFFER_TEMPLATE.md`
- Schema del manifiesto: `docs/commercial/tenders/ARTIFACT_MANIFEST_SCHEMA.md`
- Método completo del bid: skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md`
