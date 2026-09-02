# Home — checkpoint histórico previo a consolidación

> No ejecutable. Estado actual en Handoff activo y contrato Agency Elementor.

<!-- session-sha256:62d551275e402f89063e6366b298d6f25faa5ba50ffc44fa8f3bd9d43c70c3ef -->
## 2026-08-30 — TASK-1358: Claude Design / Elementor ya es la Home

**Estado vigente posterior:** el operador autorizó hacer esta página la Home. `page_on_front=251731`,
menú Home `247118` actualizado; canonical raíz e `index, follow`, SEO title/description/OG anteriores
preservados. Home `2791` conservada en `/home-2/` con noindex y contenido intacto; la URL de preview
redirige a `/`. Snapshot durable `_gh_home_cutover_20260830_162109`; script `promote-agency-home.php`.
Verificado WP-CLI + Browser 1280/390 (17 widgets, cero HTML, sin overflow/errores, filtros/FAQ/modal/foco).
Los seis comentarios posteriores quedaron aplicados: contraste, 10 piezas de la Home anterior, sprocket
HubSpot, logos compartidos de Redes Sociales y agenda horizontal sin form → `/agenda/`. QA 1280/890/390
verificado; [evidencia y rollback](docs/audits/public-site/2026-08-30-home-visual-review.md).
**Copy/claims y edición/guardado desde la interfaz Elementor siguen pendientes**. Sin commit/push.
Segunda revisión aplicada: Ecosistema claro, CTA teal, FAQ sin solape a 890 px y segundo HubSpot correcto.
Cinco archivos runtime, backup `182819`; documento Elementor sin cambios, QA 1280/890/390 verificado.
Tercera revisión: hover Ohio resuelto, FAQ sin mail, cierre moderado, CRM sprocket, halos y hero proporcional.
Revisiones visuales, Servicios, CTA Casos y showreel modal publicados; snapshot `195821`, hash `30bab640…`; 414 campos/6 repeaters. Video real, cierre, móvil/reduced verificados; teclado dentro de YouTube no certificado. Evidencia/rollback en audit enlazado.

Checkpoint previo a la promoción:

El ZIP `/Users/jreye/Documents/agencia/Landing - Agencia.zip` se extrajo y auditó completo. Su HTML fuente tiene 16 regiones, 110 reveals y microinteracciones de scroll, parallax, counters, SVG draw/grow, filtros, marquee, FAQ, modal, CTA móvil y formulario. No incluye `.image-slots.state.json`, por lo que los 12 slots de medios del work-band quedaron como placeholders explícitos, sin inventar assets.

La preview `https://efeoncepro.com/home-claude-design-preview/` (WP `251731`, `noindex, follow`) fue corregida a **17 contenedores nativos + 17 widgets semánticos Elementor, cero HTML**, 452 campos de contenido y siete repeaters. Header/footer Ohio y Home `2791` intactos. Runtime desplegado con backup; frontend 1440/390, filtros/FAQ/modal, foco, reduced motion y consola verificados; motor móvil corregido para evitar superposición. Hash Elementor `d7cfbe17b45a55cacc7360122735fc44da61aefdc5159d33af2e8e3cd079ea9f`. Contrato, pruebas y rollback: [Agency Elementor Modules V1](docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md). **Pendiente inmediato:** el operador inicia sesión en la pestaña WordPress y avisa; Codex prueba edición/guardado/recarga en Elementor (registro de controles y render probe server-side ya pasan). Después: revisión visual del operador, copy/CRO/SEO, media y autorización separada de cutover. El formulario es demo, no captación. TASK-1358 sigue `to-do`/`UI ready: no`; sin commit/push.
