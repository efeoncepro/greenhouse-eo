# Greenhouse · Context Pack para Agentes de Desarrollo

> **Propósito.** Esta carpeta le da a cualquier agente (o persona) que construye Greenhouse el contexto estratégico, comercial y de marca de Efeonce Group, para que **toda funcionalidad nueva apunte en la dirección del negocio** y no solo resuelva un ticket aislado.
>
> Greenhouse no es un dashboard decorativo. Es la pieza del modelo ASaaS que genera *switching cost*. Cada feature que construyes, lo aumenta o lo desperdicia.

---

## Cómo usar esta carpeta

**Orden de lectura recomendado (primera vez):** este índice → `01_quienes-somos` → `07_ico` → `03_ecosistema-producto` → `04_greenhouse-producto`. El resto se carga según la tarea.

**Carga selectiva (uso diario):**

| Si vas a... | Lee |
|---|---|
| Decidir si una feature vale la pena / priorizar | `00_INDEX` (este archivo) + `02_gtm` + `08_estrategia-comercial` + `13_icp-buyer-personas-jtbd` + `14_modelo-negocio-asaas` |
| Tocar UX copy, microcopy, vacíos, errores, emails | `05_voz-tono-estilo` + `09_marca-agencia` |
| Nombrar una métrica, propiedad, columna o KPI | `06_glosario-metricas` |
| Entender el sistema de medición (ICO Engine, bonos, dashboards) | `07_ico` + `06_glosario-metricas` |
| Trabajar un módulo de Greenhouse | `04_greenhouse-producto` |
| Entender cómo Greenhouse conversa con Kortex/Verk/HubSpot | `03_ecosistema-producto` |
| Priorizar features con justificación comercial (cuentas, cross-sell, Pulse) | `08_estrategia-comercial` |
| Cuidar marca/branding en el portal (Ecosystem Tour, onboarding, naming) | `09_marca-agencia` |
| Diseñar la experiencia/onboarding del cliente en el portal | `10_experiencia-cliente` |
| Tocar el sync con HubSpot, Account 360, lifecycle stages o properties | `11_hubspot-bowtie` |
| Definir ICP, buyer persona, JTBD o prioridad por job del cliente | `13_icp-buyer-personas-jtbd` |
| Evaluar ASaaS, tiers, switching cost, self-service o monetizacion | `14_modelo-negocio-asaas` |

**Enganche desde el repo.** Este archivo está pensado para referenciarse desde el `CLAUDE.md` / `AGENTS.md` de Greenhouse. Sugerencia de línea en ese archivo raíz:

```md
## Contexto de negocio
Antes de proponer o construir features, lee `greenhouse-context/00_INDEX.md`.
Es el North Star de producto. No lo ignores por "ir más rápido".
```

Ruta vigente en este repo: `docs/context/00_INDEX.md`.

---

## El North Star de producto

Greenhouse existe para tres cosas. Si una feature no mueve al menos una, no es prioridad —por buena que se vea la demo.

### Eje 1 — Switching cost sistémico
Cada mes de operación registrada en el portal debe aumentar el costo real de que el cliente se vaya. Historial ICO, inteligencia financiera, Account/Person 360, métricas acumuladas. **Construimos memoria, no pantallas.** Una feature que no deja rastro acumulable es una feature débil.

### Eje 2 — Transparencia operativa radical
El cliente ve su operación en tiempo real: qué pasa, cuándo pasa y dónde está el cuello de botella. Sin cajas negras, sin "te mando el reporte el viernes". En la industria esto todavía es raro; para nosotros es el mínimo. **Si una feature esconde la operación en vez de exponerla, va en contra de la marca.**

### Eje 3 — Revenue Enabled
Todo lo que mostramos debe poder conectarse —directa o indirectamente— con impacto en el negocio del cliente (pipeline, revenue, NRR), no con vanity metrics. La inteligencia financiera y las métricas ICO existen para alimentar esa cadena causal. **Medimos lo que defiende presupuesto, no lo que decora un slide.**

---

## Filtro de decisión para una feature nueva

Antes de construir, el agente debería poder responder *sí* a al menos una y *no* a ninguna de las rojas:

**Verdes (suma si responde sí):**
- ¿Aumenta el switching cost (deja historial/datos acumulables)?
- ¿Hace más visible la operación para el cliente (self-service, estado en vivo, menos email)?
- ¿Acerca un dato operativo a la cadena Revenue Enabled?
- ¿Reduce fricción en un cuello de botella real ya medido (RpA alto, OTD% bajo, stuck assets)?
- ¿Es coherente con el gap declarado del roadmap (ver `04`: self-service del cliente)?

**Rojas (replantea si responde sí):**
- ¿Es una métrica de actividad disfrazada de impacto (impresiones, "engagement") sin línea a negocio?
- ¿Agrega una pantalla que el cliente mira una vez y nunca más?
- ¿Rompe el aislamiento multi-tenant o asume un solo cliente?
- ¿Introduce un nombre/sigla que contradice el glosario (`06`)?
- ¿Esconde algo que la marca promete mostrar?

---

## Gap declarado = dirección de producto

El roadmap ASaaS ya nombra dónde duele. Si buscas dónde aportar, empieza aquí:

> Esta lista es **dirección**, no estado de runtime. Verificar el estado real contra `project_context.md` + el backlog (`docs/tasks/`); varios items ya cerraron.

1. **Self-service del cliente** — aprobar, solicitar y mandar briefs *desde el portal* (buena parte aún vive fuera). Gap #1, avanza con onboarding/lifecycle del cliente.
2. **Reactividad cross-module** — el sistema de eventos (outbox publisher + consumers reactivos) **ya está materializado** (ver CLAUDE.md / TASK-773); quedan superficies puntuales por reactivar.
3. **ICO Engine ↔ Person 360** — integración profunda de métricas por persona.
4. **Test coverage** en módulos críticos — deuda técnica que limita iteración. El % exacto vive en el reporte de cobertura del repo (CI), no se hardcodea aquí.
5. **Exponer inteligencia al cliente** — inteligencia financiera y AI Tools hoy son internas; el roadmap las abre (ver roadmap vivo en `14` + `project_context.md`).

---

## Convenciones críticas (no negociables)

- **Altitud del pack (regla anti-drift).** Este pack fija **dirección estratégica** (negocio, marca, GTM, voz), no **valores de runtime**. Conteos, %, schemas, rutas, gaps abiertos/cerrados, strings de métrica, rótulos de UI y fechas de roadmap **NO se hardcodean aquí** — se referencian al SoT técnico (`CLAUDE.md`, `DESIGN.md`, specs de `docs/architecture/`, el glosario vivo, `project_context.md`). Si un valor de runtime aparece hardcodeado, es drift: reemplazar por puntero. Regla de CLAUDE.md: cuando el pack y el contrato técnico difieran, **prevalece el contrato técnico verificado**.
- **El producto se llama `Greenhouse`. Nunca "Greenhouse EO".** "EO" es solo la abreviatura del repo en GitHub; no es nombre de producto ni va en UI, docs de cliente ni copy.
- **RpA = Rounds per Asset** (rondas de revisión por entregable; menor es mejor). El string canónico es "Rounds per Asset". El naming vivo de métricas vive en `06` + el glosario de runtime — no fijar aquí estados de rótulo del dashboard (driftean).
- **Casos reales y citables:** Sky Airlines, Bresler, Pinturas Berel, SSilva. **GEA Grupo NO es caso** (fue prospecto cotizado que nunca cerró; cualquier métrica tipo "+340% leads" asociada a GEA es falsa y no se usa).
- **Treatment "tú"** en todo el copy de cliente (el "usted" solo en legales/contratos). Ver `05`.
- **Dominios canónicos:** Greenhouse → `greenhouse.efeoncepro.com`. Agencia → `efeoncepro.com`. (El corpus antiguo decía `efeonce.com`; queda obsoleto.) Igual léelo desde env var (`NEXT_PUBLIC_APP_URL`), no lo hardcodees.

---

## Mapa de archivos

| Archivo | Dominio |
|---|---|
| `00_INDEX.md` | Este. Cómo usar la carpeta + North Star de producto. |
| `01_quienes-somos.md` | Efeonce Group, 4 unidades, Loop Marketing, ICO, experiencia LATAM. |
| `02_gtm.md` | Posicionamiento, categoría ASaaS, líneas de negocio, segmentación, modelo comercial, canales, proceso de venta, métricas GTM, partnership. |
| `03_ecosistema-producto.md` | Greenhouse + Kortex + Verk. Integración, convergencia, ASaaS redefinido, jerarquía de IP. |
| `04_greenhouse-producto.md` | Greenhouse hoy: módulos, stack, integraciones, ICO Engine, gaps, roadmap, principios de diseño. |
| `05_voz-tono-estilo.md` | Creencias contrarias, personalidad, voz, tono, do/don't — aplicado a UX copy del portal. |
| `06_glosario-metricas.md` | Glosario canónico de métricas, siglas y naming. Fuente de verdad para nombres en código. |
| `07_ico.md` | ICO explicado: qué es, por qué existe, 4 pilares, 7 fases CSC, las dos cadenas causales, cómo vive en Greenhouse. |
| `08_estrategia-comercial.md` | Dos motores, cuentas ancla y playbooks, cross-sell por Pulse, demo por buyer persona, KPIs, dependencias de producto. |
| `09_marca-agencia.md` | Arquitectura de marca (masterbrand + capabilities), sistema verbal, posicionamiento, elevator pitch, messaging por audiencia, reglas de comunicación. |
| `10_experiencia-cliente.md` | Greenhouse como sistema de experiencia: journey de 8 fases + 2 transversales mapeado a módulos, artefactos de marca (Ecosystem Tour, "Tu año con Efeonce"), métricas de adopción. |
| `11_hubspot-bowtie.md` | Arquitectura HubSpot: 3 pipelines de deals, properties custom, y Bow-tie (lifecycle dual 7/12 stages + motion booleans) con los **internal names exactos** para el sync de Account 360. |
| `13_icp-buyer-personas-jtbd.md` | ICPs, buyer personas y Jobs-to-be-Done. Traduce dolores comerciales en prioridades de producto por usuario y tier de entrada. |
| `14_modelo-negocio-asaas.md` | Modelo ASaaS recalibrado: switching cost, self-service, tiers, monetizacion recurrente y roadmap de exposicion/adopcion. |

---

*Propiedad intelectual de Efeonce Group SpA. Uso interno. Última destilación: junio 2026, a partir del corpus estratégico v5.3 / GTM 2026 / Product Ecosystem v1.0.*
