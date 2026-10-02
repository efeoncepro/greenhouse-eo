# TASK-1951 — AEO X-Ray: dossier inmersivo landing y artículo Pichincha

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1951-aeo-xray.md`
- Flow: `docs/ui/flows/TASK-1951-aeo-xray-flow.md`
- Motion: `docs/ui/motion/TASK-1951-aeo-xray-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Demo autónoma Think publicada y aceptada por el operador; Experience original extendida, landing/artículo/derivados y motion verificados; integración con grant Greenhouse pendiente`
- Rank: `1`
- Domain: `content|growth|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; Think y AXIS checkout actual; sin worktrees`

## Summary

AEO X-Ray: dossier inmersivo landing y artículo Pichincha. Ejecuta el plan aprobado del 30/09/2026 para un dossier con landing y blog
completos, composición por tokens y acceso tokenizado por edición.

## Why This Task Exists

El X-Ray actual limita el contenido a un artículo estático y carece de control de acceso revocable.
El banco necesita evaluar trabajo real y sus decisiones técnicas antes de la reunión.

## Goal

- Entregar experiencia de lectura e inspección inmersiva, contenido financiero verificado y responsive.
- Preservar SKY y distinguir muestra, propuesta y medición.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/think/aeo-xray-composer-extension-plan-2026-09-30.md`
- `docs/think/radiografia-aeo-architecture.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/EFEONCE_AEO_XRAY_COMPOSITION_AND_SHARING_DECISION_V1.md`

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1950 para integración final; desarrollo UI autorizado en paralelo con fixtures, contrato AXIS ya disponible.
- Runtime existente Think y primitives de acceso Greenhouse; contratos AXIS.

### Blocks / Impacts

- Piloto Banco Pichincha Perú, preservando muestra SKY de TASK-1410.

### Files owned

- `../efeonce-think/src/` y scripts de QA X-Ray V2.
- Docs UI y payload Pichincha.

## Current Repo State

### Already exists

X-Ray estático en `../efeonce-think/src/content.config.ts` y `src/lib/efeonce-insights/sharing/` como patrón.

### Gap

Un artículo fijo y URL sin revocación. Faltan composición multipieza, edición y grant propios.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/aeo-xray/` propuesto en Greenhouse; Think y paquetes existentes AXIS
- Future candidate home: `remain-shared`
- Boundary: `manifest AXIS validado y proyección XRayWebModel; commands/readers dueños del acceso`
- Server/browser split: `DB y bearer sólo servidor; browser recibe contenido allowlisted sin secretos`
- Build impact: `contrato AXIS generado con hash; sin nuevo deployable ni librerías pesadas`
- Extraction blocker: `authz y persistencia permanecen en Greenhouse; Think sólo API`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- User: evaluador comercial/técnico Banco Pichincha Perú.
- Job: apreciar landing y artículo completos, explorar decisiones con evidencia.
- Outcome: dossier inmersivo compartible sin simular resultados del banco.

### Surface & system decision

- Superficie: Think SSR; Nav placement: `none` en portal, entrada por enlace.
- Extiende renderer Article/Instrument; shell Efeonce y espécimen cliente independientes.
- Tokens: AXIS contrato X-Ray; identidad Pichincha desde investigación fuente.
- Copy: diccionario Think y payload autorado versionado; no texto interno del CRM.

### State inventory

Lectura/explorar, selección/foco, contenido largo, móvil, sin JS, permiso inválido,
expirado/revocado, límite y error transitorio. Nunca contenido previo ante denegación.

### Interaction contract

Recorrido original de cuatro pasos por step/artifact relativos; TOC por anclas; instrumento
con scope bloque/página/sitio y acoplamiento original; derivados con linaje; Escape y retorno de foco; CTA de muestra sin captación.

### Motion / microinteractions

Coreografía original completa: morph de pieza a radiografía, entrada lateral, rail estable, CTA de lectura progresivo y acoplamiento. Reduced-motion preserva información y estado.

### Implementation mapping

- Route: `../efeonce-think/src/pages/aeo-xray/r/[token].astro` nueva.
- Components: extraer experiencia original íntegra a `../efeonce-think/src/components/aeo-xray/Experience.astro`; reutilizar Article/Instrument, extender specimen landing.
- Reader: adapter SSR al endpoint propio Greenhouse; contrato AXIS generado con hash.
- Reuse: StatusScreen y BaseLayout sin analytics; renderer editorial preservando legacy.

### GVC scenario plan

- Quality profile: premium
- Scenario: verify-aeo-xray-v2 en Think.
- Steps: brecha → pieza → radiografía → derivados para landing y artículo; transiciones y estados grant.
- Viewports: desktop 1440x1000 y mobile 390px (390x844) con touch real.
- Captures: primer fold y páginas completas; inspector enfocado y estados.
- Assertions: overflow, foco, contenido, tokens ausentes de HTML, reduced-motion.
- Dossier: docs/ui/reviews/TASK-1951-aeo-xray/.

### Design decision log

- Visual mode: `repo-native-benchmark`; direction: `docs/ui/visual-directions/aeo-xray-pichincha-2026-09-30.md`.
- Decisión: dossier artifact-first, lectura plena y radiografía opcional.
- Alternativas: inspector permanente y slides descartados por comprimir contenido.
- Reuse/extend: componentes nativos Think; contrato portátil AXIS.
- Riesgo: fuente/media propietaria; usar assets permitidos y no simular licencia.

### Visual verification

Desktop y móvil capturados/mirados; scrollWidth <= clientWidth; teclado, noJS y
reduced-motion; contraste ambas marcas; scorecard premium media >=4.5 y piso >=4.
Primer fold se revisa antes de completar la implementación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation

Contrato validado y fronteras explícitas conforme al plan, documentación y fixtures.

### Slice 2 — Implementación e integración

Experience original compartida, landing/blog, banners, TOC, instrumento concreto, derivados sociales, coreografía completa, acceso SSR y QA visual.

## Out of Scope

Editor visual drag-and-drop, CMS del banco, captación bancaria, envío de correo y cambios CRM.

## Detailed Spec

El detalle de entidades, payload, grafo, UX, invariantes y aceptación vive en el plan aprobado
`docs/think/aeo-xray-composer-extension-plan-2026-09-30.md`; no duplicar el canon.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contrato y ADR → foundation/renderer en paralelo → integración → contenido revisado → QA → rollout.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga bearer o borrador | acceso | medium | grant y proyección allowlisted, no-store | prueba negativa falla |
| Romper muestra SKY | Think | medium | legacy independiente y regresión | gate browser |
| Claim financiero inválido | contenido | medium | fuentes fechadas, revisión humana | QA editorial |

### Feature flags / cutover

Nuevo acceso default OFF durante construcción; preview local con fixture explícita sin ruta productiva.

### Rollback plan per slice

Desactivar entrada nueva; conservar snapshots y revocaciones. Migración additive sin backfill destructivo.

### Production verification sequence

Gates locales → staging API/SSR → negativos acceso → revisión visual → release gobernado → readback.

### Out-of-band coordination required

Release y distribución AXIS conforme al control plane; no publicar automáticamente tras tests locales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Contrato y límites de ownership implementados y validados localmente; AXIS portable y renderer original conservado. Evidencia en el dossier de implementación y pruebas focales; no implica rollout del provider.
- [ ] Edición fija y grant no revelan borrador ni otra organización; revocación y expiración verificadas.
- [x] Dos piezas del caso Pichincha funcionan sin ramas por cliente y SKY no regresa. Evidencia local: cierre de verificación abajo.
- [x] Evidencia de publicación de la demo autónoma, recuperación y pendientes registrada: Think `be8d484`, deployment `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB` READY con alias; provider/grant Greenhouse separado y pendiente. Ver [dossier](../../think/aeo-xray-implementation-dossier-2026-09-30.md).
- [ ] UI ready sólo yes tras mapping, GVC y decision log; wireframe/flow/motion gates pasan.
- [ ] Desktop y 390px sin overflow, foco/touch/noJS/reduced-motion y scorecard revisados.
- [x] Landing y artículo incluyen banners, texto completo, TOC editorial y fuentes verificadas. Evidencia local: cierre de verificación abajo.

## Verification

- Gates focales de contrato/runtime descritos en el plan aprobado.
- `pnpm task:lint --task TASK-1951`
- `git diff --check`

## Closing Protocol

- [x] Lifecycle in-progress, archivo, registry y README sincronizados con evidencia; integración pendiente explícita.
- [x] Handoff/changelog, arquitectura, documentación y manual actualizados; dossier y skills enlazados.
- [x] Impacto cruzado revisado: Think, AXIS, Greenhouse y CRM separados; no se publica Greenhouse ni se envía correo por inferencia.

## Follow-ups

Exportación PDF/deck y editor visual sólo si nuevo pedido los requiere.

## Corrección vinculante del operador — 2026-09-30

El operador rechazó la construcción de una experiencia paralela reducida. La implementación debe
extender el X-Ray original completo: brecha, pieza, radiografía, derivados sociales, avance y
coreografía motion. Conservar su DOM/estilos/semántica/interacciones al extraer un componente
Experience compartido por legacy y nuevo acceso. El artículo reutiliza Article existente; landing
extiende la misma experiencia. El renderer V2 simplificado no constituye cumplimiento y se retira
cuando el reemplazo por el original esté operativo. Los contratos UI fueron reescritos íntegramente y pasaron wireframe/flow/motion con cero findings antes de conectar la extensión visible.

Fotografías generadas v1 rechazadas por apariencia ficticia. No cuentan como QA aprobada.
Se revisa dirección con referentes fotográficos reales; no se corrige sólo agregando textura al prompt.

## Corrección visual del operador — referencia bancaria

El operador rechazó también la composición rígida de foto vertical. Se conserva la extensión original
y se rediseña el espécimen landing/blog desde su captura oficial: banner panorámico, identidad
bancaria, jerarquía editorial y beneficios por moneda. Product Design se aplica al proyecto existente.
Los asserts funcionales anteriores no constituyen aprobación visual de esta revisión. Producto:
Cuenta de Ahorros Preferente; no introducir cuenta corriente.


## Cierre de verificación local — 2026-09-30

La implementación usa Experience original compartida; fork V2 retirado. Landing de Cuenta de Ahorros Preferente con banner/logo de referencia oficial; blog con fotografía real, título/banner amplios, TOC y lectura móvil24px. No queda cuenta corriente en payload activo. Capturas finales `../efeonce-think/.captures/aeo-xray-extension/final-*`; auditoría visual `../efeonce-think/design-qa.md` pasa local, sin inferir aprobación del operador.

Astro check/build PASS;9 pruebas unitarias;46 regresiones legacy;195 checks de extensión (cuatro pasos, dos piezas,1440/390/320, privacidad,noJS,orígenes);7 hashes de distribución. Root verificó navegación pieza→radiografía en IAB y revisó capturas finales landing, blog móvil y página completa. Composición, social, linaje y coreografía originales conservados. Grant con actor real, entorno compartido, release/readback y aceptación humana permanecen pendientes; no se marca complete.


## Continuidad multicliente — 2026-09-30

Pedido del operador: dejar preparado el siguiente cliente. Kit local en `scripts/aeo-xray/client-kit.mjs` y plantilla neutral `docs/think/templates/aeo-xray-client.intent.json`; guía `docs/think/aeo-xray-nuevo-cliente.md`. Inicializa sin datos, métricas ni medios bancarios, conserva cuatro pasos/derivados, rechaza sobrescritura y composición incoherente. Test del kit PASS. Think recibe manifest/assets por XRAY_CASE_DIR y fixture-client sólo DEV; no cambia el acceso productivo. Revisión creativa por cliente y rollout permanecen separados.

Verificación del delta multicliente: Think check sin errores/warnings, build PASS,15 pruebas unitarias PASS y diff-check PASS. El starter neutral real fue aceptado por reader y adaptExperience:2 piezas,4 pasos y1 derivado por pieza, sin comparador o fotografía inventados. Compatibilidad de manifest Pichincha y sus3 assets verificada; preview4345 preservada.

Auditoría posterior: se detectó y corrigió regresión de especificidad en hero desktop de Landing. Gate de geometría desktop/móvil añadido;198 checks de extensión PASS sobre código actual. Captura desktop corregida inspeccionada. Estado integral y pendientes: `docs/think/aeo-xray-completion-audit-2026-09-30.md`.

## Entrega aceptada y publicación autónoma — 2026-09-30

El operador confirmó «Bien, terminamos» tras verificar el telón y pidió preparar el correo previo a la reunión. La aceptación se refiere a la demo de Efeonce; no equivale a aprobación del banco ni a publicación en pichincha.pe. Think `main` quedó en `be8d4841e1124818bd7f4c88d0d7ad7b970e5122`, deployment `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB` READY y alias `think.efeoncepro.com`, con lectura real de SHA y UI. Se conserva el enlace del caso fuera de Git.

La demo usa el carril `sample_`: dos piezas, cuatro etapas originales y contenido por manifiesto. No depende del despliegue Greenhouse. Se añadieron landing modular, blog completo, dos banners contextuales, tres piezas de feed, una Story y un video vertical real de diez segundos; marcas oficiales AXIS y cliente, footer compacto, iconografía, oportunidad con evidencia y protocolo de medición, transiciones nativas y telón de bienvenida por pestaña. El selector tiene iconos y cápsula activa deslizante con etiquetas capturadas encima. No es una auditoría de rendimiento del dominio del banco.

Telón: 1.400 ms, curva simétrica, apertura vertical y ascenso coordinado del contenido. La minificación CSS convirtió `1400ms` en `1.4s`; `parseFloat` aislado provocaba un salto casi instantáneo sólo en producción. El fix normaliza segundos/milisegundos para WAAPI y la regresión ejercita ambas representaciones. **44 checks del telón pasaron localmente y en el enlace productivo** (desktop,390,320,teclado,Escape,reduced motion,noJS,storage bloqueado,deep links/historial). **49 checks de motion/navegación pasaron localmente**. Check/build Astro sin errores/warnings; capturas y video de evidencia en `.captures/aeo-xray-selector/`, `.captures/aeo-xray-curtain/` y `.captures/aeo-xray-motion/`, ignorados.

Esta entrega satisface el envío comercial solicitado. La task conserva `in-progress` por su alcance de integración: faltan actor real, migración/storage compartidos, canary de grant/assets/revocación y rollout independiente autorizado de TASK-1950. El usuario indicó expresamente no pasar Greenhouse a producción. Históricos de QA local anteriores se mantienen como evidencia fechada, no como estado actual.
