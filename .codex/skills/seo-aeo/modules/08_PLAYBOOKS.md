# 08 · Playbooks (auditoría, migración, recovery, lanzamiento)

> Carga para flujos completos de extremo a extremo. Cada playbook es una
> secuencia; los detalles viven en los módulos referenciados. Sello: as-of
> 2026-06.

---

## Playbook A — Auditoría SEO + AEO completa

**Cuándo:** diagnóstico inicial de un sitio, o revisión periódica.

**Secuencia:**
1. **Intake** (SKILL.md §2) — motor objetivo, vertical, tamaño, estado, geo,
   objetivo, herramientas. Sin esto no hay auditoría útil.
2. **Técnica** (`01`): indexación (GSC Pages) → render → CWV de campo → JSON-LD
   → robots/crawlers IA → internal linking → logs si es sitio grande.
3. **Contenido** (`02`): cobertura de intención, topical authority, answer
   capsules, decay, canibalización, calidad.
4. **E-E-A-T / Entidad** (`03`): autoría, Knowledge Panel, Wikidata, `sameAs`,
   reputación; "¿qué sabe la IA de la marca?".
5. **AEO** (`04`): mapa de fan-out, chunking/citabilidad, presencia por motor.
6. **Off-page** (`05`): perfil de links (Semrush), menciones, Reddit/comunidades,
   brand SERP.
7. **Local/Internacional** (`06`) si aplica: GBP, NAP, hreflang.
8. **Medición** (`07`): baseline de visibilidad orgánica + Share of Voice IA +
   tráfico/conversión.
9. **Síntesis:** hallazgos priorizados por **RICE** (SKILL.md §4) → 3–5
   movimientos primero, no lista de 40. Cada uno con "cómo se mide".

**Salida:** documento con lectura del caso, hallazgos por capa, roadmap RICE,
baseline de métricas. Contrasta toda táctica con `ANTIPATTERNS.md`.

---

## Playbook B — Migración de sitio (replatform / rediseño / cambio de dominio)

**Cuándo:** cambio de dominio, CMS, estructura de URLs, HTTPS, o rediseño mayor.
**Riesgo:** las migraciones mal hechas son la causa #1 de caídas catastróficas de
tráfico. Regla: **preparar antes, no reparar después.**

**Secuencia:**
1. **Baseline pre-migración:** exporta todas las URLs indexadas, sus posiciones,
   tráfico, backlinks. Crawl completo del sitio actual. Snapshot de GSC/GA4.
2. **Mapa de redirects 1:1** — cada URL vieja → su equivalente nueva, **301**
   (no 302, no a home masivo). Las URLs con links/tráfico son prioridad absoluta.
3. **Paridad de contenido** — la versión nueva no debe *perder* contenido que
   rankeaba. Verifica title/H1/contenido/schema migrados.
4. **Staging verificado** — robots, canonical, hreflang, JSON-LD, CWV en staging
   ANTES de publicar. No publicar con `noindex` global olvidado (error clásico).
5. **Día de corte:** publicar, verificar redirects en vivo, subir sitemap nuevo,
   "Change of Address" en GSC si cambia dominio.
6. **Post-migración (monitoreo intensivo 4–8 semanas):** indexación de URLs
   nuevas, errores de rastreo, caídas de posición, redirects rotos. Tener listo
   el rollback.

**Errores fatales:** `noindex` global en producción, redirects a home en lote,
perder páginas que rankeaban, romper hreflang, no actualizar internal links.

---

## Playbook C — Recuperación (penalización / caída de tráfico)

**Cuándo:** caída notable de tráfico/posiciones. **Primero diagnostica la
causa** — no apliques tácticas a ciegas.

**Árbol de diagnóstico:**
1. **¿Acción manual?** GSC → Security & Manual Actions. Si la hay: arregla la
   causa (links no naturales, spam, thin) y solicita reconsideración con
   evidencia del fix.
2. **¿Coincide con un Google update?** (core update, spam update, etc. —
   verifica fechas con WebSearch). Si sí: suele ser tema de **calidad/E-E-A-T
   sistémica**, no un fix puntual. Recuperación lenta vía mejora real de calidad;
   a veces solo en el siguiente update.
3. **¿Problema técnico?** Caída súbita y total → revisa indexación, `noindex`
   accidental, robots bloqueante, migración rota, hack, server errors.
4. **¿Pérdida a AI Overviews?** Caída de CTR (no de posición) en queries
   informacionales con AIO → no es penalización, es zero-click. Respuesta:
   estrategia AEO (`04`) + contenido que gana el click (bottom-funnel, datos
   propios, comparativas).
5. **¿Competencia/decay?** Caída gradual → competidores mejoraron o tu contenido
   envejeció. Refresh + topical authority (`02`).

**Regla:** identifica la causa antes de actuar. Lee `feedback`/históricos si
existen. Documenta el fix y su limitación residual.

---

## Playbook D — Lanzamiento de sitio/sección nueva

**Cuándo:** sitio nuevo o sección/idioma nuevo.

**Secuencia:**
1. **Fundamentos técnicos desde día 1:** HTTPS, SSR/SSG, sitemap, robots
   correcto (¡no dejar `noindex` de staging!), GSC + GA4 + Bing Webmaster
   configurados.
2. **Arquitectura de información + URLs** limpias y escalables antes de crear
   contenido (ver skill `info-architecture`).
3. **Entidad desde el inicio** (`03`): schema `Organization`, `sameAs`, GBP si
   local, perfiles consistentes. Construir entidad temprano paga compuesto.
4. **Contenido seed con topical authority** (`02`): pillar + cluster del tema
   core, con answer capsules (`04`) desde el primer día.
5. **Off-page inicial** (`05`): digital PR de lanzamiento, menciones, presencia
   en comunidades.
6. **Medición baseline** (`07`) y paciencia: sitios nuevos tienen "sandbox" de
   facto; la autoridad se construye en meses.

---

> **Cross-refs:** todos los módulos `01`–`07`, `ANTIPATTERNS.md` (qué no hacer),
> `templates/` (checklists ejecutables de auditoría/migración).
> Caso Efeonce (WordPress/migración/landing) → `efeonce/EFEONCE_OVERLAY.md`.
