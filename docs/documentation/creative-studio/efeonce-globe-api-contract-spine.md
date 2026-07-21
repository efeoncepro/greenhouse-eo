# Efeonce Globe — Contrato de API (Contract Spine)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-19 por Claude (TASK-1481)
> **Ultima actualizacion:** 2026-07-20 por Claude (TASK-1492 — repatriación canónica)
> **Documentacion tecnica:** [EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio). Greenhouse **no la hospeda**: la **gobierna**. Greenhouse es dueño de la identidad, el acceso deseado y el control de tareas/EPICs; Globe es dueño de su propio código, runtime, datos y evidencia creativa. Se integran como pares, sin compartir base de datos, sesión, buckets, secretos de proveedor ni acceso admin.

Este documento explica, en lenguaje simple y sin código, qué es el **"API Contract Spine"** (columna vertebral de contratos) que se construyó en `TASK-1481` y cómo se comporta. Está escrito para una persona de producto u operación que necesita entender la idea, no para quien programa. Desde `TASK-1492`, **esta es la documentación canónica del Contract Spine**: la doc gobernante vive acá, en Greenhouse; en el repo `efeonce-globe` solo queda el **código** y la evidencia técnica de runtime.

Globe está en **fase de fundación, de uso interno**: sobre este contrato ya se enchufó la primera capacidad de negocio (ver el [Model Lab](efeonce-globe-model-lab.md)). Lo que se construyó en `TASK-1481` es la base sobre la que todo lo demás se apoya: el camino único y confiable por donde pasa cada acción.

## Qué es y para qué sirve

La **regla de oro de Globe** es simple:

> Todo lo que se pueda hacer en Globe —desde una pantalla, desde un agente automático o desde una integración por API— pasa por el **mismo contrato central**. Nadie tiene un atajo para llamar directo al proveedor de IA por su cuenta.

Piénsalo como el **único mostrador de un edificio**. Da lo mismo si llegas caminando, por teléfono o por un mensajero: todos hacen fila en el mismo mostrador, presentan la misma credencial, piden con el mismo formulario y reciben la misma respuesta. No hay una puerta trasera para "colados".

El "spine" (columna vertebral) es ese mostrador único. `TASK-1481` lo construyó **antes** de gastar un peso en proveedores de IA. La razón es deliberada: primero se levanta el camino seguro y ordenado, y recién después se enchufa la primera capacidad creativa de verdad. Así se evita el error clásico de construir muchas puertas apuradas y después tener que emparejarlas.

Para qué sirve, en concreto:

- **Ordena**: cada acción vive en un solo lugar, no repetida por canal.
- **Protege**: nadie puede hacerse pasar por otro ni entrar a un espacio que no le corresponde.
- **Es honesto**: siempre se sabe qué está disponible y qué no, sin huecos ocultos.
- **Prepara el futuro**: cuando lleguen las capacidades creativas reales, se enchufan a este mismo camino sin rehacer nada.

## Cómo funciona

### 1. Identidad confiable frente a pedido no confiable

Esta es la idea central. Hay que separar **dos cosas** que la gente suele mezclar:

- **Quién eres** (tu identidad y a qué tienes acceso).
- **Qué estás pidiendo** (la acción que mandas).

En Globe, **la identidad no se cree de lo que manda quien llama**. El pedido puede *proponer* operar cierto espacio de trabajo, pero el sistema **confirma por su cuenta**, a partir del inicio de sesión, quién es realmente esa persona o agente y a qué espacios tiene acceso. Esto conecta directo con la identidad que **Greenhouse** emite.

Una analogía: cuando entras a un edificio, tú puedes *decir* que eres gerente, pero el guardia no te cree por tu palabra: mira tu credencial contra su lista. En Globe pasa igual. El pedido trae una *selección* de espacio de trabajo ("quiero operar el espacio X"), y el sistema la compara contra la lista real de espacios que esa identidad tiene permitidos:

- Si el espacio pedido **sí** está en su lista permitida, se opera ese.
- Si la identidad tiene **un solo** espacio permitido y no pidió ninguno, se usa ese.
- Si pide un espacio que **no le corresponde**, el pedido se **rechaza** (con un "acceso denegado") y **queda registrado** ese intento.
- Si tiene varios espacios permitidos y no aclaró cuál, tampoco se adivina: se rechaza y se pide precisión.

Lo importante: **el pedido nunca puede ampliar tus permisos**. Solo puede *elegir dentro de* lo que la identidad ya tenía. Meter un "soy el jefe" o "dame el espacio de la víctima" en el pedido no sirve de nada: esos datos se ignoran, y lo que queda anotado es la identidad real, no la inventada.

> **Nota importante:** un pedido rechazado por espacio no autorizado **nunca** revela qué espacios existen. La respuesta es siempre un "acceso denegado" parejo, para no dar pistas a quien esté probando.

### 2. Un solo lugar para la lógica

Cada acción de Globe vive **una sola vez**, en un registro central de capacidades. La pantalla, el agente y la API **no tienen cada uno su propia copia** de la misma acción: los tres usan exactamente la misma. Es la misma disciplina de *Full API Parity* que Greenhouse aplica a sí mismo.

Volviendo a la analogía del mostrador: hay **un solo formulario oficial**. La web, el agente y la integración por API lo llenan igual y lo entregan en la misma ventanilla. Esto tiene consecuencias muy concretas:

- No hay "dos versiones" de la misma acción que se desincronizan con el tiempo.
- Un arreglo o una mejora se hace en un solo lugar y sirve para todos los canales a la vez.
- Es imposible que un canal tenga un permiso más flojo que otro "por descuido", porque el control es el mismo para todos.

Por dentro, la API por HTTP es el servidor único; el SDK (kit para integraciones), el conector para agentes y la línea de comando son todos **clientes** de esa misma API. Ninguno se salta el camino.

### 3. Mapa honesto de qué está disponible

Globe mantiene un **mapa de cobertura**: por cada capacidad y por cada canal, declara en qué estado está. Hay exactamente **tres estados posibles**:

| Estado | Qué significa | Ejemplo simple |
| --- | --- | --- |
| **Disponible** | La capacidad funciona por ese canal, aquí y ahora. | La acción de prueba interna responde por API y por el SDK. |
| **Bloqueado por política** | La capacidad existe y está declarada, pero todavía está apagada a propósito hasta que su propia tarea la encienda. Es visible, no es un error. | Una capacidad creativa de verdad puede estar bloqueada hasta que su tarea la encienda. |
| **No aplica** | Ese canal, para esa capacidad, no tiene sentido. | Una acción interna que nunca tendrá pantalla marca "no aplica" en el canal de interfaz. |

La regla que hace esto valioso es contundente:

> **"Falta" es imposible.** No existe el estado "hueco silencioso".

Si una capacidad todavía no está lista, **nunca** aparece como un vacío que se pasó por alto. Aparece explícitamente como **bloqueada por política** — es decir, se ve, se sabe que existe y se sabe que está apagada a propósito. Esto está garantizado desde el diseño: es técnicamente imposible declarar una capacidad y "olvidar" un canal, porque un canal sin estado sería un error que salta de inmediato, no algo que pasa desapercibido.

Los canales que se declaran son ocho: interfaz (pantalla), API por HTTP, SDK, conector para agentes, línea de comando, procesos en segundo plano, plataforma hermana (Greenhouse) y pruebas automáticas.

Cuando `TASK-1481` cerró, las capacidades creativas de verdad estaban **bloqueadas por política** en todos sus canales operables — la foto honesta de una plataforma en fundación: el camino listo, la puerta creativa cerrada con llave y visible que está cerrada. Sobre ese contrato, `TASK-1457` encendió después la primera capacidad real (el Model Lab), sin cambiar el camino.

### 4. Prueba de que todos los canales son lo mismo

No basta con prometer que "todos los canales pasan por el mismo camino": hay una **prueba automática** que lo confirma cada vez. Esa prueba verifica, con la acción de ensayo interna, que:

- Llamar **por API** y llamar **por el SDK** dan **el mismo resultado**.
- Un rechazo se ve **igual** por cualquier canal (el mismo tipo de error).
- Cada llamada deja su **propia huella de trazabilidad** (un identificador de correlación) para poder seguirla después.
- **No se puede falsificar la identidad** metiéndola en el pedido: la prueba intenta colar un "actor atacante" y un "espacio de víctima" tanto en los encabezados como en el cuerpo del pedido, y confirma que ambos se ignoran; lo que queda operado y registrado es la identidad real, no la falsa.
- Una capacidad reservada se ve como **bloqueada por política** también por el SDK, no solo por la API.
- La prueba se guía por el **mapa de cobertura publicado**, no por una lista escrita a mano. Es decir, revisa lo que el sistema *dice* de sí mismo y comprueba que se comporte así de verdad.

En palabras simples: no es una promesa en un documento, es algo que se re-verifica solo.

### 5. Sin riesgo: se probó con una acción "inerte"

Todo esto se construyó y se probó con una **capacidad inerte** — una acción de puro ensayo que **no toca nada real**. Concretamente:

- No llama a ningún **proveedor de IA**.
- No escribe en ninguna **base de datos**.
- No guarda archivos en ningún **almacenamiento**.
- No inventa ninguna capacidad creativa de negocio.

Lo único que hace esa acción de ensayo es devolver, de forma segura, un dato de prueba y el espacio de trabajo confirmado. Sirve para demostrar que el camino funciona de punta a punta —identidad, permisos, canales, trazabilidad— **sin ningún efecto en el mundo real**. Es como probar el mostrador y el circuito de credenciales con un cliente de mentira antes de atender al primero de verdad.

## Qué significan los estados (y por qué "falta" no existe)

Recapitulando los tres estados, porque son el corazón de la honestidad del sistema:

- **Disponible** — funciona ahora por ese canal.
- **Bloqueado por política** — existe, está declarado, pero está apagado a propósito. **Se ve.**
- **No aplica** — ese canal no tiene sentido para esa capacidad.

Y el cuarto estado que **deliberadamente no existe**: **"falta" / hueco silencioso**. Esto no es un detalle menor. En muchos sistemas, una función "a medio hacer" simplemente no aparece, y nadie se entera de que le falta hasta que alguien la busca y no está. En Globe eso es imposible por diseño: cualquier cosa que no esté lista tiene que declararse como **bloqueada por política**, o sea, tiene que mostrarse. El resultado es que la foto de "qué puede hacer Globe" siempre es completa y sincera, sin sorpresas escondidas.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — aunque el código viva en `efeonce-globe`. Esta capacidad se implementó bajo `TASK-1481`, gobernada por `EPIC-028`.
- **Globe conserva el runtime y la evidencia técnica.** Greenhouse consume, cuando corresponde, proyecciones, eventos o deep links versionados; nunca su base de datos ni sus secretos.
- **Estado:** implementado y verde (verificación `pnpm check` + `pnpm build` en el repo hermano). Desbloqueó `TASK-1457`, que encendió la primera capacidad creativa real (el Model Lab) sobre este mismo contrato.

## Qué NO hace todavía y qué sigue

Para ser exactos sobre el estado del contrato:

- El Contract Spine **no genera** por sí mismo imágenes, videos ni audio: es el camino, no el motor. La generación real vive en la capacidad que se enchufa encima (el Model Lab).
- El Spine mismo se validó **sin proveedores ni almacenamiento definitivo**: identidad server-side, un solo lugar para la lógica, el mapa de cobertura sin huecos y la prueba de que todos los canales son lo mismo.
- Es **uso interno, en fundación**: no hay clientes ni acceso externo por este contrato.

Lo que **sí** existe y quedó probado es el **camino único, confiable y honesto** por donde todo pasa: identidad confiable, un solo lugar para la lógica, cobertura sin huecos y conformidad cross-surface re-verificada.

**Qué sigue:** las capacidades creativas se activan una por una sobre este mismo contrato. La primera fue **`TASK-1457`** (el Model Lab), que enchufó un caso acotado y controlado —una especie de "canario"— sin inventar un camino nuevo. Cada capacidad nueva se suma igual: mismo mostrador, mismos controles de identidad, presupuesto y evidencia.

---

> **Detalle técnico:**
>
> Este documento explica en lenguaje simple; no reemplaza la especificación técnica. La documentación gobernante vive en Greenhouse (este árbol); en `efeonce-globe` solo queda el código. Para el contrato completo (esquemas versionados, contexto de comando confiable, mapeo de errores, conformidad cross-surface), consultar:
>
> - Especificación de arquitectura canónica: [EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) (SPEC-001).
> - Manual operativo (cómo agregar/llamar/verificar una capability): [EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md](../../operations/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md).
> - Invariantes de fundación de la plataforma: [PLATFORM_FOUNDATION_V1.md](../../architecture/creative-studio/PLATFORM_FOUNDATION_V1.md) — en particular el invariante **#10** (Full API Parity al nacer cada capacidad), **#11** (la autoridad de actor/espacio se deriva en el servidor; los pedidos del llamador nunca la fijan ni la sobrescriben) y **#12** (la primera llamada facturable usa el mismo camino API/SDK → comando → adaptador → runner; se prohíben las llamadas directas a proveedores).
> - Contrato de conectividad con Greenhouse (identidad y acceso): [GREENHOUSE_CONNECTIVITY_V1.md](../../architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md).
> - Capacidad que se enchufa encima: [efeonce-globe-model-lab.md](efeonce-globe-model-lab.md).
>
> **Gobierno en Greenhouse:**
>
> - ADR y arquitectura del programa: [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [..._ARCHITECTURE_V1.md](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [EPIC-028](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/complete/TASK-1481-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
>
> Código fuente relevante (repo hermano `efeonce-globe`):
>
> - Contratos versionados (esquemas, vocabulario de capacidades, estados de cobertura, códigos de error): [`packages/contracts/src/index.ts`](../../../../efeonce-globe/packages/contracts/src/index.ts).
> - Lógica de dominio (contexto confiable `deriveTrustedContext`, registro único de capacidades `CapabilityRegistry`, máquina de estados de la corrida, y las capacidades de ensayo inertes): [`packages/domain/src/index.ts`](../../../../efeonce-globe/packages/domain/src/index.ts).
> - Transporte HTTP y despacho con auditoría: [`apps/studio-web/src/dispatch.ts`](../../../../efeonce-globe/apps/studio-web/src/dispatch.ts).
> - SDK para integraciones (cliente de la misma API): [`packages/sdk/src/index.ts`](../../../../efeonce-globe/packages/sdk/src/index.ts).
> - Prueba de conformidad cross-surface (paridad HTTP↔SDK, anti-suplantación, cobertura publicada): [`apps/studio-web/src/conformance.test.ts`](../../../../efeonce-globe/apps/studio-web/src/conformance.test.ts).
> - Panorama del producto y el estado de la fundación: [`README.md`](../../../../efeonce-globe/README.md).
