# Campañas — el trabajo en el harness

> **Greenhouse es el harness.** El **trabajo gobernado** de una campaña —epics, tasks, mini-tasks, issues y
> decisiones— vive **acá, en el repo**, con el mismo lifecycle que el resto.
> **El pensamiento y los assets viven en OneDrive** (`Alineación/2. Campañas/CMP-###_…` y
> `5. Contenidos/…`). Canon de esa parte: [`EFEONCE_CAMPAIGN_REGISTRY_V1.md`](../operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md).

## 🔴 La división, para no duplicar

| Vive en el REPO | Vive en ONEDRIVE |
|---|---|
| **Epics, tasks, mini-tasks, issues** | Brief, conceptos, copy, JTBD |
| **CDR** — decisiones de campaña | Índice de assets y su estado |
| Gates, scripts y medición instrumentada | **Los assets** (en la carpeta de su canal) |

**Regla:** si tiene lifecycle y alguien lo tiene que ejecutar y cerrar → **repo**. Si es criterio, narrativa
o archivo entregable → **OneDrive**. 🔴 **Nada se escribe en los dos lados**: se referencia.

## CDR · Campaign Decision Record

El equivalente de ADR/PDR para campañas. `CDR-###` correlativo, **nunca se reutiliza**.

| | Cuándo | Dónde |
|---|---|---|
| **ADR** | decisión de arquitectura o contrato técnico | `docs/architecture/` |
| **PDR** | decisión de producto del sitio público | `docs/public-site/` |
| 🆕 **CDR** | **decisión de UNA campaña**: territorio, canales, presupuesto, cortes, activación/pausa | `docs/campaigns/decisions/` |

⚠️ **Lo transversal NO es CDR.** El sistema de CTA, el contrato de safe zones o las reglas del registro
fotográfico **no pertenecen a una campaña**: siguen siendo ADR u operations. **Un CDR se reconoce porque, si
la campaña no existiera, la decisión no tendría sentido.**

**Estados:** `Proposed` · `Accepted` · `Superseded by CDR-###` · `Rejected` *(se conserva con su razón)*.

## Estructura

```
docs/campaigns/
├── decisions/   CDR-###-titulo.md
├── epics/       EPIC-CMP-###-titulo.md
├── tasks/       to-do · in-progress · complete   ← TASK-### del registry global
└── issues/      open · resolved                  ← ISSUE-### del registry global
```

🔴 **Los IDs de task e issue salen del registry global del repo** (`docs/tasks/TASK_ID_REGISTRY.md`), no de
uno paralelo. Una campaña no es un universo aparte: **es trabajo del mismo harness.**
Sólo `CDR-###` y `EPIC-CMP-###` tienen numeración propia.

## Para agentes
1. **Antes de abrir trabajo de campaña, lee su `BRIEF.md` en OneDrive.** El repo tiene el *qué hacer*; el
   brief tiene el *con qué criterio*.
2. **Una decisión que cambia la campaña se escribe como CDR** — si no, en tres semanas nadie sabe por qué
   se pausó un canal.
3. **No dupliques el brief acá.** Referencia su ruta.
