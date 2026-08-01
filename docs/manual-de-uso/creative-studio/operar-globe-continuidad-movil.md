# Validar continuidad móvil de Efeonce Globe

> **Tipo:** manual de discovery y validación; no es un manual de una app disponible.
> **Estado:** propuesta tecnológica native-first; no existe todavía una superficie móvil nativa ni una PWA habilitada como producto independiente.

Este manual sirve para evaluar la dirección de [ADR-018](../../architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md) sin fingir que el runtime ya la implementa. La dirección tecnológica es una app companion native-first para Android/iOS con React Native + Expo development builds/CNG; la web/PWA queda como fallback. Para operar Globe hoy, usa los runbooks vigentes del Producer, créditos, media, SSO y runtime handoff; este documento sólo añade el lente de continuidad.

## Antes de validar

- Trabaja con una identidad y workspace internos autorizados. El rollout externo continúa bloqueado por TASK-1480.
- Usa el browser móvil actual como fallback y evidencia de responsive/navegación; no instales builds, perfiles, APKs ni apps no aprobadas. Una futura prueba nativa requiere task, app IDs, identidad y distribución aprobadas.
- Confirma que cualquier generación, refine, approval, delivery o gasto siga el flujo existente y su estimate/policy. No hagas pruebas de spend para demostrar una hipótesis móvil.
- Registra dispositivo, ancho, red, sesión, workspace, rol, estado del job y resultado. No registres tokens, cookies, bytes privados ni provider credentials.

## Secuencia de validación

### 1. Levanta el baseline

Abre la superficie web autorizada en un viewport móvil, verifica scroll horizontal, foco de teclado, lector de pantalla, reduced motion y tiempos de carga. Anota qué información se pierde al pasar de desktop a móvil: contexto, estado del job, referencia, comentario o siguiente acción.

### 2. Simula una captura sin ejecutar

Registra en una nota local una intención, referencia o nota de voz hipotética. El objetivo es medir campos, permisos y fricción; no conviertas la captura en un run ni en una reserva. Si la prueba requiere datos reales, usa sólo assets con rights/provenance autorizados.

### 3. Comprueba la continuidad desktop → móvil

Desde el Producer vigente, identifica un project/session/candidate autorizado y anota el contexto mínimo que una futura notificación o deep link tendría que preservar. Abre el mismo contexto en el viewport móvil y verifica si la persona puede entender “qué ocurrió” y “cuál es el siguiente paso” sin inspeccionar APIs ni crear una segunda entidad.

### 4. Comprueba la continuidad móvil → desktop

Usando sólo una acción que ya exista en el runtime autorizado, documenta cómo una persona volvería al desktop con el mismo project/session/asset/lineage. Si no existe deep link, registra el número de pasos manuales y la información que se pierde; no inventes un route ni un query parameter como workaround.

### 5. Simula un estado asíncrono

Observa un run interno ya existente mediante sus readers y estados canónicos. Evalúa qué debería mostrar una notificación `running`, `candidate_ready`, `failed` o `cancelled`, y cómo se evita que abrir la notificación dispare otra ejecución. No crees un notification ledger local.

### 6. Prueba los fallos cerrados

Con una cuenta de prueba autorizada, documenta la experiencia esperada para sesión expirada, role revocado, workspace equivocado, asset sin rights o run inexistente. El resultado correcto es deny/redacted state y una recuperación explícita; nunca un fallback a otra workspace ni una respuesta cruda del proveedor.

### 7. Registra la decisión de la fase

Clasifica el resultado en una de estas salidas:

- **Mantener baseline:** responsive y handoff necesitan instrumentación, pero no hay patrón suficiente para abrir el slice nativo.
- **Abrir vertical slice nativo:** hay uso repetido o una necesidad explícita de Android/iOS; crear task, owner, métricas y contratos para PKCE, deep links, drafts, upload y reconciliación.
- **Abrir Phase 1:** el vertical slice pasa en ambos sistemas y una companion surface acotada puede reducir fricción; crear task de entrega, entitlements, policy y rollout.
- **Abrir un ADR específico:** cámara, voz, push, background upload, OAuth nativo, MDM/DLP, billing o media cache cambian la frontera de seguridad.
- **No-go:** el problema es de información, policy o API parity y no se resuelve con otra superficie.

## Validación del vertical slice Android/iOS

Cuando exista una task aprobada, prueba en dispositivos reales y conserva evidencia de:

1. OAuth/OIDC con PKCE y regreso por deep link autorizado.
2. Apertura del workspace/project/session/run exacto desde web, correo o notificación.
3. Draft de texto, imagen o audio con SQLite/outbox local y sync idempotente.
4. Upload privado interrumpido por pérdida de red, background y terminación de la app.
5. Push que abre y reconcilia el reader; nunca ejecuta un command por sí mismo.
6. Revocación de sesión, cambio de workspace y entitlement ausente con deny/redacted state.
7. Binary antiguo contra API compatible y actualización obligatoria cuando cambia el runtime nativo.

No uses el scheduler genérico de background como garantía de finalización: el sistema operativo controla cuándo
ejecuta esas tareas. Un upload crítico necesita protocolo resumible y, si corresponde, un módulo nativo dedicado.

## No hagas

- No publiques una app ni crees un app ID por una sesión de discovery.
- No uses provider SDKs, API keys, endpoints privados o datos de costo/margen en un cliente.
- No ejecutes gasto, approval, promotion, delivery o rights mutation offline.
- No trates un archivo local como asset autorizado.
- No dupliques feed, viewer, library, credits o notification state.
- No cierres la validación con un screenshot: conserva journey, identidad, estado, métricas y evidencia de acceso.

## Evidencia mínima para una futura task

Una task del vertical slice o Phase 1 debe enlazar este manual y aportar: journey reproducible, cohort/role,
baseline desktop y móvil, métrica objetivo, contrato de deep link y sesión, policy/entitlement, comportamiento
offline, threat model, compatibilidad binary/API, plan de rollback y criterio de no-go. Sin eso, la solicitud
“hagamos la app” sigue siendo discovery.

## Referencias

- [ADR-018 — continuidad móvil y aplicación companion](../../architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md)
- [Documentación funcional de continuidad móvil](../../documentation/creative-studio/efeonce-globe-mobile-continuidad.md)
- [Manual del Producer](./usar-creative-producer-globe.md)
- [Globe runtime handoff](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
