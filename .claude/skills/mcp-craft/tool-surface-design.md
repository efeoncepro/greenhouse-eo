# Diseño de la superficie

## Granularidad: la pregunta está mal planteada

El consejo repetido —*"no envuelvas endpoints, construye tools de workflow"*— circula como
consenso. **No lo es.** Hay disidencia publicada y sustantiva: un vendor grande rechaza la
doctrina explícitamente; una guía de referencia de Anthropic dice *"cuando dudes, prioriza
cobertura amplia de la API"*; hay quien sostiene que **dividir** una tool multipropósito le da
claridad al modelo; y quien documenta que un envoltorio 1:1 es legítimo para validar rápido o
sobre una API limpia y uniforme.

Y sin embargo la evidencia MEDIDA no está repartida por igual:

- **Contra envoltorios crudos, la evidencia es fuerte.** Servidores oficiales 1:1 puntúan
  16–21% pass@1 en un benchmark de terceros con intervalos de confianza. Un servidor curado
  ganó las cinco escenas contra un envoltorio SQL delgado del mismo producto.
- **A favor de reestructurar lo ya curado, no hay evidencia.** Los dos tests controlados más
  limpios dieron igual tasa de aprobación (90% vs 90%) o **peor** precisión al subir la
  complejidad.

**La regla que se sostiene:** cura la superficie cruda —eso sí paga—, y a partir de ahí justifica
todo rediseño **por presupuesto de contexto**, nunca prometiendo precisión.

### Lo que en realidad decide la granularidad

No es el gusto: son tres restricciones duras, en este orden.

1. **Clase de riesgo (§4 y §5 de la SKILL).** Nunca mezcles read con write. El modelo de
   seguridad del protocolo pone el techo antes que cualquier argumento de tokens.
2. **Encadenamiento.** Los agentes siguen siendo malos encadenando muchas llamadas. Si tu tarea
   típica exige diez saltos, el problema es la forma de las tools, no el modelo.
3. **Presupuesto de contexto.** Y ojo: **tiene sustituto.** Con búsqueda de tools o ejecución de
   código puedes tener primitivas Y contexto chico a la vez. Por eso la literatura de 2025 empuja
   a consolidar y la de 2026 ya no: apareció el sustituto.

## Presupuesto: mide, no opines

🔴 **SIEMPRE** mide el costo de contexto de la superficie antes de mergear. Es la parte del
diseño donde hay números buenos y no hay excusa para el juicio a ojo.

Umbrales publicados (ver `SOURCES.md` para grados):

| Referencia | Umbral |
|---|---|
| Degradación de elección de tool | empieza pasadas las 30–50 tools |
| Techo autoimpuesto por un servidor grande | **~20 visibles, nunca más de 25** — verificado en su test |
| Largo máximo de descripción | **2048 chars**, porque un cliente conocido corta en 1024 |
| Partir el servidor | por encima de ~50 tools |

**El hallazgo más útil sobre conteo:** con selección adaptativa, **siete tools igualaron a
cincuenta** en cobertura sobre un registro de 370. El conteo que importa no es el que tienes, es
el que **está en contexto en esta petición**.

### Dónde está tu costo, casi siempre

Mide **por dominio** antes de optimizar. Es normal que un dominio se lleve el 90% y el resto sea
ruido: optimizar el ruido es trabajo perdido.

Y el lever más grande no son las definiciones: **son las RESPUESTAS.** Un censo del ecosistema
midió mediana 98 tokens, media 4.431, **máximo 557.766**, con 16 tools capaces de reventar sola
la ventana de un modelo. Pagina por **presupuesto de tokens, no por cantidad de registros** — los
tamaños varían cuatro órdenes de magnitud.

## Naming

- **Prefijo consistente por servicio o recurso.** No es estética: hace que una búsqueda de tools
  matchee el grupo entero, y en un agregador es **obligación del spec** desambiguar.
- Un patrón recomendado y con razón declarada: **dominio-sustantivo-verbo** (`github_issue_create`,
  `github_issue_list`), porque el orden alfabético agrupa lo relacionado.
- El prefijo importa incluso entre tools genéricas: renombrar `search_tools` a `search_<x>_tools`
  se hizo explícitamente *"para reducir la confusión de agentes que tienen otros `execute_tool` o
  `search_tools` en contexto"*.
- Argumentos en un solo estilo, y que un alias desconocido **falle** la validación, no que se
  acepte en silencio.

## Descripciones

La descripción es un **prompt**, no documentación. Y es cara: está siempre en contexto.

- **Dispara, no enseña.** Lo que enseña a operar la superficie va en otro canal (un manual servido
  por tool o recurso), no en la descripción. Alargarla degrada la selección de las vecinas.
- Escríbela *"como se la describirías a alguien que entra al equipo"*.
- **Una tool es una consulta MÁS una interpretación**: umbrales, ventanas temporales, líneas base.
  Eso sí va en la descripción, porque es lo que el agente no puede deducir.
- Di **cuándo** usarla, no sólo qué hace. *"Úsala cuando el cliente ya eligió un producto y
  necesita detalle para decidir la compra"*.
- Declara efectos secundarios y **costo**. Si la llamada compromete gasto, dilo, y dile al agente
  que proponga la lista exacta y **obtenga confirmación humana antes de llamar**.
- 🔴 **NUNCA** metas instrucciones de alcance global (`IMPORTANTE`, `SIEMPRE`, `DEBES`) que
  intenten gobernar al agente más allá de este resultado.
- ⚠️ **Editar una descripción es un cambio rompiente y casi nadie lo trata así.** Un estudio con
  revisión encontró que "mejorar" descripciones **regresó el 16,67% de los casos**, y toda edición
  **invalida el cache de prompt completo**. No hay consenso de industria; el mínimo defendible es
  que un cambio de descripción pase por el mismo eval que un cambio de comportamiento.

## Forma de la respuesta

Las respuestas son **UX de producto para agentes**.

**Incluye:** identidad, URLs de navegación, estado operativo, y **handles de seguimiento** — los
ids o cursores que la siguiente llamada documentada necesita.

**Evita:** JSON crudo de la API upstream; ids internos que no sirven como handle; ruido de
placeholders (`null`, `undefined`, arrays vacíos); nombres de campo upstream cuando existe una
etiqueta de usuario; payloads opacos largos que obliguen a ingeniería inversa.

- 🔴 **NUNCA emitas UUID crudos.** Remapearlos a identificadores con significado midió ~9× menos
  errores; también mejora la precisión de recuperación.
- **Devuelve el campo que evita la segunda llamada.** En un A/B controlado, el servidor "mejor
  diseñado" gastó **5× más tokens** porque su `search` omitía un id y forzaba un `get` por ítem.
- `structuredContent` es la fuente de verdad cuando está; el `content` de texto es la vista de
  compatibilidad. **Nunca pongas un dato único en un solo lado.** Y no derrames esquemas
  permisivos de la API upstream: filtras campos internos a tu interfaz pública.
- Ofrece **modos de forma**: detallado vs conciso, o "sólo nombres / sólo ids". Un caso midió
  206 → 72 tokens con un simple enum de formato.

## Errores

🔴 **El fallo dominante no es la redacción: es devolver errores como éxitos.** Un censo estimó que
~59% de los resultados sin bandera de error contenían errores (juicio de un LLM, no auditoría
manual — pero el orden de magnitud es el hallazgo).

- Enruta a `isError: true` todo lo que el modelo pueda corregir; deja el error de protocolo para
  lo que no. Ver `protocol-radar.md`.
- Un buen error **diagnostica y corrige**: *"campo desconocido 'stauts' — ¿quisiste decir
  'status'?"*. Y cuando el problema es de tamaño, el error dice **cómo** leer un subconjunto, en
  vez de regañar.
- 🔴 **NUNCA devuelvas al agente un mensaje de error de fuente no confiable** (input de usuario,
  API de terceros, error de base de datos): es inyección de prompt por la puerta de atrás. Sólo
  mensajes de fuentes confiables o plantillas propias.
- En escritura por lotes: **outcome tipado por ítem**, jamás un booleano global. No hay convención
  MCP para éxito parcial (`isError` es un solo booleano por llamada), así que la convención la
  pones tú, en el payload, y la documentas en la descripción.

## Cuando la superficie ya no cabe

Dos curas, ambas con adopción real:

1. **Toolsets estáticos** seleccionados por parámetro de URL o flag (`?category=`, `?bouquet=`,
   rutas `/minimal|/code|/full`). Simple, predecible, y compatible con `tools/list` estable por
   autorización. Los mejores exponen además un endpoint para **previsualizar** qué superficie
   produce una configuración.
2. **Meta-tools / capa de búsqueda**: una superficie chica (search + execute) sobre un catálogo
   grande. Recupera precisión, no sólo tokens.

⚠️ El único dato medido sobre **descubrimiento dinámico en runtime** lo dejó **último en todos los
ejes** frente a alternativas. Y hay reportes de usuarios de que los agentes simplemente no
descubren las tools. Trátalo como la opción con más riesgo de las tres.

**La ejecución de código** es la cuarta vía: ahorra tokens y turnos de forma grande y medida, pero
el test controlado mostró **misma precisión** en tareas simples y **peor** en tareas de tres
servidores. Además exige sandbox real. No es gratis y no mejora la calidad.
