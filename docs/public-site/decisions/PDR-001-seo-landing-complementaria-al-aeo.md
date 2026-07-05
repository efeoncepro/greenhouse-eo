# PDR-001 — Landing SEO complementaria al AEO

> **Tipo:** Product Decision Record (posicionamiento/GTM del sitio público).
> No es un ADR — no fija arquitectura; cuando obliga arquitectura, cita el ADR.
> **Estado:** Accepted (dirección) — arquitectura de información pendiente.
> **Fecha:** 2026-07-05. **Skills:** `seo-aeo`, `commercial-expert` (overlay GH).

## Contexto

El sitio público tiene `/aeo-2` (landing del servicio AEO, comercial → HubSpot),
el **AI Visibility Grader** como motor/lead magnet robusto en el eje AEO, y un
programa de SEO planificado (EPIC-022, "Search Visibility 360"). Pregunta del
operador: ¿vale la pena una landing de SEO en el sitio público, complementaria a
`/aeo-2`?

El ICP son equipos de marketing enterprise (Globe), que ya asocian "agencia SEO"
a commodity. La demanda de búsqueda comercial hoy vive en términos SEO
("posicionamiento", "SEO"), no en "AEO" (volumen aún marginal). El framework
propietario Efeonce trata SEO y AEO como una sola escalera: SEO = cimiento
**Be Found + Be Readable**; AEO = filo **Be Correct + Actionable + Intrinsic**.

## Decisión

**Sí, crear una landing de SEO complementaria — posicionada como el *cimiento de
la misma promesa de visibilidad*, nunca como servicio SEO commodity paralelo.**

- **Encuadre (Command of the Message):** ancla al outcome "Que tu marca sea
  encontrada — por Google *y* por la IA". Wedge: el SEO que solo persigue el
  ranking clásico ya está incompleto (83% de búsquedas con AI Overview terminan
  sin click). Efeonce hace SEO construido para además hacerte citable.
- **Relación entre landings:** `/seo` = puerta de demanda + cimiento;
  `/aeo-2` = filo/diferenciador. Cross-link explícito con narrativa
  "cimiento → filo". Ambas comparten **un solo** lead magnet: el grader.
- **Oferta (disciplina ASaaS):** outcome productizado + instrumentado (el grader
  es el instrumento medible), no "retainer de horas de SEO".
- **Gancho de producto:** EPIC-022 extiende el grader del eje AEO al eje SEO
  (DataForSEO + Search Console), convirtiendo el lead magnet de "AI Visibility" a
  "Search + AI Visibility".

## Alternativas descartadas

- **No hacer landing SEO** — cede tráfico transaccional de alta intención y
  demanda masiva a la competencia; deja el sitio solo con el filo AEO nicho.
- **Landing SEO genérica/standalone** ("somos agencia SEO") — mete a Efeonce en
  el balde commodity y diluye el diferenciador premium del AEO.
- **Fusionar todo en `/aeo-2`** — pierde la captura de la demanda SEO de alto
  volumen y confunde dos promesas (hoy vs mañana) en una página.

## Consecuencias

- **Positivas:** captura demanda SEO de hoy sin renunciar al posicionamiento AEO;
  credibilidad de entidad (Efeonce ranqueando para "SEO"); un solo embudo
  (grader → HubSpot).
- **Riesgo #1:** atraer al comprador equivocado (SMB cazando SEO barato) que el
  modelo ASaaS no sirve con margen → mitigación: señales enterprise, sin precios
  commodity, anti-ICP explícito en copy.
- **4 pilares:** Safety = riesgo commodity mitigado por el encuadre framework.
  Robustez = la demanda SEO sostiene aunque el AEO siga incipiente. Resiliencia =
  es una landing, reversible. Escalabilidad = encaja con el footprint multilingüe
  y el grader escala la captación.

## Siguiente paso (abierto)

Definir la **arquitectura de información**: ¿pillar `/visibilidad` con `/seo` y
`/aeo` como hijas, o dos landings hermanas cross-linkeadas al nivel actual? Es
una decisión de URL/IA que bloquea el copy y el build. Candidata a su propio PDR
o a bajarse directo a TASK bajo EPIC-022 / EPIC-019.

## Reglas duras

- **NUNCA** posicionar `/seo` como "agencia SEO" a secas — siempre como el
  cimiento Be Found/Readable de la promesa de visibilidad total.
- **NUNCA** duplicar el lead magnet: el grader es uno, compartido por ambas.
- **NUNCA** poner señales de precio commodity ("desde $X/mes") — repele al ICP.
- **SIEMPRE** cross-linkear `/seo` ↔ `/aeo-2` con la narrativa "cimiento → filo".
- **SIEMPRE** ejecutar el sitio vía `efeonce-public-site-wordpress` y validar
  copy con `greenhouse-ux-writing` (es-CL, sin exponer marca del portal interno).

## Enlaces

- ADR relacionados (arquitectura, no duplicar): módulo SEO Search Visibility 360,
  render headless del report, estrategia Astro runtime →
  [`architecture/DECISIONS_INDEX.md`](../../architecture/DECISIONS_INDEX.md).
- Programas: EPIC-022 (SEO), EPIC-020 (lead magnet), EPIC-019 (landing control
  plane) → [`docs/epics/`](../../epics/).
- Skills: `seo-aeo` (framework 5 niveles + overlay Efeonce), `commercial-expert`
  (overlay Greenhouse), `efeonce-public-site-wordpress`.
