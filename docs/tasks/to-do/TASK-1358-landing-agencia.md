# TASK-1358 — Home de agencia: Elementor modular y cierre editorial

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1358-landing-agencia.md`
- Flow: `docs/ui/flows/TASK-1358-landing-agencia-flow.md`
- Motion: `docs/ui/motion/TASK-1358-home-agency-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Avanzada`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `checkout compartido actual; sin cambio de branch ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La Home pública ya sirve el diseño de Claude Design adaptado a widgets semánticos Elementor.
Esta task conserva su ubicación administrativa `to-do` y `UI ready: no` porque no está cerrada:
faltan claims residuales/SEO global y QA del editor y del teclado del video. `Status real: Avanzada`
describe el runtime publicado, no una implementación futura.

No construir una URL `/agencia/` separada ni restaurar el carril HTML o formulario demo.
[PDR-010](../../public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md) gobierna la ruta.
El [plan anterior preservado](../../audits/public-site/history/2026-08-30-agency-task-before-consolidation.md)
es histórico, no ejecutable.

## Why This Task Exists

Consolidar el pitch de agencia en la Home, mantener edición real en Elementor y preservar las
microinteracciones del diseño aprobado. Publicar el diseño no equivale a aprobar todos sus textos,
cifras comparativas, promesas o medición comercial.

## Goal

- Mantener la Home modular publicada sin alterar header/footer globales.
- Cerrar copy/claims/SEO mediante revisión explícita y evidencia.
- Completar QA de edición y accesibilidad sin confundir pruebas de renderer con navegador real.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- [Contrato técnico vigente](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).
- [Primitives públicas](../../architecture/public-site/PRIMITIVES.md).
- [PDR-010: Home es el pitch](../../public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md)
  refina el planteamiento anterior de PDR-008; no reabrir la ruta separada.
- [Route ownership](../../operations/public-site-route-ownership-matrix-20260616.md).
- Runtime en repo hermano `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`;
  Greenhouse conserva scripts gobernados y documentación, no el frontend WordPress.

## Normative Docs

- Skill `efeonce-public-site-wordpress`, referencias `elementor-mutation.md`,
  `source-led-elementor-patterns.md` y `landings/home-claude-design-preview.md`.
- [Funcional](../../documentation/public-site/agency-elementor-preview.md) y
  [manual](../../manual-de-uso/public-site/agency-elementor-preview.md).
- Para la revisión editorial pendiente: `docs/context/00_INDEX.md`, marca, voz/tono,
  ICP y oferta vigente; skills de copywriting, SEO/AEO y CRO. No canonizar claims por aparecer en el HTML.

## Dependencies & Impact

### Depends on

Acceso WordPress para QA real del editor; aprobación editorial del operador; contratos públicos
de Elementor, enlaces y calendario existentes. No se requiere crear otro backend de captación.

### Blocks / Impacts

Home pública, derivación hacia landings y portafolio; no cambia el portal privado ni header/footer.

### Files owned

- Contrato y manuales anteriores; `scripts/public-website/*agency*.php` y verificadores asociados.
- Runtime: schemas/templates `includes/agency/`, clases `class-eo-agency-landing-*.php`,
  CSS/JS `agency-*` y assets `assets/img/agency/`.
- Cambios futuros sólo con ownership explícito; no sobrescribir otros widgets del checkout.

## Current Repo State

### Checkpoint editorial vigente · 2026-08-31

Las ocho rondas solicitadas están publicadas: hero, copy de secciones anotadas, comparación
cualitativa, jerarquía FAQ y encabezado Con + logo. Readback remoto nuevo: 17 widgets, cero HTML,
407 controles raíz y seis repeaters; SHA `9aa8c770c0907edc5ad70f4489cccedb56cc03d0a7802e01eef0e2beee832562`.
Doce archivos del runtime coinciden local/remoto. [Cierre editorial](../../audits/public-site/2026-08-31-home-editorial-closure.md).
Docs y skills se consolidan con subagente; runtime hermano y SEO previo quedan fuera del commit.
Se conserva `to-do`/`UI ready: no`: faltan QA del editor/video y revisión de claims residuales.

### Already exists — checkpoint anterior

Readback independiente del 2026-08-30:
Home `251731`, publicada/canonical raíz, 17 contenedores + 17 widgets semánticos, cero HTML,
414 campos raíz y seis repeaters. Home anterior `2791` conservada noindex en `/home-2/`.
Hash Elementor:
`747470a5f5083b8a5d851433e10618f5c3b714889d6205c64e36a1da242091b1` tras revisión SEO/HTTPS.
Metas Yoast search/social ajustadas, dos Media HTTPS, grafo único preservado y smoke público PASS:
[audit SEO/AEO](../../audits/public-site/2026-08-30-home-seo-aeo.md). No cierra claims globales ni GSC/CWV.

Inventario y evidencia detallados, sin duplicar los contratos:
[audit de implementación](../../audits/public-site/2026-08-30-home-visual-review.md) y
[audit de consolidación](../../audits/public-site/2026-08-30-home-documentation-consolidation.md).

### Gap

- Copy/claims globales: comparación y métricas ilustrativas ya revisadas dentro del alcance anotado.
  Quedan claims residuales del hero/otras superficies y disponibilidad de productos sin certificar.
- Tabla móvil: flechas sin certificar; Servicios: verificar precedencia de opacidad inline al filtrar.
- Guardar/recargar desde la interfaz Elementor no está certificado; registro server-side sí verificado.
- Teclado dentro del iframe YouTube y recorrido completo de foco no certificados.
- Index eligible no prueba indexación en Search Console; no certificar SEO/CRO o booking/GTM end-to-end.
- Header/footer Ohio se preservaron por instrucción; su deuda editorial global no se resolvió aquí.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`
- Future candidate home: `public`
- Boundary: widgets semánticos y schema Elementor; no monolito HTML.
- Server/browser split: PHP renderiza contenido/control; JS condicional gestiona interacciones.
- Build impact: paquete WordPress acotado; no cambio de build Vercel.
- Extraction blocker: no migración de runtime autorizada en esta task.

## UI/UX Contract

### Experience brief

Fidelidad al cuerpo del export Claude Design, luego ajustes explícitos del operador.
Header/footer globales fuera del reemplazo; contenido final todavía sujeto a revisión.

### Surface & system decision

`extend`: 17 widgets semánticos sobre el renderer compartido, con controles Elementor nativos.
`reuse`: Logo Marquee, Brand Proof Avatar Group y calendario existente `/agenda/`.
No volver a HTML widget ni a clones locales de estos primitives.

### State inventory

Filtros Todo/Marketing/Tecnología; FAQ cerrada/abierta; CTA normal/hover/focus;
video cerrado/abierto/cerrado de nuevo; editor, no-JS y reduced motion.
El formulario demo ya no es un estado de esta Home.

### Interaction contract

Cuatro servicios con URL existente y ocho sin enlace; Casos → `/portafolio/`;
Agenda → `/agenda/`; CTA móvil conserva `#agenda`.
Showreel carga al clic en dialog y elimina el iframe al cerrar. El URL es control nativo,
no un binding inyectado al botón. No registrar una conversión sólo por abrir el video.

### Motion & microinteractions

[Contrato as-built](../../ui/motion/TASK-1358-home-agency-motion.md):
bucle continuo, hover original de avatares, halos y animación reducida.
Player nativo mantiene controles; teclado cross-origin queda como gate pendiente.

### Implementation mapping

Schema → control Elementor → template semántico → CSS/JS page-scoped.
URL usa estructura de control URL, no string vacío; Media conserva identidad del asset.
Guardado vía `Document::save`, metadatos protegidos y hash previo; ver contrato técnico.

### GVC scenario plan

Desktop 1280/1440, tablet 890 y móvil 390; overflow, filtros, FAQ, hover/focus,
video real y cierre, reduced motion, remount del editor y enlaces.
Las capturas previas son evidencia fechada, no una ejecución nueva de navegador.

### Design decision log

El operador sustituyó el rail HTML por Elementor, promovió la preview a Home,
retiró formulario y Verk, ocultó aviso de lanzamiento, incorporó assets oficiales y trabajos,
pidió recuperar hover de logos, enlazar servicios, simplificar Casos y reproducir showreel.
Estas decisiones están materializadas; el histórico del plan no debe revertirlas.

### Visual verification

Pruebas responsive e interacción previas en audit visual; readback y suites repetidos durante
la consolidación documental. JSDOM con shims no demuestra el focus trap nativo del navegador.

<!-- ZONE 2 — PLAN MODE -->

## Plan

1. Consolidación documental: reconciliar fuentes, skills espejadas y evidencia sin mutar producción.
2. Próxima ejecución: QA real de guardado/recarga Elementor y teclado/player.
3. Revisar copy/claims/SEO y obtener aprobación; no mezclar rediseño global sin nuevo alcance.
4. Registrar evidencia final, sincronizar lifecycle/carpeta/índices cuando todos los AC estén satisfechos.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

Mantener como baseline el contrato as-built. Detalle por módulo en arquitectura y funcional;
historia de cada ajuste, hash y snapshot en audit visual. El cierre pendiente no autoriza
volver a placeholders, formulario demo, cards de Casos o `/agencia/`.

## Out of Scope

Cambiar header/footer, migrar a Astro, crear un scheduler, reescribir la oferta global,
inventar cifras o landings, commit/push/release automático.

## Detailed Spec

[Agency Elementor Modules V1](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md)
es el contrato técnico único. Los wireframe/flow originales están marcados históricos y apuntan
al as-built; la dirección específica del showreel vive en
[Home showreel modal](../../ui/visual-directions/home-showreel-modal.md).

## Rollout Plan & Risk Matrix

Home ya promovida; snapshot cutover `_gh_home_cutover_20260830_162109`.
Último snapshot de contenido: `_gh_home_video_20260830_195821`;
backup de paquete `/tmp/eo-agency-before-20260830-195756.tar`.
Los writers de revisión tienen hashes previos específicos: no reutilizarlos ciegamente.
Despliegue atómico por archivo no equivale a transacción multiarchivo ni rollback automático.
Procedimiento de recuperación y límites en manual; no se ensayó rollback en esta consolidación.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Home publicada en raíz con antigua Home conservada y SEO protegido.
- [x] Elementor semántico, assets/microinteracciones y revisiones solicitadas materializados.
- [x] Servicios con destinos verificados, CTA Casos, agenda sin form y showreel configurable.
- [x] Contrato técnico, funcional, manual, evidencia y skills reconciliados con estado vivo.
- [ ] Editor real: edición representativa, guardar/recargar, metadatos y hash verificados.
- [ ] QA manual completa de teclado/player y remount; resolver o acotar fallas con evidencia.
- [ ] Copy/claims/SEO final aprobados y mecanismos de medición/conversión verificados en su alcance.
- [ ] Lifecycle/carpeta/índices cerrados sólo con evidencia final.

## Verification

Readback WP-CLI, contrato PHP, lifecycle JS y geometría de marquee:
[audit de consolidación](../../audits/public-site/2026-08-30-home-documentation-consolidation.md).
PHP contiene 281 aserciones textuales, no 281 pruebas de comportamiento; complementar con runtime/browser.
No hubo cambios de producción, reservas, leads, commit o push durante la consolidación documental.

## Closing Protocol

Mantener task abierta. Responsable de QA: próximo ejecutor con acceso al editor; aprobación
editorial: operador. Usar governance documental, task lint y context strict como último gate.
Cuando haya evidencia suficiente, mover lifecycle y sincronizar índices en el mismo cambio.

## Follow-ups

1. Verificar sesión WordPress y ejecutar save/reload real sin alterar contenido comercial.
2. Completar prueba de teclado entrando y saliendo del player en navegador real.
3. Revisar claims residuales y SEO global con fuentes; scope separado para header/footer si se autoriza.

## Open Questions

No hay una decisión pendiente de slug o de promover la Home: ya están resueltas.
La aprobación editorial global y la certificación QA restante siguen abiertas.
