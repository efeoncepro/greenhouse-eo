# TASK-1938 — Plan de refresh del PDF

## Autoridad y objetivo

Operador 2026-10-03: implementar el refresh del PDF existente, preservar robustez, modelo de métricas y lógica de envío. Goal confirmado: trabajo en `develop`, sin worktrees, revisión independiente; cierre local con evidencia, rollout pendiente hasta autorización. Hook ejecutado con `--develop --subagents`. No commit/push/publicación automáticos.

## Audit

- Correcto: react-pdf ya genera cuatro páginas A4; adjunto y descarga usan el mismo snapshot público congelado. Diseño aprobado de seis páginas, 24 hojas y fuentes del canvas disponibles.
- Desactualizado: las versiones de la task son anteriores a las instaladas (tokens 0.3.41, contracts 0.3.40, assets 0.4.15, graphic-line 0.11.0). No bajar versiones ni actualizar toda la flota. Órbita nativa con geometría y tokens ya disponibles.
- Reuso: renderer, `ensurePdfFontsRegistered`, build de recursos PDF, viewFacts del reporte, copy canónico, reglas de gravedad del productor. Sin consulta a proveedores ni cálculo de nuevos puntajes.
- Boundary: snapshot público → modelo existente → proyección pura de presentación PDF → react-pdf → Buffer → consumers actuales. Datos internos y `providerFindings` nunca cruzan.
- Audiencia comercial: distinta de `model.audience` (disclosure). Contexto opcional y aditivo antes del render; sólo autoridad server-side puede seleccionar cliente. Sin contexto, conserva prospecto; contexto inválido falla cerrado. Un logo ausente deja nombre; fecha del siguiente informe desconocida se omite. Julio Reyes es el default único aprobado.
- Tendencia: attachment la excluye hoy; se conserva esa política. No simular primera medición cuando existe histórico excluido. El diseño se aplica a las secciones permitidas; no alterar el contrato de divulgación en un refresh.
- Umbral 45 en niveles del modelo compartido es deuda anterior. Las etiquetas del PDF se proyectan con `resolveSeverity` canónico (40/70), sin mutar scores ni cambiar los otros adapters. SOV toma `viewFacts.sharePct`; sentimiento conserva todas las categorías.
- SSOT de marca: AXIS posee valores/roles, Greenhouse el adapter. Anatomía adicional se canoniza de forma aditiva en AXIS. Su integración local debe ser reproducible y mantener instalables los pins publicados; ninguna referencia `file:` a otro checkout ni dependencia de una versión inexistente.
- Eslogan Engine usa divisor 11.263; el 11.586 histórico es Growth. Pie específico aprobado prevalece sobre el overlay genérico de informes.
- UI nativa de documento: A4; GVC de portal/390 px no aplica. Evidencia sobre PDF exportado, color y gris, texto, fuentes, enlaces y límites de hoja.

## Arquitectura y placement

Topología sin cambio. `src/components/growth/ai-visibility/report-artifact/pdf/**` sigue siendo server-only; no import desde browser ni barrel web. Archivos de fuentes y PNG viajan por los inputs existentes de Vercel y ops-worker. Referencias: arquitectura pública AI Visibility Grader, ADR de composición AI Visibility Report en AXIS, decisión shared UI platform y estándar de entrega de informes.

### Procedencia y fallbacks del contexto visual

`report/pdf-presentation-context.ts` sólo agrega lecturas de metadata a los consumers después de sus gates. No altera comandos, contratos públicos, esquema, snapshot ni lógica de envío. `runId` y `asOf` provienen del snapshot autorizado; locale prioriza `publicReport.provenance.market.locale`, después run/perfil y finalmente el resolver `es`. No consulta histórico ni proveedores. El reader importa tipos de presentación; ninguna dependencia runtime del componente web cruza al worker.

La audiencia cliente exige `audienceSource: organization_commercial_facts` y facts de la organización vinculada por run/perfil. Dos vínculos distintos, identidad ausente o facts no recuperables producen error; operator conserva su exception path y dispatch conserva mark-failed/retry, nunca se infiere prospecto ante contradicción. Los snapshots válidos heredados tienen las FK obligatorias `grader_reports.run_id → grader_runs.profile_id → grader_profiles`; run/perfil sin organización se conservan como intake público. La metadata comercial es vigente y verificada, mientras métricas/copy desconocido del snapshot permanecen congelados.

El logo sale únicamente de `readOrganizationLogoForRender`, reutilizando asset adjunto, tipo, ownership, MIME y tope 2 MiB. El propósito aditivo `ai_visibility_report_cover` queda auditado sin ampliar permisos. PNG/JPEG/WebP/SVG se normalizan a PNG con 16 millones de píxeles de entrada, máximo 960 × 480 y tope de salida 2 MiB; no se consulta URL privada ni firmada. Variante oscura sólo si existe; logo ordinario conserva sus colores sobre lecho claro. Ausencia/error de logo conserva cliente y nombre, con observabilidad redactada. No existe fecha acordada del próximo informe en estas fuentes: se omite; la programación de un run no reemplaza esa fecha.

La proyección conserva `sharePct` crudo y muestra porcentajes enteros; sentimiento incluye mixto; coverage distingue null/cero/no respuesta. Los tres diccionarios viven en `src/lib/copy/ai-visibility-report-pdf.ts`. Sólo plantillas exactamente reconocidas se localizan; texto congelado desconocido se conserva. La tendencia sigue excluida del attachment: `trend: null`, con estado oculto distinto de primera medición.

## Slices y ownership

1. `pdf_design_contract`: AXIS, sólo anatomía editorial aditiva, tests y export reproducible; sin release.
2. `pdf_dependencies_qa`: fuentes estáticas y registro aditivo; recursos oficiales específicos PDF y build reproducible. Sin alterar alias compartidos ni recursos ajenos.
3. `pdf_runtime_mapping`: proyección pura, diccionarios es/en/pt-BR, reader de contexto, transporte aditivo en consumers y tests focales. Sin cambios al modelo, métricas, API pública, auth ni lógica de envío. Extensión mínima del propósito del byte reader de logo, preservando su authorization/ownership.
4. Root: tokens del adapter, renderer de seis páginas, firma compatible, integración y documentación. Los consumers sólo transportan contexto visual; no alteran destinatarios, consentimiento, gates, idempotencia, snapshot ni envío.
5. Root + revisión independiente: PDFs sintéticos de seis combinaciones, estados límite, tests focales y gates de build. Verificación staging/producción queda explícitamente pendiente de rollout.

## Verificación

- Baseline 2026-10-03: `report-artifact-pdf-no-leak` + `build-report-attachment`: 2 suites, 7 tests PASS.
- Slice presentación/contexto: 7 suites / 71 tests PASS; ESLint y diff-check focales PASS. Incluye command operator original intacto, gates previos a metadata, contrato del adjunto, vínculo contradictorio, fallback legacy, propósito y ownership del logo. Todas las IO mockeadas; ningún envío, DB real ni diagnóstico de cliente ejecutado.
- Datos: sin dato frente a cero, 39/40/44/45/69/70, 100; cobertura parcial, sentimiento mixto, benchmark y fuentes vacías.
- Diseño: comparar 24 hojas únicas, seis PDFs completos, fuentes embebidas, texto seleccionable, marca oficial, seis páginas sin clipping y enlaces reales. Textos largos deben envolver; nunca truncar silenciosamente.
- Antifuga: comprobar texto del PDF exportado además de árbol React; la prueba anterior no inspecciona subcomponentes.
- Integración: download/adjunto, inputs Vercel/worker, typecheck/lint/tests/build proporcionales. No enviar correos ni crear diagnósticos de clientes como QA local.
- Cierre: acceptance criteria con evidencia, dossier/scorecard, task/registry/handoff al día. La task permanece in-progress mientras falte rollout.
