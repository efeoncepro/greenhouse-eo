# ISSUE-110 — AEO Grader produce un diagnóstico falso (score 0) para marcas no-agencia / consumo: prompt pack hardcodeado al ICP de Efeonce + bypass de taxonomía

## Ambiente

staging (mismo código que produciría el efecto en production). Detectado durante el smoke E2E del cross-sell operador (TASK-1279).

## Detectado

2026-06-29, por el operador, revisando el resultado del primer envío real del cross-sell: **Sky Airlines** (una de las aerolíneas más grandes de Sudamérica) salió con **0 apariciones en motores de IA** — un falso negativo evidente.

## Síntoma

El AI Visibility Grader corrió sobre Sky Airlines y reportó `overall_score = 0` ("no aparece en respuestas de IA"), cuando SKY es altamente visible en IA para consultas de consumidor. El diagnóstico se materializó como `aeo_check_result='No aparece'` en HubSpot + un informe público. Enviar ese informe a un prospecto sería falso y dañaría la credibilidad comercial.

## Causa raíz

Tres defectos apilados en el pipeline categoría → prompt:

1. **Bypass de taxonomía.** `provisionGraderProfileForOrganization` (`src/lib/growth/ai-visibility/provision-profile.ts`) escribe `org.industry` (el **enum de industria de HubSpot**, `AIRLINES_AVIATION`) **crudo** en `grader_profiles.category`, saltándose la taxonomía canónica (`src/lib/growth/ai-visibility/taxonomy/catalog.ts`, que usa nodos `industry:*` con label localizada `{es,en}`). No hay mapeo HubSpot→taxonomía ni resolución de label.
2. **Render del enum crudo en el prompt.** `prompt-pack.ts` interpola `{{category}}` = `vars.category` = ese enum → prompts como *"¿qué agencias de AIRLINES_AVIATION ayudan a empresas en CL?"*.
3. **Framing único = ICP de Efeonce.** `prompt-packs/prompt-pack-v1.ts` (y v2) están cableados a "¿qué **agencias/proveedores** de {category} ayudan a **empresas enterprise**?" + golden-set calibrado sobre "mejores agencias de marketing/diseño en Chile". El motor sólo mide válidamente marcas que **son** agencias/proveedores B2B. Para una marca de consumo (aerolínea, retail, banca), la pregunta correcta es de intención de compra del consumidor ("¿cuál es la mejor aerolínea en Chile?"), que el grader nunca hace → la IA correctamente no menciona "agencias de aviación para empresas" → score 0.

El score 0 es un **artefacto de medición**, no la realidad.

## Impacto

- **Comercial (alto):** el cross-sell operador (TASK-1279) puede apuntarse a cualquier marca; un diagnóstico falso enviado a un prospecto destruye credibilidad. El grader, como está, **sólo es confiable para marcas que son agencias/proveedores B2B** (el ICP de Efeonce).
- **Producto:** el grader no generaliza a marcas de consumo / no-agencia, que es la mayoría de los prospectos enterprise (aerolíneas, banca, retail — el ICP Globe).
- Afecta también al lead magnet público y al portal cliente si se corre sobre marcas no-agencia, no sólo al cross-sell.

## Solución

**Mitigación inmediata (aplicada 2026-06-29):**

- Cross-sell operador **gateado OFF** en staging: flag `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` removido de Vercel staging + `ops-worker` a `false` (rev `00424-p9z`) + `deploy.sh` staging default OFF. No se reabilita hasta que el motor valide categoría + modelo de negocio.
- Artefactos falsos de Sky Airlines limpiados: Lead HubSpot `566830815132` borrado + props `ai_visibility_*`/`aeo_check_result` de la company limpiadas. (El informe público en staging queda detrás de SSO con token no enumerable, delinkeado de la company.)

**Fix de fondo (programa de tasks):** **motor de generación de prompts brand-aware** (EPIC) — ver el desglose en las tasks relacionadas:

1. **Resolución de categoría canónica** — mapear HubSpot industry enum (y website intelligence) al nodo de la taxonomía + label localizada; el perfil guarda `category_node_id` + `category_label`, NUNCA el enum crudo. Guard: categoría no resuelta → run/envío bloqueado.
2. **Clasificación de modelo de negocio** — `business_model` en el perfil (`consumer_b2c` / `b2b_service_provider` / `b2b_product_saas` / `retail_ecommerce` / `marketplace` / …), que decide el framing del buyer-intent. Clasificador determinista + override operador.
3. **Packs de prompts por arquetipo** — fan-out por arquetipo × etapa de buyer-intent (Query Fan-Out), reemplazando el pack único de agencia. Scoring determinista INTACTO (sólo cambian las preguntas).
4. **Review/approval del operador** — validar categoría + modelo de negocio + preview de prompts antes de correr sobre un prospecto.
5. **Eval golden-set por arquetipo** — regresión multi-arquetipo (aerolínea consumo, SaaS, retail).

## Verificación

- Correr el grader sobre Sky Airlines con el motor nuevo → prompts de consumo ("¿mejores aerolíneas en Chile?") → SKY aparece → score realista (no 0).
- Re-correr el golden-set extendido (multi-arquetipo) verde.
- El cross-sell operador rechaza correr/enviar si `category_node_id=unknown` o el arquetipo no fue confirmado.

## Estado

resolved (2026-06-30) — cerrado por EPIC-021 (5/5 tasks complete). Motor brand-aware (TASK-1288 categoría canónica + TASK-1289 eje `business_model` + TASK-1290 packs por arquetipo, scoring intacto) + guard del operador (TASK-1291 `assertSubjectGradeable`) + eval de cobertura por arquetipo (TASK-1292) deployados a `main` con sus flags ON en Production (release `056c2dde8`) y staging (parity flip + redeploy `greenhouse-bt9fvga8d`). Verificación: smoke staging `operator_gate_blocking=ok` (0 prospectos no graduables, `operator_send_enabled=true`); SKY scorea con prompts de consumo (15 prompts, 0 agency leak en TASK-1290). Residual menor: re-enable de la cross-sell bajo aceptación de riesgo del operador (no sign-off legal formal aparte); smoke E2E del SEND con email real diferido para no spamear (cubierto por el guard + signal steady).

## Relacionado

- TASK-1279 (cross-sell operador — el smoke que lo destapó; gateado OFF).
- TASK-1286 (auto-provisión del grader_profile — origen del `category=org.industry`).
- EPIC + tasks del motor de prompts brand-aware (a crear).
- `src/lib/growth/ai-visibility/{provision-profile.ts, prompt-pack.ts, prompt-packs/*, taxonomy/*}`.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`.
