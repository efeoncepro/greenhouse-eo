> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.3
> **Creado:** 2026-08-14 por Claude (TASK-1665)
> **Ultima actualizacion:** 2026-08-30 por Claude (TASK-1693 — se puede recorrer la corrida completa, elegir de donde salen las seeds y filtrar el canvas; deltas previos: TASK-1692 el estado del candidato se mueve solo y TASK-1694 una keyword por fila con el filtro de dificultad ya sin decidir)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7, §9 y §10.4

# Descubrir keywords — Expandir seeds y decidir por candidato

## Para que sirve

Responder **que busquedas nuevas puedo investigar hoy, y que hago con cada una**. Es el trabajo
intermedio entre "no se que perseguir" y "ya lo estoy midiendo": tomas una seed, la expandes contra
el proveedor, entiendes su mercado y decides candidato por candidato.

La pantalla vive en `Growth > SEO > Keywords`, lente **Descubrir**
(`/admin/growth/seo/keywords?view=discovery`). No es una ruta nueva: es la misma superficie de
Keywords vista desde otra pregunta.

**Lo que NO hace:** no publica contenido, no activa un prompt AEO, no compara competidores y no
corre sola. Cada corrida la pides tu, y cada corrida cuesta.

## Antes de empezar

| Requisito | Como se verifica |
|---|---|
| El Space tiene el modulo SEO asignado | Aparece en el selector de Space. Si no, ver [asignar-modulo-seo-organizacion.md](asignar-modulo-seo-organizacion.md) |
| El Space tiene sitio y mercado configurados | Si falta, la lente lo dice con esas palabras y no deja escribir seeds |
| Permiso para ver | Capability `growth.seo.observation.read` |
| Permiso para gastar | Capability `growth.seo.target.configure`. **Sin ella ves todo pero no aparece ningun boton de accion** — no esta apagado, no esta |
| El descubrimiento esta encendido | Flag `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED`. Con el apagado la lente explica por que y no monta el boton |
| Solo para preparar consultas AEO | Capability `growth.ai_visibility.prompt_set.manage` + perfil AEO del Space + flag del grader. Si falta alguna, la accion no se ofrece y la razon se dice ahi mismo |

**No hace falta Search Console.** Descubrir funciona con una seed escrita a mano, justamente para
que un Space recien creado —cuando mas falta hace investigar— no quede bloqueado.

## Paso a paso

### 1. Escribe las seeds

Una por linea, entre 1 y 10 despues de limpiar duplicados. El contador `N/10` te dice donde estas.
El proveedor limita cada seed a 80 caracteres y 10 palabras; si te pasas, el campo lo dice sin
borrarte lo que ya escribiste.

La seed es **texto tuyo**. El sistema no adivina tu marca ni tu categoria.

### 2. Elige como expandirlas

Entre 1 y 3 metodos:

| Metodo | Que hace | Cuantas llamadas |
|---|---|---|
| **Sugerencias** | Variantes que contienen la seed | Una **por seed** |
| **Relacionadas** | Terminos vecinos semanticamente | Una **por seed** |
| **Ideas** | Ideas para el lote completo | Una por corrida |

Esa diferencia es la que hace que el costo suba: 5 seeds con Sugerencias son 5 llamadas, no 1.

### 3. Elige el alcance

`Rapido 25` o `Completo 50` filas por llamada. El numero es el techo por endpoint, no el total.

### 4. Lee la banda de costo antes de confirmar

Es la parte que no puedes saltarte. Responde cuatro preguntas sin abrir otra pantalla:

- **que se enviara** (seeds y metodos);
- **cuantas llamadas** al proveedor;
- **costo maximo estimado** en USD, con la formula a la vista;
- **que pasa despues** (la corrida es asincrona: puedes irte).

El estimado es el **peor caso** a proposito: asume que el enriquecimiento comprara el maximo. La
corrida real cuesta igual o menos. Si sale mas barata, esa diferencia **no es credito reutilizable**
— el ledger de gasto es la autoridad, no la pantalla.

### 5. Confirma y espera

La corrida no es instantanea. Puedes salir de la pantalla y volver: el estado persiste.

### 6. Revisa los candidatos

La tabla trae, por candidato: keyword, procedencia, agrupador, intencion, volumen, barrera de
enlaces, presencia propia y estado. A 390px la tabla se recompone en tarjetas — **no se encoge y no
hay scroll horizontal** — y ninguna columna decisoria desaparece.

### 7. Abre el detalle y decide

El boton **Detalles** de cada fila abre el panel lateral. El orden del panel es deliberado:
procedencia primero, acciones al final. Se lee de arriba abajo y recien entonces se decide.

## Que significan las señales

### Los dos marcadores nunca se promedian

| Marcador | Significa | De donde viene |
|---|---|---|
| `◑` | **Estimado de mercado** | DataForSEO Labs. Estimacion mensual del mercado publicitario |
| `●` | **Medido por Search Console** | Tu propio sitio. Dato real, no estimacion |

Viven en columnas distintas y **no se combinan en una sola cifra**. Un candidato puede tener las dos,
una, o ninguna.

### La ausencia se nombra, no se rellena

Nunca veras un `0` ni un `—` ambiguo:

| Texto | Significa |
|---|---|
| `Sin dato de mercado` | Preguntamos y el proveedor no tiene el dato |
| `Sin medicion propia` | Search Console no midio ese termino para tu sitio |
| `No aparece en la serie` | Hay medicion, pero el sitio no aparece posicionado |
| `Sin agrupador` / `Sin dato de intencion` | El proveedor no lo entrego |

### Barrera de enlaces, no "dificultad"

La columna se llama **Barrera de enlaces** y va en niveles `Baja / Media / Alta`.

**No es el indice de dificultad del proveedor.** Ese indice tiene un piso duro en su formula y
colapsa a `0` en busquedas en español de LATAM, donde se leeria como "trivial" siendo falso —
`pintura` da dificultad 0 con 135.000 busquedas al mes en Mexico. Lo que ves es el nivel derivado de
la **diversidad de dominios que enlazan al top 10**, no del conteo de enlaces.

`Baja` **no significa facil**: significa que ahi se compite con contenido y autoridad, no con
enlaces. Y `Sin dato` es `Sin dato`, nunca `Baja` — presentar un hueco como barrera baja afirmaria
una oportunidad que nadie midio.

### Una keyword, una fila (desde 2026-08-28)

Una misma keyword puede aparecer por dos caminos distintos: la encuentra Sugerencias y tambien
Relacionadas. **Eso es una sola oportunidad, no dos.** Desde `TASK-1694` la ves una vez, con la
lista de por donde llego guardada como procedencia, y el total de candidatos cuenta keywords
distintas.

Importa porque cada fila trae su propio boton de decision, y seguir una keyword compromete gasto
todos los dias. Dos filas de lo mismo eran dos compromisos de gasto sobre una sola intencion.

> Nota para quien consulte por API, Nexa o MCP: `totalCandidates` cuenta keywords, no procedencias.
> Si comparas contra una lectura vieja el numero puede bajar sin que se haya perdido nada.

### Aviso de canibalizacion

Cuando el candidato pertenece al mismo grupo de sinonimos que una keyword que **ya sigues**, el
contrato lo advierte y nombra contra cual choca. Dos objetivos sobre la misma intencion se diluyen
entre si: lo correcto es consolidar, no sumar una segunda apuesta con su propio gasto recurrente.

Es un **aviso, nunca un bloqueo** — decides tu. Y tiene tres respuestas posibles, que no significan
lo mismo:

| Respuesta | Que significa |
|---|---|
| `Choca` | Otra keyword que ya sigues apunta a la misma intencion. Se te nombra cual |
| `Libre` | Se pudo revisar todo y no choca con nada de lo que sigues |
| `Sin determinar` | **No se pudo saber.** Falta el dato de mercado de alguna keyword seguida |

`Sin determinar` no es `Libre`. No saber si hay choque y saber que no lo hay son cosas distintas.

### El filtro de dificultad cambio

El filtro por el indice de dificultad del proveedor **ya no filtra nada**: se sigue aceptando para
no romper a quien lo tenia guardado, pero la respuesta declara que lo ignoro y cual es el filtro
correcto. Si lo mandas y el conteo no baja, no es un error: es el contrato diciendote la verdad.

El filtro que si decide es el de **barrera de enlaces**, y por defecto **deja fuera lo que no tiene
dato medido** — pedirlo incluido es una opcion explicita, porque "Sin dato" no es "Baja".

### El estado del candidato ahora se mueve solo (desde 2026-08-28)

Antes, el chip cambiaba sólo al descartar. Preparar consultas AEO o promover a seguimiento pasaban
de verdad, pero el candidato seguía diciendo `Nuevo`. Ya no: cada decisión queda registrada por el
proceso que la produce, y el chip refleja lo que realmente pasó.

Dos cosas que vas a notar sin que nada de la pantalla haya cambiado:

- **La bandeja se reordenó.** Lo que ya decidiste baja; arriba queda lo que espera decisión. Si te
  parece que "se perdieron" candidatos, no se perdieron: bajaron porque ya los resolviste.
- **Un descartado se puede volver a elegir.** El historial sólo agrega, nunca borra: volver a
  elegirlo escribe una decisión nueva que reemplaza al descarte, y el candidato vuelve a ser
  elegible para preparar consultas AEO.

### Qué NO se registra, y por qué

Si intentas seguir una keyword y el target está en su techo, **no queda registro de promoción** —
porque no hubo promoción. Anotar un intento fallido como si hubieras promovido sería justo la clase
de dato que después hace que un reporte mienta.

Sí queda registro cuando la keyword **ya estaba** en seguimiento: tomaste la decisión igual, aunque
el resultado no mueva el conteo.

### Estados del candidato

`Nuevo` · `Ya seguido` · `Descartado` · `Preparando AEO`.

> `Marcado como objetivo` dejó de existir como estado propio: declarar objetivo **es** seguir la
> keyword con esa intención, así que su estado es `Ya seguido` y la intención viaja con él.

### Estados de la corrida

| Estado | Que significa | Que puedes hacer |
|---|---|---|
| `En cola` | Se registro, el worker todavia no la toma | Salir y volver. **No la vuelvas a pedir** |
| `Corriendo` | El worker esta llamando al proveedor | Esperar |
| `Lista` | Termino completa | Revisar candidatos |
| `Parcial` | Una etapa fallo o se corto por presupuesto | Revisar lo que si llego; la razon se dice por fuente |
| `Sin resultados` | El proveedor respondio bien y no hubo nada | Cambiar seeds o metodo |
| `Presupuesto bloqueado` | El gasto disponible no alcanza | Reducir alcance o esperar el ciclo |
| `Error del proveedor` | Fallo la llamada | Reintentar **explicitamente**. No se reintenta solo |

## Las cinco decisiones

| Accion | Que hace de verdad | Confirmacion |
|---|---|---|
| **Declarar objetivo** | Lo incorpora al seguimiento diario **y** lo marca como posicion que buscas ocupar | Si |
| **Seguir oportunidad** | Lo incorpora al seguimiento diario sin declararlo como posicion buscada | Si |
| **Preparar grounded queries** | Crea un **borrador** de consultas AEO para revision humana | Si |
| **Descartar** | Registra tu decision. **No borra la evidencia** | Si |
| **Ver trayectoria** | Abre Rendimiento con ese termino. Solo lectura | No |

### Seguir cuesta dinero todos los dias

Esta es la advertencia que la pantalla repite y que este manual repite: **el alta no cuesta nada, el
mantenimiento si**. La captura de rankings le paga al proveedor por cada keyword vigente en cada
ciclo, hasta que alguien la deje de seguir. Por eso hay un cupo por sitio y por eso cada alta pide
confirmacion.

Si te equivocaste, la salida es dejar de seguir la keyword desde la lente **Oportunidades** — no
descartar el candidato, que es otra cosa.

### Que dice cada resultado

El resultado se anuncia **por termino**, nunca como un "Listo" generico:

| Mensaje | Que paso |
|---|---|
| `Listo: ahora sigues «X»` | Se agrego. Desde ahora se mide a diario |
| `«X» quedo declarada como objetivo` | Se agrego y quedo clasificada |
| `Ya seguias «X»` | **No paso nada nuevo.** No se duplico ni el registro ni el gasto |
| `Cambiaste la clasificacion de «X»` | Se reclasifico. **No consume cupo nuevo** |
| `No se agrego «X»: el seguimiento llego a su cupo` | **No se agrego.** Deja de seguir algo antes |
| `No se pudo usar «X»` | El termino no cumple el formato del proveedor |

Un mensaje de cupo llega con la pantalla en verde y sin error rojo: **es un resultado, no una falla
de red**. Leelo, porque significa que esa keyword no esta siendo medida.

### Preparar consultas AEO: borrador, no activacion

Crea un **borrador** que alguien tiene que revisar. No activa el set y no ejecuta una corrida del
grader.

Hay dos resultados posibles y la diferencia importa:

- **Borrador razonado** — el modelo uso el contexto de la marca.
- **Borrador base** — el modelo no estaba disponible y salio de la plantilla. La pantalla te lo dice
  con esas palabras: `sin el modelo`. **Revisalo con mas atencion**, porque no esta pegado a la
  marca.

## Elegir de donde salen las seeds

Antes de lanzar una corrida decides **la fuente**: de donde salen las palabras que se van a expandir.
Son cuatro y no dan lo mismo.

| Fuente | De donde sale | Cuesta resolverla | Cuando conviene |
|---|---|---|---|
| **Consultas medidas** | Tu Search Console, ultimos 28 dias, por impresiones | No | **La mejor por defecto cuando tienes datos.** Parte de busquedas que gente real ya hizo hacia tu sitio, no de intuicion |
| **Keywords seguidas** | Los terminos que ya monitoreas | No | Para profundizar alrededor de lo que ya decidiste perseguir. No crea seguimiento nuevo |
| **Seeds escritas** | El texto que escribes tu | No | Cuando exploras un territorio nuevo del que todavia no tienes datos |
| **Dominio propio** | El dominio del sitio, sin seeds | Si (es el metodo) | Para una foto amplia. Obliga el metodo `keywords_for_site` |

Cada fuente muestra **cuantas seeds aportaria** al lado de su nombre («Consultas medidas · 10»). Ese
numero decide mas de lo que parece: resolver las seeds es gratis en las tres primeras, pero **la
expansion se paga por seed**, asi que una fuente con 10 seeds cuesta mas que una con 2.

🔴 **Una fuente sin insumo no se puede usar, y te lo dice.** Si tu Space no tiene consultas medidas en
los 28 dias, «Consultas medidas» queda bloqueada con su razon y el boton no deja enviar. **Nunca**
cae en silencio a «Seeds escritas»: si eso pasara, leerias los resultados de una pregunta creyendo
que corriste la tuya.

⚠️ **Que las seeds sean medidas no vuelve medidos los resultados.** El proveedor devuelve
estimaciones (`◑`) igual. La lente de la seed no se contagia al candidato.

## Recorrer la corrida completa

Una corrida puede materializar hasta 500 candidatos y la pantalla te sirve **50 por vez**, empezando
por los de mayor prioridad segun el orden gobernado. Cuando quedan mas, al pie de la tabla aparece
**«Ver N candidatos mas»**.

- **Recorrer no cuesta.** Ese boton lee lo que ya se compro: no lanza una corrida, no llama al
  proveedor y no toca tu presupuesto. Por eso se ve distinto del boton azul «Descubrir keywords»,
  que si gasta.
- **Lo que ya leiste se queda.** Las filas nuevas se agregan al final; nada se reordena ni desaparece.
- **Si la corrida todavia esta corriendo, el boton no aparece.** No es un error: mientras el worker
  sigue materializando, la lista crece y paginar te haria saltar o repetir filas sin avisarte.
  Espera a que termine.

## Filtrar el canvas

Sobre la tabla tienes buscador, procedencia, intencion, **barrera maxima** y volumen minimo, mas dos
interruptores («Solo no seguidas» e «Incluir sin dato de barrera»). A 390px se agrupan en el boton
**Filtros (N)**, que muestra cuantos tienes activos.

- Los filtros **se aplican en el servidor**, no sobre lo que alcanzaste a bajar. Por eso el conteo del
  encabezado sigue al universo filtrado: si dice «2 candidatos», son 2 en toda la corrida, no 2 en la
  pagina que estas mirando.
- Los filtros **viajan en la URL**: puedes compartir el enlace con los filtros puestos.
- 🔴 **No existe filtro por «dificultad».** Se retiro a proposito: la cifra del proveedor colapsa a 0
  en SERPs en espanol y filtrar por ella te devuelve keywords de barrera Alta creyendo que pediste lo
  facil. El control correcto es **Barrera maxima**, derivada del perfil real de enlaces del top-10.
- «Sin dato» no es «Baja». Si filtras por barrera, lo no medido queda fuera salvo que marques
  explicitamente «Incluir sin dato de barrera».

## Que no hacer

- **No confirmes sin leer la banda de costo.** Es el riesgo numero uno de la pantalla.
- **No repitas una corrida que quedo `En cola`.** Ya esta registrada; pedirla de nuevo gasta dos
  veces por la misma pregunta.
- **No leas `Barrera: Baja` como "facil".** Significa que se compite con contenido, no con enlaces.
- **No leas `Sin dato de mercado` como cero demanda.** Es "no sabemos", no "no hay".
- **No trates un mensaje de cupo como un error transitorio.** Reintentar no lo resuelve.
- **No uses Descartar para dejar de seguir.** Descartar registra una decision sobre un candidato;
  dejar de seguir cierra una membresia y detiene el gasto. Son cosas distintas.
- **No supongas que un borrador AEO quedo activo.** No lo esta hasta que alguien lo apruebe.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| No aparece la lente `Descubrir` | Flag apagado o modulo SEO no asignado | Ver el flag `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` y la asignacion del Space |
| Veo todo pero no hay ningun boton de accion | Te falta `growth.seo.target.configure` | Es lo esperado: ver y comprometer gasto son dos permisos |
| El boton `Descubrir keywords` no esta | Falta flag, permiso, sitio o seed valida | La banda de costo dice cual de los cuatro |
| `Preparar grounded queries` no se ofrece | Falta capability AEO, perfil del Space o flag del grader | La razon exacta aparece bajo las acciones |
| La corrida quedo en `Corriendo` mucho rato | El worker puede estar atascado | Revisar la señal de confiabilidad de corridas atascadas en `/admin/operations` |
| `Presupuesto bloqueado` | El gasto disponible del ciclo no alcanza | Reducir alcance o esperar |
| El detalle no abre | Sin candidatos materializados no hay boton `Detalles` | Revisar el estado de la corrida |

## Accesibilidad y teclado

- El detalle se abre con un **boton**, no con un click de fila: es alcanzable por teclado y ninguna
  accion vive detras de hover.
- Dentro del panel el foco queda atrapado; `Escape` lo cierra y el foco **vuelve a la fila** que lo
  abrio.
- Con una confirmacion abierta, `Escape` cierra **primero la confirmacion** y solo despues el panel.
- Los resultados se anuncian por lector de pantalla (`aria-live`), no solo se pintan.
- Con `prefers-reduced-motion` activo el estado final es identico: se quitan los cross-fades, se
  conserva el indicador de corrida en curso.
- `◑` y `●` siempre llevan texto; el estado nunca depende solo del color.

## Referencias tecnicas

- Arquitectura: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7, §9, §10.4
- Operacion del motor (backend, corridas, costos):
  [operar-keyword-discovery-seo.md](operar-keyword-discovery-seo.md)
- Seguir keywords desde Oportunidades y dejar de seguir:
  [seguir-keywords-oportunidades-seo.md](seguir-keywords-oportunidades-seo.md)
- Puente hacia consultas AEO:
  [preparar-grounded-queries-desde-seo.md](preparar-grounded-queries-desde-seo.md)
- Datos de mercado por keyword:
  [operar-datos-de-mercado-keywords.md](operar-datos-de-mercado-keywords.md)
- Codigo: `src/views/greenhouse/admin/growth/seo/keywords/discovery/`,
  `src/lib/growth/seo/keyword-discovery/`
