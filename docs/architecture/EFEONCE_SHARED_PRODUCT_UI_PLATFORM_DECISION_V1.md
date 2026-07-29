# AXIS Shared Product UI Platform Decision V1

## Status

`Accepted — foundation published; opt-in consumer adapters verified`

## Context

Efeonce ya tiene una base UI valiosa en Greenhouse: AXIS, tokens, primitives, recipes,
Composition Shell, motion, accesibilidad y un Design System Lab interno. Globe y los
productos futuros necesitan reutilizar ese conocimiento sin copiar código ni heredar por
accidente la implementación MUI/Vuexy de Greenhouse.

La decisión anterior de Globe (`EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1`) hacía
que Globe tuviera un Design System independiente y rechazaba compartir un package UI
cross-repo. Esa frontera deja de ser suficiente para una cartera de productos múltiples.

## Decision

Efeonce adopta una plataforma UI compartida y federada con cuatro responsabilidades:

| Capa | Dueño | Responsabilidad |
| --- | --- | --- |
| Gobierno | Greenhouse | ADRs, registry, lifecycle, ownership, QA, evidence y promoción |
| Contratos | Package compartido | tokens, estados, anatomía, accesibilidad, motion y APIs estables |
| Implementación | Cada producto | adapter compatible con su runtime y composición de producto |
| Lab | Aplicación independiente | catálogo, fixtures, pruebas visuales, keyboard y reduced-motion |

El Design System no será una dependencia monolítica de Greenhouse. Greenhouse seguirá
siendo el control plane y conservará su implementación MUI/Vuexy; Globe podrá usar un
adapter Tailwind; otros productos podrán usar otros adapters sin duplicar el contrato.

## Target topology

```text
Greenhouse control plane
  ├─ docs/architecture + registry metadata + decisions + gates
  └─ /design-system (catálogo interno y handoff)

axis-design-system package repository
  ├─ @efeoncepro/axis-tokens
  ├─ @efeoncepro/axis-ui-contracts
  ├─ @efeoncepro/axis-ui-primitives
  ├─ @efeoncepro/axis-ui-greenhouse
  ├─ @efeoncepro/axis-ui-globe
  └─ @efeoncepro/axis-design-system-lab

Consumers
  ├─ Greenhouse: MUI/Vuexy adapter
  ├─ Globe: React + Tailwind adapter
  └─ futuros productos: adapter explícito
```

El package repository es el source de código portable. La publicación está versionada en el
registry privado de GitHub Packages. El Lab se
desplegará como proyecto Vercel independiente, inicialmente en modo internal-only. No se
crea un runtime Cloud Run para el Lab mientras no exista una necesidad de backend,
persistencia o jobs.

## Estado verificable de distribución, autenticación y adapters — 2026-07-29

- Los paquetes privados publicados en GitHub Packages son `@efeoncepro/axis-tokens`,
  `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry`, versión `0.1.4`.
- Los repositorios `efeoncepro/greenhouse-eo` y `efeoncepro/efeonce-globe` tienen acceso
  `Read` configurado en GitHub Actions para los tres paquetes.
- El proyecto Vercel independiente `axis-design-system-lab` tiene `NPM_RC` configurado
  como variable sensible para `Production` y `Preview`, con el registry de GitHub Packages
  para el scope `@efeoncepro`. Esto habilita la instalación del Lab y el consumo fijado por
  lockfile en los consumers.
- En GCP, proyecto `efeonce-globe`, existe el secreto de Secret Manager
  `axis-packages-read-token`. El service account de Cloud Build
  `818083690953-compute@developer.gserviceaccount.com` y el de Cloud Build de
  Greenhouse `183008134038-compute@developer.gserviceaccount.com` tienen
  `roles/secretmanager.secretAccessor` sobre ese secreto. La ubicación es ownership
  deliberado del ecosistema AXIS, no una credencial exclusiva de Globe; no se duplica
  el PAT. La retirada es una decisión de ownership, no un vencimiento: al crear la
  identidad de máquina, el secreto nuevo debe nacer en un proyecto neutral del
  ecosistema AXIS, fuera de cualquier producto. Sólo después de migrar ambos consumers
  y completar sus gates de build/digest se revoca el binding cross-project y se retira
  el secreto legado; nunca se recrea en `efeonce-globe` por inercia.
- Greenhouse y Globe consumen `efeonce.status` y `efeonce.progress` en adapters opt-in de
  `TASK-1591`, cada uno con una primitive simple y una compleja nativa a su runtime.
- El token de GitHub usado para esta preparación es operator-owned y tiene expiración
  `2026-08-27`. Antes de rollout externo o para una operación durable debe reemplazarse por
  una identidad de máquina dedicada; el valor del token no forma parte de esta documentación.

## Rules

1. Un token compartido se declara una sola vez y conserva provenance, rol semántico y
   evidencia de contraste.
2. Un contrato compartido no obliga a compartir el motor de estilos.
3. Un componente MUI/Vuexy actual no se vuelve portable por renombrarlo; primero se separan
   contrato, comportamiento y adapter.
4. Un producto decide `reuse | extend | new` mediante el registry.
5. `candidate -> trial -> stable -> deprecated -> retired` exige owner, versión,
   consumers, fixtures y evidencia proporcional.
6. Un componente sin consumer real permanece local; no se construye una biblioteca
   exhaustiva por anticipado.
7. Ningún agente puede introducir un literal visual fuera del token/adapter contract ni
   crear un segundo componente equivalente sin resolver el registry.
8. La convivencia MUI/Tailwind se permite entre adapters o superficies, nunca mezclando
   dos motores dentro de la misma superficie sin una decisión explícita.

## Delta 2026-07-29 — gobierno de distribución, SSOT de tokens y versionado de contratos (TASK-1589 V1.1)

Tres preguntas quedaron abiertas cuando se publicó la foundation. Se deciden acá porque las tres son
la misma pregunta: **quién es dueño del valor, y qué lo detecta cuando alguien lo contradice.**

### (a) Dirección del SSOT de tokens — decidida, y **cuestionada el mismo día**

> ⚠️ **Esta sub-decisión quedó parcialmente invertida por
> [`EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md`](EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md)
> (`Proposed`, 2026-07-29).** Lo de abajo describe el estado implementado y sigue siendo correcto como
> descripción del runtime de hoy; lo que cambia es el destino. El razonamiento aquí —*"AXIS no puede
> importar de Greenhouse → entonces Greenhouse es el dueño"*— tiene premisa correcta y **conclusión no
> derivada**: la tercera opción (mover el dato a AXIS y que Greenhouse lo consuma) no se evaluó, y los
> tokens resultaron ser datos puros sin ninguna dependencia de MUI, o sea portables tal cual.
> Todo lo demás de este Delta —gobierno, distribución, versionado, gates— se mantiene íntegro.

`@efeoncepro/axis-tokens` y `src/@core/theme/axis-tokens.ts` cargaban los mismos valores de marca bajo
el mismo nombre, **sin relación declarada**. Coincidían porque alguien los tecleó dos veces.

**Decisión:** el **valor** de marca lo posee Greenhouse (`axisRamp` + `axisSemanticHex`). AXIS publica un
**subconjunto portable** de esos valores bajo nombres de rol estables. **AXIS nombra roles; nunca es autor
de un valor de marca.**

La derivación **no puede ser mecánica**: el paquete debe permanecer runtime-agnóstico e instalable por
Globe, que no tiene MUI. Un generador cross-repo acoplaría el build de Greenhouse al de AXIS y volvería a
AXIS un artefacto de Greenhouse, rompiendo la premisa. Por eso se **guarda**, no se genera —
`src/@core/theme/axis-package-drift.test.ts`, extendiendo el patrón canónico *SSOT + derivación + señal de
drift* ya establecido por `axis-semantic-drift.test.ts` (TASK-1034) y por la familia
TASK-571/699/766/774.

El gate **descubre** los roles publicados en vez de listarlos: un color nuevo en AXIS sin contraparte
declarada rompe el test. Un gate que hay que acordarse de extender no es un gate.

**Medición al declararlo (2026-07-29):** el drift **ya existía**. `0.1.4` publicaba `warning: #d59800` y
`danger: #c01d27`, valores anteriores a TASK-1053 (`#ffb703` / `#dc2e39`). Era **inerte** —ningún consumidor
lee `efeonceTokens.color`; Greenhouse pinta por MUI y Globe por su theme Tailwind— y por eso pasó
inadvertido. Corregido en AXIS `0.1.5` con blast radius cero, que es exactamente por qué se corrige ahora
y no cuando el primer consumidor lea los colores.

### (b) Identidad de lectura del registry privado — dos planos, no uno

El sistema tiene **dos planos de ejecución** con propiedades distintas, y tratarlos igual es lo que
producía la sensación de un único punto de falla:

| Plano | Credencial | Durabilidad | Escala a N consumidores |
|---|---|---|---|
| **GitHub Actions** (11 workflows Greenhouse + CI Globe) | `GITHUB_TOKEN` del runner | efímera, por run | sí — vía *Manage Actions access* por repo |
| **Cloud Build** (4 workers Greenhouse + Globe) | secreto durable en Secret Manager | permanente | sí — un secreto, N lectores por WIF |

El plano de Actions **ya está resuelto de forma óptima** y no se toca: cero credenciales durables.
Solo Cloud Build necesita un valor persistente.

**Decisión:** identidad de máquina dedicada con `read:packages` únicamente, **un solo secreto**, alojado en
**`efeonce-group`** (el proyecto del control plane), leído por WIF desde ambos productos. Se descarta una
GitHub App: sus installation tokens duran una hora y `availableSecrets.secretManager` exige un valor
estático, así que exigiría un rotador programado — maquinaria nueva y un modo de falla nuevo para resolver
un problema que un detector resuelve sin infraestructura.

**Retira** el acoplamiento cross-project actual (el secreto vive hoy en `efeonce-globe`, un proyecto de
producto, y Greenhouse lo lee desde afuera). `efeonce-group` no es simétrico a `efeonce-globe`: es el
control plane que ya gobierna a Globe, no un peer.

**Hallazgo que dimensiona el riesgo — el acoplamiento de los workers es accidental, no esencial.**
Ningún archivo de `src/lib/**` ni `services/**` importa AXIS: vive únicamente en
`src/components/greenhouse/primitives`, que los workers no bundlean (esbuild parte de `server.ts` y nunca
alcanza `src/components`). Los cuatro workers necesitan el credencial **solo porque `pnpm install`
resuelve el `package.json` completo del repo**. Consecuencias: (1) el modo de falla al expirar es *"un
worker no despliega"*, nunca *"un worker deja de funcionar"*; (2) la salida estructural no es rotar mejor,
es que la UI viva en su propio build unit — pertenece al `Modular Placement Contract` de EPIC-026, no a
esta task.

**El modo de falla que justifica el detector:** el credencial lo consume un plano que **no está en el
camino del PR**. Cuando expire, todos los PR siguen verdes y lo único que falla es un build de worker,
posiblemente semanas después. `scripts/ci/axis-package-credential-expiry-gate.mjs` +
`.github/workflows/axis-credential-expiry.yml` miden la **expiración real que reporta GitHub**, no una
fecha escrita en un doc — misma lección que el `FEATURE_FLAG_STATE_LEDGER`: el registro puede mentir, la
realidad no.

### (c) Versionado y promoción de contratos — dos ejes, nunca uno

Los consumidores fijan versión exacta del paquete. Promover un pattern no puede obligarlos a moverse.

**Decisión — se canoniza lo que hoy ya ocurre por accidente:** `DesignPatternContract.version` y la versión
del **paquete** son **ejes distintos** y se mueven por razones distintas (hoy `efeonce.status` está en
`0.1.1` dentro de un paquete `0.1.5`).

- `candidate → trial → stable → deprecated → retired` es **metadato aditivo**: nunca cambia la forma del
  contrato. Viaja como patch/minor del paquete. Un consumidor que no actualiza no se entera y no se rompe.
- **Cambiar la forma** de un contrato **no es una promoción**: es un contrato nuevo. `version` mayor dentro
  del mismo `id` **reemplaza**; un `id` nuevo **coexiste**. Re-apuntar un `id` existente a otra forma es
  **substitución prohibida**.

Es deliberadamente el mismo patrón que ADR-013 fijó para las rutas de modelo de Globe (`routeId`: update =
bump en el mismo id, add = id nuevo, re-apuntar = prohibido). El ecosistema ya resolvió este problema una
vez; no se inventa un segundo vocabulario para el mismo invariante.

**Gate:** `packages/contracts/src/index.test.ts` corre `isPromotable()` sobre **cada contrato exportado**,
verifica ids únicos, lifecycle dentro de la unión, y —la parte que importa— que el gate sea *load-bearing*
para cada uno (quitarle la evidencia debe volverlo no-promocionable). Antes existía la función y no la
corría nadie.

### 4-Pillar Score

**Safety** — *Qué puede salir mal:* el credencial se filtra a una imagen o a un log, o alguien publica un
paquete roto que entra a producción por instalación. *Gates:* secreto solo en Secret Manager leído por WIF,
BuildKit acotado a un `RUN`, `.npmrc` borrado por `trap`, `read:packages` como único scope, CI obligatorio
antes de publicar y coherencia tag↔versión. *Blast radius:* lectura de tres paquetes de UI; no hay datos de
cliente ni escritura detrás de este credencial. *Verificado por:* `worker-build-contract-gate` exige el
wiring de auth; los 4 puntos del runbook siguen **pendientes de ejecución real**. *Riesgo residual:* hasta
que esos 4 puntos corran en pipeline real, la ausencia de `.npmrc` en la imagen está razonada, no
verificada.

**Robustness** — *Idempotencia:* publicar es idempotente por versión (npm rechaza republicar la misma).
*Atomicidad:* no aplica; no hay escritura multi-paso ni estado durable. *Protección de carrera:* `concurrency`
por ref en CI; publish serializado por tag. *Cobertura de invariantes:* forma del contrato (`isPromotable` +
unicidad de id + lifecycle), coherencia tag↔versión, derivación de tokens, y la excepción de drift que se
autodestruye. *Verificado por:* cada gate ejercitado en **las dos direcciones** — verde y rojo deliberado.

**Resilience** — *Reintentos:* no aplica a la publicación (acto humano por tag). *Trabajo atascado:* un tag
que falla no publica nada parcial: los gates corren antes de los tres `publish`. *Señal:* el workflow
semanal de expiración, con umbrales 21 días (aviso) y 7 (falla). *Rastro:* versiones publicadas son
inmutables y append-only por naturaleza del registry. *Recuperación:* el consumidor fija versión; volver
atrás es cambiar una línea del `package.json` — nunca mutar ni borrar un paquete publicado.

**Scalability** — *Camino caliente:* resolución de tres paquetes en `install`, O(1) por build. *Consumidores:*
el modelo escala por adición — un producto nuevo suma un grant de Actions (cero credenciales) y, si tiene
Cloud Build, un lector WIF más sobre **el mismo** secreto. *Costo a 10x:* lineal y despreciable. *Punto de
contención real:* no es el registry sino el **acoplamiento accidental de instalación**, que hace que todo
build del repo dependa del credencial aunque no use el paquete; se disuelve con la extracción del build
unit de UI (EPIC-026), no con más plomería acá.

**Tradeoff declarado (Safety ↔ Resilience):** un secreto único compartido por Greenhouse y Globe simplifica
la rotación y elimina copias divergentes, pero acopla el blast radius de ambos productos. Se acepta
conscientemente porque el scope es lectura de UI: separarlo en dos credenciales duplicaría la superficie de
rotación —el modo de falla real observado— a cambio de aislar un riesgo de bajo impacto.

### Hard rules

- **NUNCA** un valor de marca se declara en `@efeoncepro/axis-tokens`. El valor vive en `axisRamp` /
  `axisSemanticHex`; AXIS publica el rol que lo referencia.
- **NUNCA** promover `candidate → stable` cambiando la forma del contrato. Promoción es metadato aditivo;
  cambiar la forma es `version` mayor (reemplaza) o `id` nuevo (coexiste). Re-apuntar un `id` es
  substitución prohibida.
- **NUNCA** publicar un tag sin CI verde y sin coherencia tag↔versión de los tres paquetes.
- **NUNCA** poner el credencial AXIS en un proyecto de producto. Vive en `efeonce-group`, el control plane.
- **NUNCA** dar al credencial más scope que `read:packages`, ni pasarlo como build-arg de Docker, ni
  copiarlo a una imagen.
- **NUNCA** declarar "rollout de producción" de los adapters antes de que los 4 puntos del runbook corran
  en un pipeline real (install · imagen sin `.npmrc` ni token · digest desplegado == construido · rollback).
- **SIEMPRE** que se agregue un rol de color a AXIS, declarar de qué valor de Greenhouse deriva, o
  clasificarlo como neutral portable. El gate de descubrimiento rompe si no.

### Open questions (deliberadamente no decididas)

- **Extracción del build unit de UI** que disuelve el acoplamiento accidental: pertenece a EPIC-026 y
  necesita su propia task hija.
- **Promoción de `efeonce.status` / `efeonce.progress` a `stable`**: falta definir el criterio de evidencia
  y quién firma.
- **Si el Lab debería consumir los paquetes PUBLICADOS** en vez de los `workspace:*` links. Hoy usa links,
  así que valida el código fuente pero **no valida lo que realmente se publica** (`files`, `exports`, el
  contenido del tarball). Consumir lo publicado lo convertiría en el verificador del artefacto — y sería
  la única razón legítima para que el Lab tenga credencial de registry.

*Cerradas el 2026-07-29:*

- *El team de Vercel del Lab **no** es distinto del canónico. `team_gmNiF4YCHmc1wqsHUTCvqjmN` es el id cuyo
  slug es `efeonce-7670142f`; `greenhouse-eo` y `axis-design-system-lab` comparten orgId.*
- *`0.1.5` publicada. El release corrió con CI, gate de contratos y verificación tag↔versión; Greenhouse y
  Globe la consumen y la excepción autolimpiante del gate de drift ya fue borrada por su propio diseño.*

### Estado de ejecución — 2026-07-29

| Movimiento | Estado |
|---|---|
| CI de PR en el repo AXIS | ✅ verde en su primera corrida (`30487680371`) |
| Actions alineadas al canon v5/v6 | ✅ (la corrida anotó Node 20 deprecado) |
| `0.1.5` publicada con gates previos | ✅ `30487828729` |
| Greenhouse y Globe en `0.1.5` | ✅ gates verdes en ambos |
| Excepción autolimpiante del drift | ✅ se rompió al instalar `0.1.5` y fue borrada |
| `NPM_RC` del Lab retirado | ✅ probado con install+build sin credencial |
| Secreto en `efeonce-group` | ⏳ contenedor + IAM creados; **cero versiones** |
| Identidad de máquina y valor del token | 🔴 sólo el operador |
| Migración de los 5 consumidores de Cloud Build | 🔴 bloqueada por lo anterior |
| Los 4 puntos de verificación del runbook | 🔴 pendientes |

## Supersession

Esta decisión supersede parcialmente `EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1`:
Greenhouse sigue gobernando Globe y Globe conserva autonomía de runtime, pero tokens,
contratos y primitives elegibles pueden ser compartidos mediante packages versionados.
Globe no hereda automáticamente la UI de Greenhouse ni importa MUI/Vuexy por esta decisión.

`TASK-1485` pasa a ser un consumer/piloto de la plataforma compartida y debe actualizarse
antes de promover el registry como estable.

## Migration slices

1. Registrar la decisión, ownership y contracts; no tocar runtimes existentes.
2. Inventariar primitives Greenhouse en `portable`, `greenhouse-only` y `product-local`.
3. Extraer tokens y contratos sin mover todavía componentes MUI complejos.
4. Crear package foundation y un Lab mínimo con fixtures.
5. Portar una primitive simple y una primitive compleja con adapter Greenhouse y Globe.
6. Publicar versiones privadas y conectar consumers por una versión fijada.
7. Extraer el resto del Lab y retirar duplicación sólo después de evidencia.

## Quality scenarios

- Un agente nuevo encuentra una primitive existente en menos de una búsqueda de registry y
  no crea un duplicado equivalente.
- Un cambio de token genera diff en los consumers declarados y no altera un producto que
  no actualizó su versión.
- Globe puede consumir el contrato compartido sin importar MUI/Vuexy.
- Greenhouse conserva accesibilidad y comportamiento MUI mientras cambia el package
  portable.
- El Lab verifica desktop, 390 px, teclado, reduced motion, estados de error y overflow.

## Risks and revisit triggers

- **API común demasiado abstracta:** mantener adapters pequeños y promover sólo con dos
  consumers reales.
- **Acoplamiento a MUI:** bloquear imports desde packages portables y ejecutar dependency
  gates.
- **Package sin release operativo:** no marcar `stable` sin publish reproducible y rollback.
- **Lab duplicado durante la transición:** mantener `/design-system` como catálogo de
  Greenhouse y enlazar al Lab independiente hasta que exista paridad.
- **Cambio de hosting o registry:** reabrir ADR si aparecen secretos, persistencia,
  colaboración, jobs o necesidades de runtime server-side.
