# Sister Platform Bindings

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-11 por Codex (TASK-375)
> **Ultima actualizacion:** 2026-05-28 por Codex (TASK-948 Kortex SSO broker)
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

---

## Que es un sister-platform binding

Un sister-platform binding es el enlace formal entre un scope externo de una app hermana del ecosistema y un scope interno de Greenhouse.

En palabras simples: le dice a Greenhouse que un tenant, workspace, portal o instalacion externa corresponde a una organizacion, cliente, space o scope interno concreto dentro del portal.

Esto evita trabajar con suposiciones fragiles como:

- nombres visibles
- labels comerciales
- coincidencias manuales por costumbre

## Para que sirve

Sirve para que Greenhouse pueda resolver de forma segura preguntas como:

- este tenant de Kortex corresponde a que cliente o space en Greenhouse
- este portal externo sigue activo o fue suspendido
- este binding esta listo para ser consumido por una API o todavia esta en borrador

Tambien deja una base reusable para futuras apps hermanas como Verk.

## Donde vive hoy

La visibilidad funcional actual vive en:

- `/admin/integrations`

Y la surface read-only endurecida vive en:

- `/api/integrations/v1/sister-platforms/context`
- `/api/integrations/v1/sister-platforms/catalog/capabilities`
- `/api/integrations/v1/sister-platforms/readiness`

Hoy esa pantalla permite ver:

- cuantas plataformas hermanas tienen bindings registrados
- cuantos bindings estan activos
- que scopes Greenhouse estan enlazados
- el estado operativo de cada binding

La API read-only nueva permite:

- autenticar consumers sister-platform con credencial propia
- resolver el binding activo de un scope externo
- leer el catalogo y la readiness sin usar el token compartido generico
- dejar request logging y rate limiting sobre ese carril

Tambien existe ahora un seed operativo para dejar listo el primer consumer Kortex sin crear registros a mano:

- `pnpm seed:kortex-pilot`

Para login interactivo de operadores, Greenhouse tambien expone un carril separado de SSO para apps hermanas:

- `/api/auth/sister-platforms/authorize`
- `/api/integrations/v1/sister-platforms/oauth/token`
- `/api/integrations/v1/sister-platforms/oauth/userinfo`

Ese carril usa authorization code one-time + PKCE + redirect URI allowlist. No comparte passwords, hashes, cookies Greenhouse ni tokens Microsoft con Kortex.

## Que estados puede tener

### Draft

El binding existe, pero todavia no se usa como enlace confiable para consumers downstream.

Es el estado correcto cuando:

- se esta modelando el enlace
- falta validarlo
- todavia no debe resolver tenancy en runtime

### Active

El binding ya es valido y Greenhouse puede usarlo para resolver el scope correcto.

Solo los bindings activos participan en la resolucion canonica.

### Suspended

El binding existia y era valido, pero temporalmente no debe usarse.

Sirve para congelar una relacion sin borrarla.

### Deprecated

El binding queda como historico y deja de ser el enlace vigente.

Sirve cuando ya existe un reemplazo o el enlace dejo de ser canonico.

## Que tipos de scope Greenhouse soporta

La foundation actual soporta cuatro niveles:

1. `organization`
2. `client`
3. `space`
4. `internal`

Eso importa porque no todas las apps hermanas se conectan al mismo nivel.

Ejemplos:

- una relacion puede vivir al nivel de cliente completo
- otra puede ser especifica de un space
- otra puede ser interna, sin apuntar a un cliente concreto

## Que hace ahora la surface read-only

La lane endurecida funciona con esta secuencia:

1. credencial explicita del consumer
2. resolucion del binding canonico
3. validacion del scope permitido
4. rate limiting
5. request logging
6. respuesta read-only

Eso evita que una app hermana tenga que adivinar tenancy o reutilizar un token compartido con otros conectores.

## Que NO hace todavia esta foundation

Todavia no hace estas cosas:

- no expone MCP read-only
- no implementa el bridge especifico de Kortex
- no es una UI completa de operacion avanzada para credenciales; por ahora la surface nueva es backend/read-only y la pantalla admin sigue centrada en bindings

Esas piezas vienen despues en:

- `TASK-376`
- `TASK-377`

## Como se deberia usar operativamente

Regla simple:

- primero se crea o corrige el binding
- en el caso de Kortex piloto, se crea o actualiza tambien su consumer dedicado con `pnpm seed:kortex-pilot`
- despues se activa
- solo entonces una integracion externa deberia apoyarse en ese enlace

Si hay duda sobre el scope correcto, no corresponde activar el binding "para probar". Debe quedar en `draft` hasta validar la relacion real.

## Seed piloto Kortex

El seed operativo del piloto Kortex hace dos cosas juntas:

1. crea o actualiza el consumer `Kortex Operator Console`
2. crea o actualiza el binding `kortex -> portal`

Variables minimas para correrlo:

- `KORTEX_EXTERNAL_SCOPE_ID`
- `KORTEX_GREENHOUSE_SCOPE_TYPE`
- `KORTEX_GREENHOUSE_ORGANIZATION_ID`

Y segun el scope:

- `KORTEX_GREENHOUSE_CLIENT_ID` para `client` o `space`
- `KORTEX_GREENHOUSE_SPACE_ID` para `space`

Defaults operativos:

- binding en `draft`
- consumer en `active`
- scopes permitidos `client,space`
- OAuth client Kortex en `active` salvo override `KORTEX_OAUTH_CLIENT_STATUS`
- redirect URIs allowlisted por `KORTEX_OAUTH_REDIRECT_URIS`
- scopes OAuth permitidos `openid,profile,email,kortex.operator_console.access`

El script es idempotente:

- si el consumer existe, lo actualiza
- si el binding existe, lo actualiza
- si el OAuth client `kortex` existe, lo actualiza
- solo imprime token nuevo cuando lo crea o cuando se pide rotacion

Flags de rollout:

- Greenhouse: `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` por default.
- Greenhouse allowlist: `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS=kortex`.
- Kortex: `KORTEX_GREENHOUSE_SSO_ENABLED=false` por default.

Rollback operativo: apagar primero `KORTEX_GREENHOUSE_SSO_ENABLED`; si hace falta, apagar tambien `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED`. El bridge de password queda como break-glass hasta cerrar el cutover.

## Quien deberia tocarlo

Hoy es una capability de governance administrativa. No es una herramienta pensada para usuarios finales ni para colaboradores de portal cliente.

La operacion correcta recae en perfiles admin que entienden:

- la semantica de tenancy de Greenhouse
- el scope real de la app hermana
- el impacto de activar o suspender un binding

## Como leer la tabla en Admin

Cada fila responde seis preguntas:

1. que plataforma es
2. que objeto externo representa
3. a que scope Greenhouse apunta
4. que rol de binding tiene
5. en que estado esta
6. cuando fue verificado o actualizado por ultima vez

La idea es que un operador pueda detectar rapido:

- si el enlace existe
- si esta activo o bloqueado
- si el scope correcto es organization, client, space o internal

## Relacion con Kortex

Kortex es la primera app hermana prevista para consumir esta foundation, pero el binding no esta hardcodeado a Kortex.

Eso significa que:

- Kortex entra como primer consumer real
- el modelo base no cambia cuando llegue Verk
- Greenhouse conserva un solo contrato canonico para todas las apps hermanas

## Siguiente paso natural

Despues de esta foundation, lo natural es:

1. conectar el primer carril Greenhouse -> Kortex
2. montar MCP downstream sobre esta misma lane

La foundation ya deja listo el terreno para eso.
