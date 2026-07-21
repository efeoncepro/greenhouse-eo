# Efeonce Globe — El dominio interno (una sola puerta de entrada)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-21 por Claude (TASK-1507)
> **Ultima actualizacion:** 2026-07-21 por Claude (delta TASK-1508: Cloud Run bajo IaC + tope de replicas corregido)
> **Documentacion tecnica:** [`docs/architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md) (SPEC-009)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce. Greenhouse **no la hospeda**: la **gobierna**. Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, qué cambió para una persona del equipo cuando Globe pasó a tener **una dirección propia** (`TASK-1507`): antes se entraba por una URL larga y difícil de recordar, ahora se entra por `https://globe.efeoncepro.com`. El detalle técnico vive en la spec de arquitectura enlazada arriba y al final.

> **Detalle técnico:** decisión que ordena este trabajo (ADR-004, sección *Decision*, punto 4 "Front door"): [`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md).

## Qué cambió (en simple): de una URL larga a una dirección propia

Hasta esta tarea, para entrar a Globe había que usar la dirección que Google Cloud genera automáticamente para el servicio: una URL larga, con números adentro, imposible de dictar por teléfono y fácil de confundir con otra. Servía, pero no era una dirección: era un identificador técnico.

Ahora Globe se entra por **`https://globe.efeoncepro.com`**. Es un nombre bajo el dominio de Efeonce, con certificado de seguridad válido, y **la única dirección** que hay que recordar o compartir dentro del equipo.

Dos detalles que se notan al usarlo:

- **Si escribes la dirección sin `https://`, el sistema te lleva solo a la versión segura.** No hay una versión insegura del sitio.
- **Lo que responde es la aplicación de Globe, no una pantalla intermedia.** Se verificó en vivo el 2026-07-21: la dirección devuelve el shell real de Globe (título `Efeonce Globe — Internal creative studio`), con su propio identificador de correlación en la respuesta — o sea, contestó la aplicación y no un intermediario de red.

> **Detalle técnico:** camino elegido (Global External Application Load Balancer + serverless NEG hacia el servicio `globe-studio-internal`, certificado administrado por Google, redirección de HTTP a HTTPS) en [`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md), y recursos reales aplicados en la sección *Front door internal-only (TASK-1507)* del [runbook de infraestructura](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).

## El login es el mismo de siempre: SSO de Greenhouse

**No hay cuenta nueva, ni contraseña nueva, ni un segundo usuario que administrar.** Entrar a Globe sigue siendo entrar con tu identidad de Greenhouse: Globe te manda a Greenhouse, Greenhouse te reconoce y te devuelve a Globe ya identificado. Lo único que cambió es la dirección desde la que empieza ese viaje.

Para que el cambio de dirección no rompiera el login, el orden importó: **primero** se autorizó la dirección nueva como destino de retorno válido y **después** se le dijo a la aplicación que empezara a usarla. Al revés habría abierto una ventana en la que Globe anunciaba un retorno todavía no autorizado y el login quedaba roto para todo el mundo.

El recorrido completo del login real —ida a Greenhouse, autorización, vuelta a Globe con sesión— se probó de punta a punta **antes y después** de cerrar la puerta vieja, y pasó en ambos casos.

> **Detalle técnico:** contrato de identidad y federación entre las dos plataformas en [`GREENHOUSE_CONNECTIVITY_V1.md`](../../architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md); secuencia de cutover verificada (autorizar el retorno primero, cambiar la dirección después) y smoke de federación humana en la sección *Front door internal-only (TASK-1507)* del [runbook de infraestructura](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).

## Una sola puerta: la URL vieja quedó cerrada a propósito

La dirección larga anterior **ya no responde**. No es un olvido ni un efecto colateral: **se cerró deliberadamente** como parte de este trabajo. El servicio se configuró para aceptar tráfico **solo** a través de la puerta nueva, así que entrar por la dirección vieja desde un navegador devuelve "no encontrado".

La razón es simple: dos entradas al mismo lugar son dos superficies que vigilar, dos direcciones que la gente comparte y dos versiones de "cómo se entra". Una sola puerta es más fácil de gobernar y de auditar.

La dirección vieja **sí sigue autorizada por dentro** como camino de vuelta atrás documentado: si alguna vez hubiera que revertir el cambio, no habría que tocar la base de datos bajo presión. Como la puerta ya está cerrada al navegador, mantenerla en esa lista no abre acceso a nadie.

Volver atrás está previsto y es una **secuencia ordenada, no un menú**: primero se reabre el acceso directo, y **recién entonces** se devuelve la dirección anterior a la aplicación —hacerlo al revés deja el login roto por los dos lados: la dirección vieja sigue bloqueada y la nueva empieza a anunciar un retorno que el navegador no puede alcanzar—. Si hiciera falta ir más lejos, se quita el registro del dominio y, por último, se desarma la puerta completa. Se detiene en el primer paso que resuelva, y no hace falta desarmar la puerta para recuperar el acceso.

> **Detalle técnico:** endurecimiento del ingreso (`internal-and-cloud-load-balancing`) y verificación "directo → 404 / dominio → 200", más el rollback por capas con sus tiempos, en las secciones *Front door internal-only (TASK-1507)* y *Rollback por slice* del [runbook de infraestructura](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).

## La API interna nunca fue ni será accesible desde un navegador

Globe tiene dos piezas: la **cáscara web** (lo que ves y donde haces login) y una **API interna** que hace el trabajo pesado. Este cambio publicó **solo la primera**.

La API interna:

- **No tiene dirección propia ni la tendrá.** No se le asignó dominio y no está detrás de la puerta nueva.
- **Rechaza a cualquiera que llegue sin identidad de máquina** — se verificó antes y después del cambio: un acceso anónimo recibe "prohibido".
- **No reconoce el dominio del navegador como destino válido.** Su identidad esperada se deriva únicamente de su dirección interna, nunca de `globe.efeoncepro.com`.

Dicho en simple: la puerta nueva es para personas; la API interna sigue siendo una conversación entre máquinas, y publicar el dominio no la acercó ni un centímetro a internet.

> **Detalle técnico:** invariante "`globe-api-internal` nunca recibe custom domain ni exposición browser" en [`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md) (sección *Hard rules*), verificado en la sección *Front door internal-only (TASK-1507)* del [runbook de infraestructura](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).

## Cuánto cuesta al mes

Tener dirección propia no es gratis, pero es barato y el número es conocido, no una estimación de servilleta. Con precios vigentes al 2026-07-21, en dólares:

- **Costo fijo: ~US$18,25 al mes.** Es lo que cobra Google por mantener la puerta publicada (US$0,025 por hora por el mínimo de reglas de entrada globales; ese mínimo cubre las primeras cinco y esta puerta usa dos: una para HTTPS y una para la redirección desde HTTP).
- **Costo variable: ~US$0,024 por GiB de tráfico servido** (entrada y salida, US$0,012 por GiB cada una, en la región de Santiago).
- **Certificado de seguridad: sin cargo.** Lo administra Google.

Una nota que evita una sorpresa: si algún día se desarma esta puerta, hay que desarmarla **completa**. Dejar reservada la dirección IP sin nada conectado detrás empieza a facturar como dirección fija ociosa.

> **Detalle técnico:** desglose de precios (fuente: Cloud Billing Catalog API, servicio *Networking*, precios efectivos 2026-07-21) en la sección *Modelo de costo* del [runbook de infraestructura](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra la `TASK-1507`, su lifecycle, QA, cierre documental y handoff — aunque la infraestructura de la puerta y el runtime vivan en `efeonce-globe`, gobernados por `EPIC-028`.
- **Globe conserva su infraestructura y sus secretos.** Greenhouse **no comparte** con Globe base de datos, sesión, bucket, secreto de proveedor, clave de service account ni rol admin. La puerta vive del lado de Globe; Greenhouse la gobierna, no la opera por dentro.
- **La lista de retornos autorizados del login sí vive en Greenhouse**, porque es Greenhouse quien identifica a las personas. Se modifica por una primitive de plataforma —no editando la base a mano— y esa misma primitive queda disponible para que mañana la opere una API, un tool o Nexa, no solo la línea de comandos.
- **El cierre de la puerta vieja ya está bajo infraestructura como código.** Al cerrar `TASK-1507` ese ajuste estaba aplicado a mano con `gcloud`, porque los servicios de Cloud Run todavía no estaban en Terraform. **`TASK-1508` (completa, 2026-07-21) los adoptó**, así que hoy tanto el cierre de la puerta vieja como el número de réplicas están escritos en código y el pipeline de despliegue ya no puede pisarlos.
- **Todo es interno.** No hay producción ni clientes: esta puerta sostiene el piloto interno de Globe.

> **Detalle técnico:** contrato de gobierno del ecosistema en [`PLATFORM_FOUNDATION_V1.md`](../../architecture/creative-studio/PLATFORM_FOUNDATION_V1.md) y [`GREENHOUSE_CONNECTIVITY_V1.md`](../../architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md); estado de runtime en vivo en [`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## Qué NO significa esto

Tener un dominio bonito es justo el tipo de señal que se malinterpreta. Para que quede escrito:

- **No es producción.** Es una puerta interna para un piloto interno. Nada de esto declara Globe como sistema productivo.
- **No es acceso para clientes.** Ningún cliente entra por aquí. El acceso externo tiene su propio gate: **`TASK-1480`**, con evidencia legal, de seguridad, de finanzas y de operaciones. Este cambio no lo adelanta ni lo reemplaza.
- **No habilita nada comercial.** No autoriza ofrecer, vender, demostrar públicamente ni comunicar Globe como producto disponible.
- **No decide dónde vivirá el frontend del producto comercial.** Esa decisión sigue **abierta a propósito**. "Cloud Run para la cáscara interna" **no** significa "Cloud Run para la interfaz de clientes": son superficies distintas y la del producto comercial se decide cuando se construya.
- **No cambia el escalado.** Este trabajo no tocó cuántas réplicas corre Globe, en ninguna dirección. Quien sí lo tocó fue **`TASK-1508`** (completa, 2026-07-21): descubrió que un servicio de Cloud Run tiene **dos** topes de réplicas —uno del servicio y otro de la versión desplegada—, que manda el más bajo, y que ambos servicios estaban con tope efectivo de **una sola réplica** aunque la documentación dijera tres. Lo corrigió a **tres y tres** y dejó los dos valores escritos en código, con lo que el drift-trap del pipeline de despliegue quedó cerrado.

> **Detalle técnico:** los tres gates que la decisión mantiene separados (URL interna estable · escalabilidad/HA · acceso externo y producción) y la decisión diferida del frontend comercial, en [`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md) (secciones *Decision* y *Hard rules*).

> **Detalle técnico y operación:**
>
> - Arquitectura del front door implementado (SPEC-009): [`docs/architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md).
> - Decisión que lo ordena (ADR-004, hosting y front door): [`docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md).
> - Operación de la puerta (recursos reales, secuencia de apply, costo, rollback por capas, diagnóstico del certificado): sección *Front door internal-only (TASK-1507)* del [runbook de infraestructura](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).
> - Continuidad de runtime en vivo: [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
> - Infraestructura keyless que la sostiene: [`efeonce-globe-infra-keyless.md`](efeonce-globe-infra-keyless.md).
> - Persistencia durable que levantó el techo de réplicas: [`persistencia-durable-globe.md`](persistencia-durable-globe.md).
> - ADR y arquitectura del programa: [`EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/**/TASK-1507-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
