# ADR-018 — Efeonce Globe: continuidad móvil y aplicación companion

> Architecture Decision Record · Producto comercial Efeonce Globe · Dirección tecnológica propuesta; no autoriza todavía una app nativa ni cambios de runtime.

## Estado

- **ID:** ADR-018
- **Status:** Proposed — validación requerida; documenta una dirección native-first para Android/iOS, pero no autoriza todavía cambios nativos, de auth, push, billing ni runtime.
- **Fecha:** 2026-08-01
- **Owner:** Efeonce Globe Product / Creative Studio, con revisión de Identity, Media, API Platform, Legal/Privacy y Commercial Operations.
- **Scope:** continuidad de proyectos, sesiones, candidatos, assets, lineage, review, delivery y decisiones entre dispositivos; app companion Android/iOS, fallback web/PWA y contratos de continuidad.
- **Fuera de scope:** provider adapters, catálogo de modelos, ledger de créditos, rights engine, BFF actual, front door, despliegue externo y cualquier cambio de entitlement.
- **Reversibilidad:** two-way-but-slow. La dirección de continuidad es reversible; invertir en una app nativa, identidad móvil, distribución, notificaciones y media background work crea costo de migración.
- **Confianza:** media. La tesis responde al trabajo async y contextual del creativo, pero todavía no hay una baseline de uso móvil de Globe ni evidencia de demanda enterprise específica.
- **Validado a:** 2026-08-01 contra el runtime y la arquitectura vigentes del repo, el modelo de negocio de Creative Studio y documentación oficial de las tecnologías consideradas. La ausencia o presencia de una app de terceros no es una premisa necesaria de esta decisión.

## Contexto

Globe existe para devolver al equipo creativo tiempo y atención para pensar, explorar, dirigir y decidir. La plataforma absorbe la ingeniería operativa: elección de ruta, parámetros, retries, costo, derechos, provenance, ejecución asíncrona y trazabilidad. Esa promesa no ocurre sólo frente a un monitor: una intención aparece caminando, una referencia se captura desde una cámara, una decisión se toma en una revisión breve y un job termina mientras la persona está en otro contexto.

El runtime actual ya tiene los elementos para continuidad server-side:

- API Contract Spine con commands, readers, policies y coverage matrix compartidos.
- BFF same-origin en `studio-web`; el browser no recibe credenciales de proveedores.
- Jerarquía `workspace → project → collection → session → candidate/asset → lineage → review`.
- Jobs asíncronos, estados terminales, feed/viewer, asset governance, derechos, provenance y créditos en Globe.
- Aplicación cliente React + Vite en proceso de migración según ADR-014; responsive validation a 390 px, pero sin una estrategia móvil canónica.
- El runtime hermano está construido en TypeScript/React y ya expone `packages/contracts` y `packages/sdk`; no existe todavía un cliente móvil, una sesión nativa, un proveedor de push ni un contrato de upload background.
- El rollout sigue siendo internal-only/internal_smoke; el uso externo continúa gated por TASK-1480. La naturaleza de Globe sigue siendo producto comercial, no laboratorio.

La conversación de mercado debe leerse con precisión. Magnific publica una aplicación oficial para iPhone/iPad (antes Freepik); Runway documenta apps móviles y también experiencias que requieren navegador móvil; la documentación pública de Higgsfield se presenta principalmente como un conjunto de aplicaciones web. Estos hechos no prueban qué debe construir Globe: sólo muestran que “tener o no tener una app” no sustituye una estrategia de trabajo. Fuentes consultadas: [Magnific AI en App Store](https://apps.apple.com/us/app/magnific-ai-video-image/id1664092086) y [Runway — Mobile device compatibility](https://help.runwayml.com/hc/en-us/articles/15913840746003-Mobile-device-compatibility).

## Decisión

### 1. Globe adopta una dirección **continuity-first**

La experiencia no se modela como “desktop con un breakpoint”. Se modela como un mismo sistema creativo que conserva intención, contexto, evidencia y estado a través de dispositivos. El desktop sigue siendo la superficie de profundidad; el móvil es una superficie de continuidad y presencia.

El principio operativo es:

> **El creativo puede iniciar, observar, decidir o entregar desde el dispositivo que tenga a mano; Globe conserva la autoridad y el contexto para que el trabajo continúe sin reconstruirse.**

### 2. El móvil empieza como companion, no como copia del estudio

La primera superficie móvil debe concentrarse en las acciones de alto valor y baja densidad de edición:

- capturar una intención, referencia o nota de voz como draft;
- abrir el contexto exacto de un project, session, candidate, asset o review mediante deep link;
- seguir el estado de un job asíncrono y volver a su resultado;
- comparar una selección acotada, comentar, solicitar un refine o registrar una decisión permitida por policy;
- preparar handoff a desktop para composición, comparación profunda, edición, storyboard, delivery y operaciones.

El móvil no debe intentar ser el Producer completo en la primera iteración. El Producer desktop conserva la creación de alta densidad, la configuración de shape/route, la comparación extensa, el trabajo con múltiples paneles y las operaciones sensibles.

### 3. La autoridad sigue siendo cloud/server-side

Workspace, project, session, candidate, asset, lineage, review, rights, provenance, credits, estimates, holds, runs y deliveries permanecen en los stores y primitives canónicos de Globe. Un eventual cliente nativo es otra superficie de interacción; no es otra fuente de verdad.

Por tanto, un cliente móvil futuro:

- consumirá los mismos commands, readers y policies del API Contract Spine;
- no llamará directamente a proveedores ni contendrá provider credentials;
- no creará un backend móvil paralelo, un feed paralelo, una librería paralela ni un ledger paralelo;
- no resolverá acceso en el cliente: workspace, roles, entitlements y revocación se verifican server-side;
- tratará el offline como captura/draft local, nunca como autorización para gastar, generar, promover, publicar o cambiar derechos;
- abrirá siempre un identificador canónico, como `(workspace, project, session, asset/output)`, no una copia mutable de la entidad.

### 4. Dirección tecnológica: app nativa cross-platform desde el diseño

Android e iOS son canales de producto de primera clase. La PWA/web se conserva como fallback, superficie universal de enlace y continuidad sin instalación; no es la arquitectura móvil principal.

La dirección recomendada para la companion es **React Native + Expo development builds/CNG + TypeScript**:

- **React Native New Architecture** para una UI realmente nativa y un escape hatch de módulos Kotlin/Swift cuando cámara, media o background work lo requieran.
- **Expo development builds/CNG**, no Expo Go como runtime de producción; permiten incluir librerías nativas y cambiar configuración nativa.
- **Expo Router** para rutas tipadas, deep links y universal/app links que conserven el identificador canónico exacto.
- **Expo SecureStore** para material de sesión pequeño y sensible; OAuth/OIDC con Authorization Code + PKCE.
- **SQLite/outbox local** sólo para drafts, captura y operaciones pendientes no económicas.
- **EAS** como acelerador opcional de build/update; la arquitectura no debe depender de un proveedor de build.

La app futura compartiría contratos, SDK neutral, estados, operation keys, reconciliadores, tokens y copy gobernado; no reutilizaría componentes DOM ni convertiría el cliente web en un backend móvil. El build unit futuro viviría en el repo hermano `efeonce-globe`, previsiblemente como `apps/studio-mobile`, y se autorizaría en una task separada.

La elección tiene confianza **media** hasta probar un vertical slice real en ambos sistemas. Si el producto exige un editor móvil completo con timeline de video, 3D, AR, procesamiento local intensivo o UI profundamente distinta por plataforma, se debe comparar formalmente Flutter y una ruta Kotlin Multiplatform + SwiftUI/Jetpack Compose antes de comprometer esa superficie.

### 5. La secuencia de inversión es evidencia → vertical slice nativo → companion → studio

No se aprueba todavía un bundle ni una publicación en tiendas. La secuencia de discovery e implementación propuesta es:

1. **Phase 0 — Baseline y spike nativo:** instrumentar continuidad web como fallback y construir un vertical slice Android/iOS con PKCE, deep link exacto, inbox/job status, captura de referencia, upload interrumpible, push reconciliable y handoff.
2. **Phase 1 — Companion surface:** entregar capture, inbox, review, comentarios y decisiones acotadas mediante los mismos commands/readers/policies del API Contract Spine.
3. **Phase 2 — Field production:** evaluar cámara, voz, reference packs, background upload, share sheet, push, secure storage, MDM/DLP y media cache con ADRs específicos de identity/media/privacy/notifications.
4. **Phase 3 — Full mobile studio:** considerar creación profunda en móvil únicamente si el uso demuestra un trabajo móvil propio y existe un caso económico, operativo y de calidad claro.

Cada fase necesita una task con owner, contrato, evidencia y gates. Este ADR no crea esas tasks ni cambia flags.

## Modelo de superficies

| Contexto | Trabajo principal | No debe hacer |
| --- | --- | --- |
| **Móvil** | Capturar, recuperar contexto, observar jobs, revisar una selección, comentar, decidir y entregar el siguiente paso | Reemplazar el composer profundo, exponer secretos, ejecutar gasto offline o duplicar el backend |
| **Desktop/web** | Componer, comparar, refinar, storyboard, configurar shape/route, operar y entregar con profundidad | Convertir cada acción contextual en un flujo obligatorio de escritorio |
| **Globe cloud** | Ejecutar, aplicar policy, estimar/reservar/settle, custodiar rights/provenance, persistir lineage y reconciliar estados | Delegar autoridad económica o de acceso en una app |

## Alternativas consideradas

### A. Desktop-only con responsive como adaptación visual

**Rechazada como estrategia.** Es útil como baseline técnica, pero no resuelve captura de intención, reanudación de jobs ni decisiones breves fuera del escritorio. Mantener responsive web como Phase 0 no significa aceptar desktop-only como producto.

### B. React Native + Expo development builds/CNG

**Elegida como dirección tecnológica para la companion.** Ajusta al runtime TypeScript/React y permite compartir contratos y lógica sin convertir la app en un WebView. Expo documenta development builds para librerías y configuración nativas, mientras React Native New Architecture deja un seam tipado para módulos Kotlin/Swift. El costo aceptado es operar una toolchain móvil, mantener compatibilidad JS/native y escribir adapters nativos cuando media o background work lo exijan.

### C. Flutter

**Alternativa viable, no elegida para la companion inicial.** Su modelo multiplataforma y su integración nativa son fuertes, pero introduce Dart y una segunda cadena de contratos/UI frente al runtime TypeScript/React existente. Debe volver a evaluarse si el full mobile studio necesita un canvas de alta fidelidad que justifique sacrificar reutilización del core actual.

### D. SwiftUI + Jetpack Compose o Kotlin Multiplatform + UI nativa

**Reservada para una etapa de mayor criticidad móvil.** Maximiza integración con iOS/Android y control sobre media, MDM/DLP y comportamiento del sistema, pero duplica UI, QA y soporte. KMP puede compartir lógica, no elimina el costo de dos superficies nativas.

### E. Capacitor / web-first native runtime

**Útil para un prototipo de distribución, no como arquitectura canónica.** Puede empaquetar el payload web existente y acceder a APIs nativas, pero conserva un modelo web-first que no resuelve por sí solo la calidad de lifecycle, media, background upload y gestos nativos que Globe necesita.

### F. Mobile web/PWA como superficie permanente

**Rechazada como arquitectura principal, conservada como fallback.** Sigue siendo valiosa para enlaces sin instalación, recuperación y continuidad universal, pero no debe ser el límite de una experiencia cuyo uso esperado incluye Android e iOS con capacidades nativas.

### G. Backend móvil o SDK de proveedor separado

**Rechazada.** Rompe Full API Parity, duplica políticas y aumenta el riesgo de filtrar credenciales, derechos, costos o estados divergentes. Si una futura app necesita una superficie `sdk` o una nueva variante de `ui`, debe abrir un ADR de contrato; no se inventa dentro del cliente.

## Consecuencias

### Beneficios

- Recupera ideas que de otro modo se pierden entre sesiones y dispositivos.
- Reduce el tiempo entre “el resultado está listo” y “alguien puede decidir”.
- Hace visible el valor de la ejecución asíncrona sin exigir permanecer en el Producer.
- Convierte continuidad, memoria y handoff en parte del producto, no en soporte informal.
- Permite que la futura app sea una extensión de Globe, no una isla tecnológica.
- Hace que Android e iOS sean superficies de producto reales sin obligar al Producer desktop a comprimirse en un viewport móvil.

### Costos y riesgos que deben gobernarse

- PKCE/OAuth, secure storage, expiración, revocación, device/session management y eventualmente biometría.
- Background upload, media cache, offline drafts, retries idempotentes y consumo de batería/datos.
- Push y deep links: notificación incorrecta o duplicada puede provocar una segunda ejecución o una decisión sobre un workspace equivocado.
- DLP/MDM, retención, screenshots, screen recording, permisos de cámara/micrófono y privacidad de referencias.
- Distribución App Store/Play Store, soporte de versiones, accesibilidad y paridad visual con el payload React.
- Compatibilidad entre la capa JavaScript y el runtime nativo; un cambio nativo requiere un nuevo build y no puede depender de OTA para corregirlo.
- Módulos nativos propios para uploads resumibles, media de larga duración o integraciones que el scheduler genérico del sistema no garantice.
- Política comercial de la tienda: no se habilitan compras, top-ups ni billing de créditos desde una app sin una decisión legal/comercial específica.
- Fatiga de notificaciones: sólo eventos canónicos y accionables; no replicar todos los cambios internos.

## Contrato runtime y gates de seguridad

Hasta que una task futura lo cambie con evidencia, rigen estas invariantes:

1. **No native implementation by this ADR:** la dirección es native-first, pero este documento no crea bundle, app ID, push provider, OAuth client, deep-link allowlist ni store listing.
2. **Same spine:** cualquier cliente móvil usa los readers/commands/policies existentes y su cobertura declarada. Un endpoint de conveniencia sólo puede nacer como primitive gobernada.
3. **No provider access:** jamás se empaquetan API keys, provider SDKs, house, vendor cost, margin o rutas internas para el cliente.
4. **No offline spend:** offline sólo conserva drafts/capture; estimate, hold, reserve, execute, promote, approve, publish y rights mutations requieren red y autorización vigente.
5. **Exact continuation:** una notificación o deep link debe apuntar al run/session/asset exacto y abrir con readback canónico; nunca dispara `execute` por abrirse.
6. **Fail closed:** workspace incorrecto, entitlement ausente, rol revocado, sesión expirada, token inválido o lineage no autorizado producen deny/redacted state, no fallback permisivo.
7. **Idempotency:** capture sync, upload, comment, review disposition y cualquier mutation de futuro cliente deben tener operation key y recuperación por status/readback.
8. **Rights/provenance:** bytes privados sólo pasan por las rutas gobernadas de asset/media; la app no convierte una copia local en asset autorizado.
9. **Mobile identity boundary:** el BFF browser actual usa cookies same-origin y CSRF; no se reutiliza literalmente en una app nativa. Una task/ADR de identity debe definir OAuth/OIDC + PKCE, sesión móvil, revocación, deep links y un front door autenticado que no exponga `globe-api-internal`.
10. **Version compatibility:** la API conserva una ventana de compatibilidad para binaries instalados; el cliente usa runtime versions/canales y kill switches para evitar que un update JavaScript incompatible rompa un runtime nativo.

## Escenarios de calidad para validar

- **Captura sin pérdida:** en un móvil con red intermitente, una persona registra intención y referencia como draft local; al recuperar conectividad el sync es idempotente y no ejecuta gasto.
- **Auth y deep link:** después de un login PKCE en iOS o Android, un enlace abre el workspace/project/session/run exacto; una identidad revocada recibe deny/redacted state y nunca cae en otra workspace.
- **Resultado asíncrono:** al terminar un job, una notificación abre el run/candidate/session exacto; abrirla dos veces no duplica la ejecución.
- **Upload interrumpido:** una referencia de tamaño relevante sobrevive a pérdida de red y terminación de la app; el cliente recupera el upload gobernado o muestra un estado retryable sin convertir bytes locales en asset autorizado.
- **Handoff:** una session creada o revisada desde móvil se abre en desktop con el mismo project, lineage, rights posture y estado.
- **Acceso revocado:** cambiar workspace, revocar role o expirar sesión bloquea la lectura y no revela bytes, metadata sensible ni provider detail.
- **Binary/API skew:** un binary antiguo sigue funcionando con el contrato compatible o recibe una actualización obligatoria explícita; nunca recibe un bundle JavaScript que requiera APIs nativas ausentes.
- **Media gobernada:** una referencia capturada se convierte en asset sólo mediante ingest/rights/provenance canónico, no por copiar un archivo local al cliente.
- **Accesibilidad y rendimiento:** la baseline móvil no presenta scroll horizontal, conserva teclado/lector de pantalla, respeta reduced motion y cumple los pisos de carga definidos por la UI platform.

## Métricas y gatillos de inversión

Instrumentar, como mínimo:

- `mobile_intent_captured` → `session_started` y `mobile_to_desktop_continuation`;
- tiempo desde `run_terminal` hasta primera decisión o review;
- porcentaje de drafts recuperados y sincronizados sin pérdida;
- decisiones/reviews completadas desde móvil;
- abandono por ancho, red, permisos o autenticación;
- sesiones móviles repetidas por workspace, rol y tipo de trabajo;
- costo de soporte, media transfer, notificaciones y fallos de background work.

Revisar este ADR cuando exista un patrón repetido de uso móvil, una demanda enterprise explícita, fricción no resoluble en mobile web, necesidad comprobada de cámara/voz/background upload/push, o una restricción de identidad/distribución que requiera diseño específico. Una métrica aislada o una solicitud de “hacer una app” no basta.

## No aprobado por este ADR

- Publicar una app en App Store o Google Play.
- Crear credenciales OAuth, app IDs, push providers, native frameworks o SDKs.
- Habilitar generación, gasto, aprobación, promoción, delivery o rights mutation offline.
- Comprar créditos o realizar top-ups desde una app.
- Abrir Globe a clientes externos o modificar TASK-1480.
- Crear un feed, viewer, library, notification ledger o backend móvil paralelo.

## Referencias canónicas

- [Globe architecture home](README.md)
- [Globe client application — ADR-014](EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)
- [Creative Producer composer style reference](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)
- [Creative Studio business model](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- [Globe runtime handoff](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
- [Globe Mobile Continuity — functional documentation](../../documentation/creative-studio/efeonce-globe-mobile-continuidad.md)
- [Manual de validación de continuidad móvil](../../manual-de-uso/creative-studio/operar-globe-continuidad-movil.md)

## Evidencia tecnológica consultada (2026-08-01)

- [React Native — New Architecture](https://reactnative.dev/architecture/landing-page): módulos nativos tipados y seam JavaScript/native para la superficie móvil.
- [Expo — Development builds](https://docs.expo.dev/develop/development-builds/introduction/): builds propios para usar librerías nativas y configuración de producción sin depender de Expo Go.
- [Expo Router](https://docs.expo.dev/router/introduction/): navegación nativa, rutas tipadas y deep links en Android, iOS y web.
- [Expo — Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/): compatibilidad entre el runtime nativo instalado y los bundles JavaScript, con rollout/rollback de updates compatibles.
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/): OAuth/OIDC browser-based, redirect/deep link y prohibición de secretos en el cliente.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/): almacenamiento con Keychain en iOS y Keystore cifrado en Android, sin usarlo como fuente de verdad irremplazable.
- [Expo BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/): trabajo diferible y controlado por el sistema; no garantiza ejecución inmediata ni reemplaza un upload resumible nativo.
- [Expo Notifications](https://docs.expo.dev/push-notifications/what-you-need-to-know/): la entrega y ejecución de notificaciones en background no son una autoridad confiable para ejecutar commands.
- [Flutter — Platform integration](https://docs.flutter.dev/platform-integration): alternativa multiplataforma nativa con plugins y código específico por OS.
- [Kotlin Multiplatform — Get started](https://kotlinlang.org/docs/multiplatform-get-started.html): alternativa para compartir lógica y conservar UI nativa.
- [Capacitor](https://capacitorjs.com/docs): alternativa web-first para empaquetar una aplicación existente con acceso a APIs nativas.
