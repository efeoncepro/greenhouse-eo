# Efeonce ID Relying Party Entry and Consent Decision V1

> **Status:** `Accepted`
> **Date:** 2026-09-07
> **Owner:** EPIC-044 / Efeonce Platform / Identity
> **Scope:** entrada de productos Efeonce como relying parties de `auth.efeonce.org`, login contextual,
> sesión del issuer, OIDC first-party, consentimiento OAuth de MCP y terceros, autorización local del producto,
> migración por cohortes y recovery
> **Reversibility:** `two-way-but-slow` — el entry routing vuelve por flag/cohorte al login vigente; retirar
> contratos OIDC, clientes registrados o sesiones ya emitidas exige una transición gobernada
> **Confidence:** `high` en las fronteras de identidad, autorización y consentimiento; `medium` en la cadencia
> de adopción multiproducto
> **Validated as of:** 2026-09-07
> **Program:**
> [`EPIC-044`](../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md)
> **Primer consumidor:** `TASK-1834` (Greenhouse)

## Estado de implementación al aceptar la decisión

`auth.efeonce.org` ya opera el carril OAuth del MCP y su sesión propia. Este ADR acepta el contrato
multiproducto, pero **no afirma que el carril OIDC first-party, el entry routing directo de Greenhouse ni su
rollout por cohortes estén implementados**. Esa evidencia debe vivir en las tasks de ejecución y verificarse
contra el runtime. En particular, `TASK-1834` implementa el primer consumidor; este documento gobierna la
forma que deben conservar Greenhouse y los siguientes productos.

## Context

Greenhouse es un producto al que entran clientes de Efeonce. Por eso su URL, su contexto y su decisión de
acceso deben seguir siendo de Greenhouse. Sin embargo, pedir que la persona complete primero una pantalla de
login del producto y después otra pantalla de login de Efeonce ID crea una distinción que sólo entiende la
arquitectura: para la persona son dos puertas consecutivas para una sola intención.

La alternativa de agregar «Efeonce ID» como quinto provider en la pantalla actual tampoco representa el
modelo real. Efeonce ID no es un método par de Microsoft, Google, passkey o correo. Es la autoridad de
identidad de Efeonce; esos son métodos o upstreams con los que la autoridad autentica a la persona. A la vez,
eliminar la entrada de producto y enviar a todo el mundo a una portada neutral del issuer perdería contexto,
destino y continuidad de marca.

Existe además una frontera de consentimiento que no se puede resolver con una regla visual general:

- entrar a un producto Efeonce first-party sólo establece identidad para que el producto decida acceso;
- autorizar un cliente MCP o un tercero delega scopes sobre una audiencia distinta;
- tener una sesión en Efeonce ID puede evitar repetir autenticación, pero nunca convierte una delegación en
  consentimiento implícito ni concede autorización en el producto.

La decisión debe funcionar para Greenhouse sin convertir su implementación particular en el contrato de toda
la plataforma, y debe permitir migración y rollback sin mostrar dos opciones simultáneas ni crear loops.

## Decision drivers

1. **Una sola intención, una sola puerta visible de autenticación.** La entrada de producto no puede añadir un
   vestíbulo antes del issuer.
2. **Contexto sin suplantación.** Nombre, marca, retorno y clase de flujo sólo pueden salir de un RP y una
   transacción registrados, nunca de parámetros libres del browser.
3. **Separación de autoridad.** Identidad compartida no equivale a membership, entitlement ni autorización
   dentro de Greenhouse u otro producto.
4. **Consentimiento semánticamente honesto.** Un login first-party no fabrica consentimiento delegado; MCP y
   terceros no heredan la excepción first-party.
5. **Sesiones y audiencias aisladas.** Reusar autenticación no significa compartir cookies, tokens ni grants.
6. **Migración reversible.** Legacy, nueva entrada y recovery deben ser estados explícitos, mutuamente
   excluyentes y observables.
7. **Contrato multiproducto.** La política transversal pertenece a EPIC-044; cada producto conserva su propia
   navegación y autorización.

## Decision

### D1. Ownership del contrato y de cada producto

**EPIC-044 es dueño del contrato multiproducto de entrada, sesión de identidad y consentimiento.** Define las
clases de relying party, las garantías mínimas, el registro confiable y las fronteras entre login first-party y
delegación OAuth.

Cada producto Efeonce conserva:

- su URL y punto de entrada;
- el contexto que explica a qué producto se está entrando;
- el destino solicitado después del callback;
- la resolución de organización o workspace;
- la autorización local, entitlements y estado de acceso;
- su sesión de producto, separada de la sesión del issuer.

El issuer autentica a la persona y devuelve una identidad verificable. No decide qué organización debe abrir
el producto ni concede acceso por sí mismo.

### D2. Entrada directa sin pantalla intermedia

Cuando una cohorte está habilitada para el carril nativo, la entrada del producto crea **server-side** una
transacción de autorización ligada al RP, destino y estado esperados, y responde con redirect al issuer antes
de renderizar una pantalla de login.

Por lo tanto, para la cohorte habilitada:

- no existe CTA «Continuar con Efeonce ID»;
- no existe splash o vestíbulo de Greenhouse;
- no aparece una lista de providers del producto;
- no hay flash de la pantalla legacy antes del redirect;
- el primer formulario de autenticación visible propiedad de Efeonce es Efeonce ID.

El producto sigue siendo la puerta de entrada porque conserva URL y retorno. El issuer es la única superficie
de autenticación porque es quien puede comprobar la identidad.

### D3. Login contextual del issuer

Efeonce ID puede mostrar el producto de origen —por ejemplo, «Entra a Greenhouse»— únicamente cuando el
contexto proviene del RP y de la transacción ya validados. El perfil de presentación es dato administrado por
Efeonce, versionado y allowlisted; no es una URL de logo, nombre de organización o texto enviado por el browser.

La entrada directa a `auth.efeonce.org/login`, sin una transacción confiable de producto, permanece neutral:
«Entra a Efeonce». El issuer no se convierte en un selector de productos.

«Único login visible» significa una única superficie de login propiedad de Efeonce. Un upstream puede mostrar
su propio desafío legítimo —por ejemplo, Microsoft para cuenta y MFA— cuando el método lo requiere; no se
presenta como una segunda pantalla de Greenhouse ni como un provider administrado por el producto.

### D4. Fast path de sesión

Si ya existe una sesión válida de Efeonce ID y satisface la política de assurance, vigencia y frescura del RP,
el issuer puede resolver la transacción y retornar al producto sin mostrar login. El fast path reusa el hecho
de autenticación, no una cookie del producto ni un token MCP.

No aplica cuando la sesión está vencida o revocada, cuando el RP exige mayor assurance, cuando la semántica del
request exige interacción fresca o cuando el binding ya no es elegible. En esos casos el issuer solicita la
interacción necesaria o falla con el error protocolar correspondiente; nunca rebaja la política para conservar
un redirect silencioso.

### D5. Clase `first_party_sign_in`

Un RP puede omitir la pantalla de consentimiento OAuth delegado sólo si su registro confiable lo clasifica como
`first_party_sign_in` y cumple simultáneamente estas condiciones:

1. es un producto propiedad y operado por Efeonce;
2. fue registrado por un command administrativo gobernado, no por autoafirmación del cliente;
3. usa redirect URIs exactas y una audiencia de identidad propia del RP;
4. sólo solicita claims/scopes de identidad allowlisted para establecer sesión en ese producto;
5. conserva autorización y selección de contexto en el producto;
6. tiene estado activo, política de assurance y perfil de presentación vigentes.

La omisión no es un consentimiento inventado en `client_consents`. Es una base de autorización first-party
tipada y auditable distinta de `authorize_screen`. El evento debe registrar, sin secretos, sujeto, RP,
transacción, política aplicada, assurance y resultado.

Si un request `first_party_sign_in` solicita un recurso MCP, una audiencia de terceros o scopes delegados, se
rechaza de forma fail-closed. No se transforma silenciosamente en consentimiento aprobado y no se amplía la
excepción porque el cliente también pertenezca a Efeonce. Los términos, privacidad o acknowledgements propios
del producto son otra obligación y no se modelan como consentimiento OAuth delegado.

### D6. MCP y terceros conservan delegación explícita

Los flujos MCP y de terceros mantienen el contrato vigente:

- consentimiento por sujeto, cliente y set de scopes;
- consentimiento nuevo cuando el cliente o el set material de scopes cambia;
- step-up para clases de autoridad que lo requieren, incluidas escrituras;
- grants revocables y versión de autoridad revalidada;
- access y refresh tokens propios del recurso y de su audiencia;
- rechazo de cross-audience antes de ejecutar lógica de dominio.

Una sesión activa en Efeonce ID puede evitar repetir login dentro del flujo MCP, pero no evita su pantalla de
consentimiento cuando corresponde, no concede scopes y no comparte el token o la sesión del RP.

### D7. Resolución local posterior al callback

El callback del producto valida issuer, firma, audience, nonce, state, PKCE y la transacción
de un solo uso. Después resuelve la identidad canónica por claves verificadas, nunca por coincidencia de email o
dominio.

El producto aplica un resultado explícito:

- **0 contextos elegibles:** deniega acceso y ofrece una recuperación segura;
- **1 contexto elegible:** crea su sesión local y continúa al destino permitido;
- **más de 1 contexto elegible:** muestra un selector de contexto del producto antes de entrar.

No existe `LIMIT 1`, primer match ni inferencia por dominio para ocultar la ambigüedad.

### D8. Legacy, recovery y no-loops

Cada sujeto/cohorte tiene una sola estrategia efectiva de entrada: `native_direct` o `legacy`. Nunca se
muestran ambas como opciones pares. La estrategia se decide server-side mediante configuración confiable y se
registra para observabilidad.

Recovery es un carril explícito y mutuamente excluyente con el auto-redirect. Cuando recovery está activo,
cuando vuelve con un error recuperable o cuando se alcanza el presupuesto de redirects, la entrada no reinicia
automáticamente la transacción. `state`, intento, causa terminal y retorno permitido deben impedir loops entre
producto, issuer y upstream.

Rollback deshabilita `native_direct` para la cohorte y restaura su única entrada legacy. No agrega una segunda
opción visible ni apaga el issuer para MCP.

### D9. Prohibiciones de composición

- No se incrusta Efeonce ID mediante iframe, webview o widget dentro del producto.
- No se comparten cookies, WebAuthn RP ID, secretos o stores de sesión entre issuer y producto.
- No se presenta Efeonce ID como quinto provider.
- No se agrega un vestíbulo o CTA intermedio para iniciar el flujo habilitado.
- No se usa el issuer como selector multiproducto.
- No se acepta `first_party_sign_in`, presentación, retorno o marca desde input no confiable.

## Flujos resultantes

### Entrada first-party habilitada

1. La persona abre la URL de login o un destino protegido de Greenhouse.
2. Greenhouse valida el destino, crea server-side la transacción OIDC para su RP registrado y responde 3xx.
3. Efeonce ID resuelve el contexto confiable de Greenhouse.
4. Si la sesión del issuer satisface assurance, aplica fast path; si no, muestra el login contextual y ejecuta
   el método necesario.
5. El issuer retorna un código de un solo uso. No muestra consentimiento delegado.
6. Greenhouse valida el callback, resuelve identidad y contextos elegibles, y crea su propia sesión.
7. Greenhouse abre el destino permitido o presenta selector/denegación según el resultado local.

### Autenticación de un cliente MCP

1. El cliente inicia OAuth contra Efeonce ID con su identidad, redirect y scopes registrados.
2. El issuer autentica o reutiliza una sesión válida.
3. El issuer obtiene el contexto permitido y presenta consentimiento por cliente/scope cuando corresponde.
4. La autoridad solicitada puede exigir step-up.
5. El issuer emite tokens para la audiencia MCP, separados de la sesión y tokens de producto.
6. El gateway verifica token, audiencia, contexto, grants y policy de la tool antes del dispatch.

En el carril interno v2 de TASK-1844, el consentimiento es por persona/cliente/clase de autoridad, con
organizaciones actuales como explicación del alcance dinámico. No hay un consentimiento por organización ni
un cambio de contexto al alternar A/B: cada tool exige su objetivo y Greenhouse reautoriza sus permisos.
Un contexto v1 no gana v2 por refresh; requiere autorización fresca. Este contrato de MCP no cambia el
selector de sesión del producto descrito arriba ni da por entregado el carril first-party de TASK-1834.
[Autoridad v2](EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md#d10--consentimiento-fresco-y-migración-compatible).

## Security and trust boundaries

| Frontera | Fuente confiable | Regla fail-closed |
| --- | --- | --- |
| Browser → entrada del producto | ruta y sesión del producto; allowlist de destinos | un `returnTo` externo, no firmado o fuera de allowlist se rechaza |
| Producto → issuer | RP registrado + transacción server-side + redirect URI exacta | parámetros libres no pueden elegir flow class, marca, audiencia ni callback |
| Issuer → upstream | configuración del método y callback del issuer | el upstream autentica; no autoriza producto ni MCP |
| Issuer → producto | metadata/JWKS, código de un solo uso, issuer/audience/nonce/state | claim inválido, replay o audiencia cruzada impiden crear sesión |
| Identidad → autorización de producto | subject verificado → identidad canónica → contextos elegibles | email, dominio o primer match nunca conceden acceso |
| Sesión del issuer → `first_party_sign_in` | RP tipado + policy de assurance + registro activo | sesión válida no basta si el request pide un recurso delegado |
| Sesión del issuer → MCP | cliente/scopes/consentimiento/grants/step-up | reusar login nunca implica consentimiento ni scope |
| Token → recurso | `iss`, `aud`, `azp`, scopes, contexto y revocación vigentes | cross-audience se rechaza antes del dominio |
| Native → legacy/recovery | estrategia efectiva y presupuesto de redirects persistidos | una persona no puede quedar en dos carriles ni reiniciar un loop |

El modelo de amenaza incluye open redirect, login CSRF, code injection, replay, session fixation, confused
deputy, client spoofing, clickjacking, token substitution, downgrade de assurance, enumeración de cuentas y
loops de redirect. CSP/frame ancestors, cookies `__Host-`, SameSite adecuado, rate limits, códigos de un solo
uso, PKCE, nonce/state, redacción de logs y auditoría durable forman parte del contrato de implementación.

## Runtime Contract

### Fuentes de verdad

- **Política transversal:** este ADR y EPIC-044.
- **Registro de clientes/RPs:** `greenhouse_auth.oauth_clients` y su port tipado en
  `src/lib/auth-server/oauth/store/port.ts`, extendidos mediante migración aditiva para representar clase de
  flujo, audiencia de identidad, assurance y perfil de presentación. `metadata_json` arbitrario no puede ser
  la única fuente de una decisión de confianza.
- **Transacción y autorización:** `src/lib/auth-server/oauth/authorize.ts` y stores asociados. La rama
  `first_party_sign_in` debe ser explícita y no insertar una fila falsa de consentimiento delegado.
- **Superficie del issuer:** `src/lib/auth-server/persons/pages.ts` y
  `src/lib/auth-server/oauth/pages/render.ts`, consumiendo sólo contexto ya validado.
- **OIDC first-party:** contrato separado para authorization code, ID token/user identity y audience del RP.
  No reutiliza el access token, audience, `gv` ni consentimiento del MCP como sustituto.
- **Entrada y callback Greenhouse:** routes server-side del portal definidas por `TASK-1834`, con destino
  allowlisted y callback que consume la transacción una sola vez.
- **Autorización Greenhouse:** resolver canónico de identidad y contextos elegibles usado tanto al crear como al
  revalidar la sesión; no una bifurcación exclusiva del callback.
- **Copy:** `src/lib/copy/*`; marca/nomenclatura registrada no se duplica como string libre en handlers.
- **Rollout:** flags/cohortes server-side con estrategia efectiva única y telemetría por causa.

### Contrato mínimo del registro first-party

El modelo físico exacto se fija en la task dueña, pero el registro durable debe expresar de forma tipada:

- identidad estable del RP y ownership Efeonce;
- `flow_class = first_party_sign_in`;
- redirect URIs exactas y audiencia OIDC propia;
- scopes/claims de identidad permitidos;
- policy de assurance y freshness;
- perfil de presentación allowlisted y versionado;
- estado, vigencia, actor/aprobación y audit de cambios.

CIMD, DCR y un query parameter no pueden elevar un cliente a `first_party_sign_in`. Sólo el command
administrativo gobernado puede crear o cambiar esa clasificación.

### Sesiones, cookies y tokens

La sesión de Efeonce ID, la sesión de Greenhouse y una familia OAuth MCP son tres objetos diferentes. Cada uno
tiene namespace, cookie/token, revocación, TTL y auditoría propios. Cerrar o revocar uno no se interpreta como
prueba de revocación de los demás; la coordinación de logout multiproducto requiere su contrato específico.

## Implementation contract

La primera implementación debe entregar como mínimo:

1. schema/port tipado para RP first-party y perfil de presentación confiable;
2. OIDC first-party con audience y artefactos separados del MCP;
3. rama explícita sin pantalla ni fila de consentimiento delegado;
4. entry routing 3xx de Greenhouse antes de renderizar para la cohorte habilitada;
5. login contextual del issuer y variante directa neutral;
6. fast path condicionado a assurance, revocación y freshness;
7. callback con validación integral y consumo único;
8. resolver 0/1/N compartido con revalidación de sesión;
9. state machine de legacy/native/recovery con presupuesto anti-loop;
10. telemetría, auditoría y kill switch independientes del carril MCP;
11. copy accesible, teclado, 390 px, reduced motion y ausencia de overflow;
12. pruebas unitarias, integración, browser y canary sintético antes de cualquier piloto consentido.

## Quality scenarios

| Escenario | Resultado requerido |
| --- | --- |
| Cohorte `native_direct` abre `/login` | primera respuesta decide server-side y redirige; no contiene HTML de login, CTA intermedio ni flash legacy |
| Sesión Efeonce ID válida y assurance suficiente | retorna al RP sin mostrar login ni consentimiento delegado |
| Sesión vencida, revocada o insuficiente | solicita interacción/step-up o falla protocolarmente; nunca usa fast path degradado |
| RP first-party pide sólo identidad allowlisted | no muestra consentimiento OAuth y emite sólo el artefacto OIDC destinado a ese RP |
| RP first-party pide scope/audience MCP o tercero | rechaza el request; no auto-consiente ni emite token delegado |
| Cliente MCP nuevo o con scopes materiales nuevos | muestra consentimiento por cliente/scope aunque exista sesión del issuer |
| Cliente MCP solicita escritura | aplica step-up y policy vigentes antes de emitir o despachar |
| Browser altera nombre, logo, flow class o retorno | el issuer ignora/rechaza el input y usa sólo registro/transacción confiables |
| Token de Greenhouse llega al MCP, o token MCP al RP | se rechaza por audience antes de lógica de dominio |
| Identidad resuelve 0, 1 o N contextos | denegación/recovery, entrada directa o selector respectivamente; nunca primer match |
| Recovery o callback vuelve con error repetido | no reinicia auto-redirect; termina con causa accionable dentro del presupuesto definido |
| Flag/cohorte vuelve a legacy | la persona ve una sola entrada legacy y el MCP sigue operativo |
| Login contextual en desktop y 390 px | nombre del producto comprensible, foco/errores accesibles, teclado completo, sin overflow |

Ningún caso se acredita sólo porque la route devuelve 2xx/3xx o porque una task está marcada completa. La
evidencia debe incluir navegación real, claims/audience, sesión resultante, autorización local, negativos,
telemetría y readback del flag/cohorte efectivos.

## Rollout

1. **Foundation oscura:** schema, registro tipado, OIDC, resolver y UI contextual con flags OFF; pruebas y
   migraciones sin cambiar la entrada visible.
2. **Cohorte sintética interna:** activar sujetos de prueba controlados en staging/runtime compartido según el
   runbook; verificar 0/1/N, fast path, recovery, revocación, cross-audience y rollback.
3. **Assurance:** `TASK-1833` y gates de seguridad/operación deben cerrar sus requisitos aplicables. Un canary
   sintético técnico no se presenta como piloto de cliente.
4. **Piloto consentido:** cohorte real explícitamente aprobada, soporte preparado, observación y salida
   reversible. Nunca se usa a un cliente como tester técnico ni se le solicitan tokens o logs sensibles.
5. **Expansión gradual:** ampliar allowlist sólo con señales estables, sin loops y con autorización local
   verificada. Retirar legacy requiere una decisión/evidencia posterior; no ocurre por completar el código.

La incorporación de otros productos reutiliza este contrato, pero cada uno necesita RP registrado, audience,
callback, resolver de autorización, runbook, kill switch y evidencia propios.

## Rollback and recovery

- Desactivar `native_direct` sólo para la cohorte o RP afectado y hacer que su siguiente entrada use legacy.
- Invalidar transacciones OIDC pendientes del RP si existe riesgo de replay o configuración incorrecta.
- Deshabilitar el RP/redirect exacto si hay compromiso; no apagar globalmente OAuth MCP salvo que el incidente
  alcance el issuer común.
- Mantener eventos de auditoría y causas de fallo; rollback no borra consents, tokens o sesiones como atajo.
- Recovery suspende auto-redirect para el intento afectado y entrega una ruta estable, accesible y sin loop.
- La restauración exige readback del flag/cohorte, navegación real y confirmación de que no quedan dos entradas
  simultáneas.

## Alternatives Considered

### A. Mantener la pantalla Greenhouse y agregar Efeonce ID como quinto provider

Rechazada. Presenta la autoridad de identidad como si fuera un método par, mantiene dos modelos mentales y
permite que la UI del producto diverja del policy real del issuer.

### B. Mostrar un vestíbulo «Continuar a Efeonce ID»

Rechazada. Añade una decisión falsa: la persona no puede elegir una autoridad alternativa. Aumenta fricción y
no agrega seguridad si la transacción puede crearse antes de renderizar.

### C. Embeber el login del issuer en iframe o widget

Rechazada. Debilita origen, cookies, passkeys, anti-clickjacking y capacidad de distinguir visualmente al
issuer; además acopla releases y estilos de productos con la autoridad.

### D. Enviar todo acceso a una portada neutral de Efeonce ID

Rechazada. Elimina la redundancia, pero también pierde intención, destino y continuidad del producto, y empuja
al issuer a convertirse en selector multiproducto.

### E. Omitir consentimiento para todo cliente propiedad de Efeonce

Rechazada. Ownership no cambia la semántica de una delegación MCP. Mezclaría login de producto con autorización
de tools y ampliaría privilegios por clasificación corporativa.

### F. Cortar todas las cohortes de una vez

Rechazada. Hace difícil separar defectos de OIDC, binding, autorización local, UX y operación, y elimina una
salida segura antes de tener evidencia de canary y piloto.

### G. Entrada contextual directa con clase first-party tipada

Aceptada. Conserva el producto como puerta, el issuer como única superficie de autenticación, la autorización
local y el consentimiento delegado donde semánticamente corresponde.

## Consequences

### Positive

- La persona inicia sesión una vez para una sola intención, sin dos pantallas de Greenhouse/Efeonce.
- Greenhouse conserva su URL, retorno, organización y decisión de acceso.
- Una sesión del issuer habilita SSO real entre productos sin compartir cookies o tokens.
- La excepción de consentimiento queda estrecha, typed y auditable.
- MCP conserva consentimiento, step-up, grants y audiencias sin degradación.
- Los siguientes productos reutilizan una primitive común en vez de inventar otro login.

### Negative

- EPIC-044 asume un registry de RPs y perfiles de presentación con gobierno operativo permanente.
- Los productos deben implementar callback, sesión y autorización local; no basta con «usar Efeonce ID».
- Durante la migración existirán dos implementaciones de entrada, aunque nunca deban mostrarse juntas al mismo
  sujeto.
- El fast path aumenta la importancia de revocación, assurance freshness y observabilidad cross-product.
- Logout coordinado, account chooser y session management multiproducto requieren decisiones posteriores.

### Neutral / structural

- Microsoft, passkey, magic link y futuros métodos viven detrás del issuer; su presencia no cambia el contrato
  del RP.
- El issuer puede verse contextual sin adoptar navegación, permisos ni diseño completo del producto.
- Omitir consentimiento OAuth first-party no elimina obligaciones legales o contractuales propias del producto.

## Revisit When

Reabrir esta decisión si ocurre cualquiera de estas condiciones objetivas:

- un producto deja de ser propiedad/control operativo de Efeonce o requiere autoridad compartida con un socio;
- un RP first-party necesita scopes delegados o una audiencia de recurso, no sólo identidad;
- regulación, revisión legal o contrato exige consentimiento explícito incluso para el establecimiento de
  sesión first-party;
- un cliente enterprise exige home-realm discovery, SAML/SCIM o política de IdP propia que no cabe como método
  del issuer;
- la resolución 0/1/N no alcanza para un modelo de organizaciones jerárquicas o delegación encadenada;
- la evidencia muestra loops, downgrade de assurance o cross-audience atribuibles al modelo y no a una
  implementación aislada;
- se adopta un estándar de browser/session management que cambie materialmente el fast path o logout;
- Efeonce externaliza el authorization server y el nuevo proveedor no puede sostener flow class y registro
  confiable equivalentes;
- se propone retirar legacy para todas las cohortes o compartir logout entre productos.

## Related decisions and contracts

- [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
- [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)
- [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
- [`EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`](EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md)
- [`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
- [`agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`](agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md)
- [`agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`](agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)
