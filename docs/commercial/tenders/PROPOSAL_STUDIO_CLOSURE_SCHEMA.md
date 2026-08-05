# Registro de cierre Proposal Studio

`proposal-studio.json` es el registro durable del estado de una licitación dentro del workspace git.
No reemplaza la base de datos ni pretende probar por sí solo que un ID exista: conserva la evidencia
que el agente debe levantar después de operar el camino canónico.

## Regla de cierre

El único estado que pasa `pnpm tender:canonical-gate <slug>` es `verified`. Una composición producida
con `pnpm deck:compose` es una salida de taller: no crea una `Proposal`, no encola un render gobernado
y no adjunta un PDF versionado al asset store.

El cierre exige la cadena completa:

```text
workspace git
  → Proposal registrada con actor member
  → ResolvedCompositionManifest sellado
  → render job client_facing completed
  → PDF + previews en asset store y vínculo proposal_assets
  → revisión autenticada en Proposal Studio
```

## Estados

| Estado | Significado | ¿Pasa el gate? |
|---|---|---:|
| `workshop_only` | Existe fuente y/o salida local; no hay Proposal gobernada | No |
| `proposal_registered` | Existe `proposalId`, pero aún no hay render productivo cerrado | No |
| `render_queued` | Existe un render job canónico en cola | No |
| `render_completed` | El worker terminó y produjo assets, pero falta la verificación humana/documental | No |
| `verified` | Proposal, jobs, assets versionados, audiencia y revisión autenticada están comprobados | Sí |

## Shape mínimo

```json
{
  "$schema": "../PROPOSAL_STUDIO_CLOSURE_SCHEMA.md",
  "schemaVersion": 1,
  "deal": "<slug>",
  "workspacePath": "docs/commercial/tenders/<slug>",
  "status": "workshop_only",
  "proposalId": null,
  "registration": null,
  "composition": {
    "sourcePlans": ["deck-plan.json"]
  },
  "renderJobs": [],
  "deliverables": [],
  "verification": null,
  "notes": []
}
```

En `verified`, `registration` debe declarar `actorKind: "member"`; cada `renderJobs[]` debe tener
`audience: "client_facing"`, `state: "completed"`, `manifestHash`, `outputPdfAssetId` y previews;
cada `deliverables[]` debe vincular el `proposalAssetId`, `assetId`, `renderJobId`, `kind`, versión
derivada y estado `final`. `verification` debe usar `authenticated_portal` o `authenticated_api` y
marcar todos los checks en `true`.

Las rutas bajo `.captures/`, los PDFs locales y las capturas de pantalla sirven como trazabilidad del
taller, pero nunca satisfacen el gate ni sustituyen `proposalId`, `renderJobId` o `proposalAssetId`.

## Operación

```bash
pnpm tender:canonical-gate brightcell-lic-95
pnpm tender:canonical-gate --all
pnpm tender:canonical-gate:test
```

La actualización de `proposal-studio.json` debe ocurrir después de leer la evidencia autenticada del
Studio. No se debe rellenar `verified` por inferencia desde un PDF local.
