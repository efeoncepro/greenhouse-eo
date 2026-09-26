# Ejemplo trabajado — CMP-001 «Lo que la IA dice de ti»

> **Qué es este ejemplo.** Un plan parcial sobre una campaña **real**, armado con datos de documentos del repo y de
> OneDrive al 2026-09-26. **No** se leyó Studio por `studio.*` (la sesión que escribió la skill no tenía conexión
> MCP autenticada), así que cada dato cita su documento; en una corrida real, el paso 1 lee Studio primero y los
> documentos confirman. No contiene métricas inventadas: donde no hay dato dice `no registrado`. Los copys no se
> reproducen (viven literales en Studio y en `MANIFIESTO-PAUTA.json`); se referencian por id.

## 0. Procedencia

| Campo | Valor |
|---|---|
| Entradas | `BRIEF.md` de `CMP-001_la-ia-dice-de-ti` · CDR-001, CDR-005, CDR-006, CDR-007 · `CMP-001-MEDIA-PLAN-Q4-2026.md` · `MANIFIESTO-PAUTA.json` (2026-09-22) · catálogo `CATALOGO-DATOS.json` (snapshot 2026-09-22) |
| Tools no disponibles | `studio.*` y tools SEO (sin sesión MCP autenticada) |

## 1. Lo que el plan ya sabe (con fuente)

| Hecho | Valor | Fuente |
|---|---|---|
| Ventana y modelo | always-on 2026-10-01 → 2026-12-31, renovación Q1 2027 | CDR-001 (Accepted, 2026-09-22) |
| Servicio y destino | SEO · AEO; `https://efeoncepro.com/aeo-2/` | catálogo, campaña CMP-001 |
| Audiencia resumida | empresas mid-market y enterprise · marketing y dirección | catálogo; brief «ICP de trabajo» |
| Estados | creativo: finales disponibles · pauta: sin activación verificada | catálogo (Studio los expone como tres estados separados) |
| Inventario de pauta | 25 PNG + 3 MP4, 48 perfiles de copy, 72 alternativas de anuncio | `EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md` §5 |
| Conversión calificada | contacto en `opportunity` en HubSpot | brief (fijado por el operador, 2026-09-22) |
| Metas | **no registradas** («metas pendientes») | brief |
| Presupuesto | el del plan es **propuesta** (`proposed`), sin techo aprobado | catálogo (nota) · media plan I1 |
| Cuentas | Meta conectada por MCP; LinkedIn y Google sin confirmar | media plan I2 (2026-09-22) |

## 2. Estrategia (extracto)

- **Objetivo de negocio:** abrir pipeline acreditable a la campaña — `opportunity` en HubSpot. [brief]
- **KPI norte:** contactos en `opportunity` con `utm_campaign = cmp001-la-ia-dice-de-ti` — **meta: no
  registrada**; se fija al cierre del mes 1 con datos propios (`_templates/MEDIA-PLAN-TEMPLATE.md` §1).
  ⚠️ **No medible hoy de punta a punta:** el puente `utm_campaign` → contacto → deal es `TASK-1886` (to-do).
- **Hipótesis H1:** creemos que el campeón de Marketing/Growth (BP2 en el context pack) pide el diagnóstico si el anuncio le da
  una frase repetible sobre cómo la IA describe a su empresa; lo sabremos por solicitudes aceptadas del
  formulario AEO en octubre; umbral: `no registrado` (se fija con el dato de octubre); si no, rotar ángulo antes
  que formato. [brief §buying group; CDR-005]

## 3. Matriz de audiencias (extracto)

| Persona · rol | Etapa · stage | Canal | Mensaje (concepto) | Acción | Destino |
|---|---|---|---|---|---|
| BP2 · campeón Marketing/Growth | TOFU · Subscriber/Lead | `linkedin` 4:5 | C01 / C05 | pedir diagnóstico | `/aeo-2/` |
| Owner SEO/datos · influye al campeón | TOFU diagnóstico | `linkedin` | «Expediente» | evaluar método | `/aeo-2/` |
| BP2 · campeón | MOFU · MQL | `linkedin` (retargeting TOFU) | M1–M3 | profundizar | panel competitivo |
| BP1/BP3 · sponsor económico | BOFU · SQL → `opportunity` | `linkedin` (retargeting MOFU) | B1–B2 | agendar discovery | `/aeo-2/` → agenda |
| Campeón (prueba de alcance) | TOFU | `meta` 4:5 · `meta-vertical` 9:16 | C01 / C02 | pedir diagnóstico | `/aeo-2/` |

Correspondencia rol del brief → BP del context pack: inferida en este ejemplo (el brief nombra roles, no BP); en un plan real se marca como supuesto. Meta no lleva MOFU/BOFU dirigidos a un rol (no segmenta por cargo). En octubre no hay audiencia de retargeting:
BOFU entra en noviembre. [media plan §2; `operating_rules.first_wave`]

## 6. Plan SEO/AEO

`no disponible en esta corrida` (sin sesión MCP). En una corrida real: `get_seo_entitlement` para Efeonce →
`get_seo_keyword_opportunities` y `get_seo_url_visibility` sobre `/aeo-2/` y `/servicios/aeo/` →
`get_seo_visibility_360` para preguntas de respuesta IA del job «saber cómo me describe la IA». Toda propuesta de
`track_seo_keywords` sale con la lista exacta y espera tu confirmación.

## 7. Medición (extracto)

- UTM registrada: `utm_source` `linkedin|meta`, `utm_medium` `paid-social`, `utm_campaign`
  `cmp001-la-ia-dice-de-ti`, `utm_content` `c01-tofu-4x5-imagen-feed-image-ha-v01`. [catálogo, 72 anuncios]
- GA4 `G-KYPPY57M14` + GTM `GTM-K2X4ZTTK` existen; `gh_form_submitted` es intento; IDs de conversión de las
  cuentas `no registrados`. [media plan §4; `operating_rules.conversion`]

## 9. Presupuesto

Líneas `proposed` del flight: montos `no registrados en este ejemplo` (se leen con `studio.campaign.media_plan.get`).
Líneas `approved`: ninguna registrada. `actual`: sin datos de gasto (≠ gasto cero).

## 11. Decisiones abiertas

- [ ] **I1 · Presupuesto y techo mensual** — sin monto no hay reparto ni criterio de corte. [media plan]
- [ ] **I2 · Cuentas LinkedIn y Google** — la matriz asume LinkedIn como núcleo; sin cuenta, TOFU queda sólo en Meta.
- [ ] **I3 · CDR-007 B1/B2** — canonical de `/servicios/aeo/` → `/aeo-2/` y ruta del clic BOFU a la agenda.
- [ ] **Contradicción CDR-001 vs CDR-005** — diciembre programa «Mide antes de migrar», ángulo descartado;
      propuesta del media plan: planificación anual.
- [ ] **UTM** — lo cargado (`paid-social`, `cmp001-la-ia-dice-de-ti`) difiere de la propuesta del media plan
      (`paid_social`, `cmp001_<etapa>_<linea>`); elegir una y dejarla escrita.
- [ ] **TASK-1886** — sin el puente UTM → deal, el KPI norte no se puede acreditar.

## Lo que este ejemplo enseña

1. La mitad de un buen plan son **decisiones abiertas bien planteadas**, no celdas llenas.
2. Cada número tiene dueño y fecha; los que no, dicen `no registrado` y dicen **quién** los fija.
3. El plan detecta contradicciones entre decisiones vigentes y las devuelve al humano con una propuesta.
