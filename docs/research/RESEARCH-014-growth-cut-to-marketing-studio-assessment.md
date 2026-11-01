# RESEARCH-014 — ¿Adelantar el corte de Growth a Marketing Studio?

> **Estado:** Active · **Fecha:** 2026-10-26 · **Autor:** Claude, con tres subagentes de lectura · **Tipo:** análisis
> (nada construido ni movido) · Marcas: **[V]** verificado en código, docs o comandos de solo lectura; **[I]** inferido.
> **Relacionado:** [`GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md`](../architecture/GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md),
> EPIC-054 (D05–D07), EPIC-049, [RESEARCH-013](RESEARCH-013-events-webinars-hubspot-teams.md),
> [`GREENHOUSE_GROWTH_EVENTS_WEBINARS_ARCHITECTURE_V1.md`](../architecture/GREENHOUSE_GROWTH_EVENTS_WEBINARS_ARCHITECTURE_V1.md)

## Pregunta

El operador quiere sacar Growth de Greenhouse antes de tiempo porque cada release de Greenhouse toma ~3 h y los de
Marketing Studio son mucho más rápidos. ¿Conviene adelantar el corte 3 (Growth + Search Visibility 360 → Marketing
Studio)? ¿Y el módulo de eventos (EO Talks) debería nacer ya en Studio?

## Respuesta corta

1. **Sí conviene empezar ya, pero por D05 (inventario y decisiones, solo docs)**: no tiene dependencias y el EPIC-054
   permite correr D05–D07 en paralelo con AXIS [V]. El orden `2a → 2b → 2c → 3` del ADR es preferencia de medición del
   build, no dependencia técnica para el corte 3 [V].
2. **No conviene construir EO Talks en Studio ahora.** Eventos es parte del sub-vertical Formularios, el más acoplado:
   necesita intake público, email saliente, HubSpot, outbox/consumers y resolver el motor compartido con Hiring. Ninguna
   de esas piezas existe en Studio [V]. Hacerlo solo para eventos es construir medio Growth fuera de orden.
3. **EO Talks se puede hacer casi sin tocar Greenhouse** si se toma el camino del workflow de HubSpot (sin app de
   Microsoft): el código nuevo en Greenhouse se reduce a cupo, espera y cancelación. Eso hace que mudarlo después cueste
   poco.
4. **La lentitud de los releases no está en el deploy:** el orquestador tarda 11–35 min; las 3 h se van en CI,
   aprobaciones, merge canónico y documentación [V, `PRODUCTION_RELEASE_TIMING_LEDGER.md`]. Hay una mejora barata y
   separada en acelerar ese proceso.

## Tamaño del vertical (medido 2026-10-26)

| Bloque | Medida |
|---|---|
| `src/lib/growth` | 696 archivos, 122,7k LOC (79,7k sin tests), 14 subdominios. Pesos: SEO/SV360 54,5k · AEO grader 39,3k · forms 12,4k · ctas 5,9k · meetings 2,5k |
| Rutas | 124 `route.ts` (67 admin, 27 ecosystem SEO, 20 públicas, 8 app, 2 client-portal) · 19 páginas |
| Renderers públicos | forms 11,3k · cta 5,2k · meetings 5,6k (meetings ya en sitio Vercel propio) |
| Asíncrono | 11 proyecciones reactivas · 16 rutas y 19 Cloud Scheduler en el ops-worker · 163 env vars `GROWTH_*` en `deploy.sh` |
| Datos | 82 tablas en `greenhouse_growth` · ~84 migraciones · dataset BQ `greenhouse_growth_analytics` |
| Contratos | 28 tools MCP SEO + 5 scopes `growth.*` en el gateway · ~50 capabilities `growth.*` |
| Total | ≈195k LOC de producto con tests; ≈247k con scripts |

## Bloqueos duros para mover Growth

1. **Organizaciones:** ~20 FK a `greenhouse_core.organizations` (varias CASCADE). Con otra base no pueden existir.
2. **Comercialización por SQL:** los gates `seo_v2`/`ai_visibility_v1` leen `greenhouse_client_portal.module_assignments`
   (19 sitios) y `assign-tier` la escribe; `grader_runs` tiene FK a esa tabla.
3. **Sesión y permisos:** 128 usos de `requireInternalTenantContext` y 66 de `can()` con el catálogo de Greenhouse.
4. **Motor de formularios compartido con Hiring** (proyección de postulaciones; captcha, abuse-guard y validadores).
5. **Efeonce Insights** lee Growth en el mismo proceso (SEO, AEO, GA4).
6. **Runtime asíncrono:** outbox en `greenhouse_sync` dentro de las transacciones de Growth; 11 proyecciones y 19 crons
   en el ops-worker compartido. Studio no tiene outbox.
7. **Secretos compartidos:** token HubSpot de Greenhouse, Resend y su ledger, refresh tokens OAuth GSC/GA4 por
   organización con redirect al dominio de Greenhouse.
8. **Lecturas directas desde Greenhouse:** client-portal enablement, Account 360 y ~37 señales de reliability.

## Qué le falta a Marketing Studio

Studio tiene una base sana y liviana (Vercel con build de 22–46 s, worker Cloud Run con Pub/Sub y Scheduler, Sentry,
WIF, migraciones propias) pero le faltan: intake público (CORS, captcha, sin `X-Frame-Options: DENY`), envío de email,
token HubSpot propio, outbox y consumers, login (`STUDIO_ACCESS_MODE=open`; TASK-1898 bloqueada por TASK-1834) y CI
(no hay `.github/`). Su velocidad se debe en parte a no tener controles; con Growth (PII, envíos reales, proveedores con
costo) necesitará CI mínima y preflight de migraciones, y aun así seguiría muy por debajo de Greenhouse.

**Choque abierto (decisión G1):** el ADR pide traspasar el schema «en la misma instancia, sin mover datos», pero Studio
vive en otra base y su invariante prohíbe SQL hacia la base de Greenhouse. Opciones: (a) segunda conexión de Studio a la
base de Greenhouse con un rol dueño solo de `greenhouse_growth` (enmienda el invariante de Studio); (b) mover datos a
`marketing_studio` (el EPIC lo declara non-goal). Debe decidirse en D05.

## Orden recomendado

| Paso | Contenido | Tamaño |
|---|---|---|
| 1. **D05 ya** | Inventario con dueño por pieza (este documento es su base), ADR de base/migraciones (G1), contrato de organizaciones (espejo o id externo), decisión del motor de formularios (¿proveedor compartido con Hiring o se parte?), delta a EPIC-049 y al ADR de estrategia (dicen que SEO queda en Greenhouse) | S–M, solo docs |
| 2. Bases en Studio | CI mínima, SA y secretos propios, rol/conexión según G1, capabilities `growth.*` en el canje | M |
| 3. D06 por sub-vertical | **SV360 primero** (lectura + crons + MCP, sin intake público ni PII) → **Formularios, CTAs, Meetings y EO Talks** (intake, renderer con EPIC-035, email, HubSpot, contrato con Hiring) → **grader AEO** al final (público, costo LLM) | L |
| 4. Login | TASK-1898 apenas TASK-1834 lo permita: ruta crítica de D07 | L |
| 5. D07 | UI en Studio y retiro en Greenhouse, build medido antes y después | L |

Ruta crítica: G1 → outbox y workers en Studio → login.

## Consecuencias para EO Talks

- **Sigue en Greenhouse, dentro de Growth, extraction-ready**, con destino declarado Marketing Studio (D06, paso
  Formularios). Corregir el placement de la spec de eventos y de TASK-2053, que dicen «paquete EPIC-027».
- **Preferir el camino del workflow de HubSpot** (anexo D de RESEARCH-013 lo dejaba como plan B): Greenhouse envía al
  formulario de HubSpot solo a confirmados; el workflow inscribe en el webinar del Calendario; Teams manda enlace y
  recordatorio; el conector sincroniza. Sin app de Microsoft, sin cliente Graph, sin worker nuevo. El código nuevo en
  Greenhouse queda en cupo, espera, cancelación y envío diferido al confirmar: poco que mudar después.
- Si más adelante se quiere confirmación con la marca EO Talks y el enlace personal, eso se construye ya en Studio,
  cuando exista el sub-vertical de Formularios allá.

## Mejora separada: el proceso de release

El ledger de tiempos muestra orquestador de 11–35 min contra 41 min–3h25m de punta a punta (2026-09-06 ~3h05m con 64 min
esperando autorización; 2026-10-03 ~3h25m). Vale una task propia para medir y recortar CI, aprobaciones, merge
canónico y documentación de cierre. Beneficia a todo Greenhouse mientras dura el desacople.

## Preguntas abiertas

- G1: base y migraciones de `greenhouse_growth` (opción a o b).
- Contrato de organizaciones entre productos (espejo, id externo, reconciliación).
- Motor de formularios: proveedor compartido entre Studio y Greenhouse/Hiring, o partirlo.
- Dónde queda AEO X-Ray (`greenhouse_xray`) y las superficies públicas de AEO (pendiente en el ADR).
- Si Insights (D08) consumirá Growth por API remota o MCP.

## Fuentes

Inventarios y lecturas del 2026-10-26 sobre `develop` (greenhouse-eo) y `efeonce-marketing-studio` HEAD `3ba7cff`
(igual al remoto). Documentos citados en cada sección; detalle de archivo y línea en los informes de los subagentes
resumidos aquí.
