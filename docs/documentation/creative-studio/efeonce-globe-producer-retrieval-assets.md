# Efeonce Globe — Descarga, vista previa y acciones sobre las piezas generadas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-22 por Claude (TASK-1503)
> **Ultima actualizacion:** 2026-07-23 (TASK-1503/TASK-1505/TASK-1519)
> **Documentacion tecnica:** [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)

## Qué es y para qué sirve

Es el **lado de salida** del Creative Producer de Efeonce Globe: lo que hace *usable* una pieza que ya se
generó. Cubre cuatro cosas:

- **Ver** una pieza (vista previa dentro de la interfaz).
- **Descargarla** como archivo.
- **Marcarla como favorita** (la ⭐ de "Mis generaciones").
- **Reusarla como referencia** de una generación nueva ("quiero otra imagen con este mismo personaje").

Hasta ahora Globe sabía **guardar** las piezas que producía, pero no había forma gobernada de **sacarlas**:
los bytes solo se resolvían dentro del motor, para alimentar a un modelo en una edición. Esta capacidad abre
esa puerta, y la abre con llave.

## Por qué existe (y por qué es una superficie de seguridad, no una comodidad)

Las piezas se guardan en un depósito **direccionado por contenido**: el nombre de cada archivo *es* la huella
digital de su contenido, y hay **un solo depósito para todos los clientes**. Ese depósito guarda dos cosas
distintas mezcladas: las **piezas producidas** y los **bytes de las referencias que alguien subió como
insumo**.

Eso significa que un "servime cualquier archivo del depósito" filtraría dos cosas a la vez: la pieza de otro
cliente y el material de referencia que alguien declaró de forma privada. Y el depósito **no puede** cerrar
esa puerta, porque no sabe qué archivo es de quién.

Por eso la puerta está en Globe, no en el depósito: cada descarga se autoriza contra **la lista de piezas que
el espacio de trabajo de quien pregunta realmente produjo**.

## Cómo se comporta

- **Solo ves lo tuyo.** Una pieza de otro espacio de trabajo responde "no encontrada". No dice "existe pero no
  podés"; dice exactamente lo mismo que si nunca hubiera existido — porque decir algo distinto ya sería una
  pista.
- **Una referencia de entrada nunca se descarga.** Aunque sus bytes estén en el mismo depósito, solo se sirven
  **piezas producidas y retenidas**. Un material de referencia entra por huella y no sale nunca por esta vía.
- **Nadie recibe bytes "por consultar".** El primer paso devuelve una **ficha** de la pieza (qué es, de qué
  tipo, cómo se va a entregar) más un **pase temporal**. Los bytes viajan aparte, en una segunda llamada que
  canjea ese pase.
- **El pase no abre nada por sí solo.** Está firmado, dura pocos minutos y está atado a una pieza, un espacio
  de trabajo y una modalidad de entrega. Aun teniéndolo hay que estar autenticado y seguir siendo dueño de la
  pieza; si dejó de serlo, el pase no sirve.
- **Si el depósito falla, lo dice.** Nunca entrega un archivo vacío ni bytes equivocados: verifica que lo que
  bajó coincide con la huella declarada y, si algo no calza, responde "dependencia no disponible, reintentá".
- **Marcar favorito no es un interruptor a ciegas.** Se envía el estado deseado ("marcada" / "no marcada"), así
  que repetir la acción por un reintento no la desmarca sin querer.
- **Reusar como referencia no gasta.** No corre ningún modelo: certifica la pieza como referencia reutilizable
  y le pega la etiqueta de derechos que corresponde. Lo que se cobra es la generación que después la use.
- **Los derechos se heredan hacia abajo.** Si la pieza original se hizo con material **licenciado**, la
  referencia derivada sigue arrastrando esa restricción. Nunca se "limpia" a material propio.

> Detalle técnico: contrato en `efeonce-globe/packages/contracts/src/producer-assets.ts`; autorización, lectores
> y comandos en `packages/domain/src/producer-assets.ts`; lectura del depósito en
> `apps/creative-runner/src/output-retrieval.ts`; ruta de entrega y pase firmado en
> `apps/studio-web/src/{app.ts,retrieval-grant.ts}`; persistencia en
> `packages/database/src/stores/producer-asset-store.ts` + migración `0003`.

## Qué significan los estados

| Respuesta | Qué pasó | Qué hacer |
|---|---|---|
| **No encontrada** | La pieza no es de este espacio de trabajo, no existe, o es un material de referencia (nunca descargable) | Revisar que la pieza sea propia y que la generación haya terminado bien |
| **Acceso denegado** | El pase venció, fue alterado, o se intentó usar para otra pieza/modalidad | Volver a pedir la ficha: genera un pase nuevo |
| **Bloqueado por política** | La capacidad está apagada en ese ambiente | Es una decisión operativa: ver el manual de uso |
| **Dependencia no disponible** | El depósito no respondió, o falta la clave de firma | Reintentar; si persiste, es un tema de operación |

## Qué está operativo hoy

Está **encendida y funcionando** en el entorno interno de Globe: se probó en vivo generando una pieza
real, descargándola por el camino gobernado y confirmando que un asset de otro cliente y un material
de referencia responden "no encontrado".

`TASK-1519` abrió la puerta humana internal-only mediante BFF same-origin. Image, Video y Audio se recuperaron
desde el feed/viewer con descriptor y grant; el browser no conoce GCS ni recibe una URL del proveedor. El header
`x-globe-retrieval-grant` es el transporte principal y una Blob URL local alimenta `<img>`, `<video>` o `<audio>`.

Si `/v1/session` responde `401`, el problema es sesión ausente/expirada, no storage. Hoy el modal puede terminar
mostrando una recuperación genérica; el siguiente paso correcto es reautenticar, conservar el correlation ID y
mejorar el CTA. Si la sesión sigue viva pero rotó CSRF por otra pestaña, el cliente refresca y reintenta una sola
vez.

El uso por clientes externos sigue siendo un programa aparte (`TASK-1480` y dependencias), no un interruptor.

## Quién puede usarla

Requiere la autoridad `globe.producer.assets.operate`. Es **propia y de gasto cero**: deliberadamente **no** es
la autoridad del Model Lab, que permite gastar con proveedores. Descargar lo que ya produjiste no debe implicar
poder facturar.

La tienen el principal de servicio y las personas internal-only con grants Producer acotados. La UI no obtiene
capacidad de gasto por poder descargar: ejecución y output-side conservan capabilities separadas. MCP y clientes
externos permanecen sujetos a sus propios gates.

## Relacionados

- [Catálogo gobernado de rutas](efeonce-globe-producer-catalog.md) — qué puede hacer cada ruta.
- [Model Lab](efeonce-globe-model-lab.md) — dónde se producen las piezas.
- [Persistencia durable](persistencia-durable-globe.md) — dónde viven las marcas y referencias.
- Manual: [Operar descarga y acciones de piezas](../../manual-de-uso/creative-studio/operar-retrieval-assets-globe.md).
