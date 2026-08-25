# Estructura canónica del brief editorial SEO/AEO — V1

> **Tipo de documento:** contrato de proceso
> **Versión:** 1.2 · **Creado:** 2026-08-25 · **Última actualización:** 2026-08-25
> **Dueño del oficio:** `content-marketing-studio` ([`templates/content-brief.md`](../../.codex/skills/content-marketing-studio/templates/content-brief.md)) + `copywriting` (titulares) + `seo-aeo` (descubribilidad y citabilidad)
> **Metodología del research que lo alimenta:** [`SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md)
> **Cómo se deposita en el sistema del cliente:** [`producir-serie-de-briefs-seo.md`](../manual-de-uso/growth/producir-serie-de-briefs-seo.md)
> **Qué pasa DESPUÉS del brief (cliente Berel):** la skill `berel-content-production` — ciclo mensual
> de producción, redacción, banners, derivados sociales y carga al CMS. Este documento cierra en el
> brief; esa skill lo toma desde ahí.

## El error que este documento corrige

Se entregaron briefs de **70.000 caracteres**. Un brief de ese tamaño **no se puede usar para
redactar**: nadie escribe con un informe de 12.000 palabras al lado. Lo que se produjo fue un
**dossier de research disfrazado de brief**.

**Son dos artefactos distintos y no se mezclan:**

| | **Brief** | **Dossier de research** |
|---|---|---|
| Pregunta que responde | *¿qué escribo y bajo qué reglas?* | *¿por qué este tema y no otro?* |
| Lector | quien redacta | quien decide y quien audita |
| Extensión | **1–2 páginas. Techo duro: 12.000 caracteres** | la que haga falta |
| Vida útil | hasta que la pieza se publica | permanente, es la evidencia |
| Dónde vive | el slot del sistema editorial del cliente | anexo enlazado, fuera del slot |

**Regla dura:** el brief **cita la conclusión y enlaza la evidencia**. No la transcribe.
Si una sección del brief necesita más de ~10 líneas, su detalle pertenece al anexo.

**Prueba de que la estructura funciona:** el primer brief escrito con estos once bloques salió en
**10.035 caracteres** —dentro del techo— **sin recortar al final**. El recorte fue de diseño: cada
bloque nació con su límite y el research se quedó en el anexo desde el principio. No hubo una pasada
posterior de tijera, que es justo la señal de que el problema era estructural y no de extensión.

## De qué plantilla sale esta estructura

Esta no es una plantilla nueva: es la **adaptación al caso SEO/AEO de cliente** de la plantilla
canónica de `content-marketing-studio`. Quien la conozca reconoce sus bloques; lo que cambia es el
orden de lectura y lo que se vuelve bloqueante.

| Bloque de este documento | Sección de la plantilla canónica |
|---|---|
| 1. La pieza en una línea · 3. Objetivo y métrica | *Qué y para qué* (título de trabajo, objetivo + etapa de funnel, métrica de éxito) |
| 4. Lector, JTBD y nivel de consciencia · 6. La gran idea y el ángulo propietario | *Audiencia* (ICP/JTBD, nivel de consciencia Schwartz, ángulo propietario) |
| 5. Lugar en la arquitectura | *Qué y para qué* → pillar/cluster |
| 2. Los cuatro titulares · 7. Estructura de la pieza · 9. Descubribilidad | *Formato y producción* (formato, longitud, canal, assets, descubribilidad) |
| 10. Salida | *Salida* (plan de distribución, mapa de átomos, CTA) |
| 11. Gate de review | *Gate de review* |
| — | *Creative Studio run*: solo si la pieza dispara una corrida generativa; en un brief editorial de cliente normalmente no aplica |

**Lo que esta adaptación agrega, y por qué:**

- **Bloque 8, respaldo de producto** — no existe en la plantilla genérica porque ahí el cliente es
  Efeonce. Con un fabricante de por medio, el claim de ficha es bloqueante (modelo operativo §6), y
  cada producto viaja con la URL de su ficha verificada.
- **Bloque 0, bloqueantes de arranque** — la plantilla genérica reparte advertencias por el cuerpo;
  acá son una tabla accionable con dueño, arriba de todo.
- **Techo duro de caracteres** — es regla de forma, no bloque: nace del error que abre este
  documento.
- **Marca de evidencia dato por dato** — MEDIDO / OBSERVADO / ESTIMADO / INFERIDO / REPORTADO
  (modelo operativo §2). La plantilla genérica pide factcheck; acá el marcado viaja visible al brief.
- **Los cuatro titulares como bloque propio** — la plantilla pide un título de trabajo; acá se
  separan las cuatro superficies (`copywriting/03` §6).

**Y `seo-aeo` no compite con esto: llena por dentro.** La plantilla
[`templates/content-brief-aeo.md`](../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) es el
**checklist de oficio de citabilidad** —answer capsule, elementos citables obligatorios, matriz de
Query Fan-Out— y su lugar natural son los bloques **7** y **9**. Este documento gobierna la **forma
del contrato** (qué bloques, en qué orden, con qué techo); esa plantilla gobierna **la calidad de lo
que va adentro**.

## La estructura — bloque 0 + 11 bloques, ninguno de más de ~10 líneas

### 0. Bloqueantes de arranque
Va **antes que todo lo demás**, en tabla, con tres columnas: **qué bloquea**, **quién lo cierra**
(cliente / producción / redactor) y **tipo** (decisión, verificación, investigación, aprobación).

| Qué bloquea | Quién lo cierra | Tipo |
|---|---|---|
| Enunciado accionable, uno por fila | cliente · producción · redactor | decisión · verificación · investigación · aprobación |

**Un bloqueante no es un supuesto.** El supuesto describe un límite del análisis y vive en el anexo;
el bloqueante exige una acción de alguien antes de escribir. Nueve advertencias repartidas entre el
cuerpo y el cierre del brief no son bloqueantes: son ruido que quien redacta tiene que extraer y
ordenar a mano antes de poder empezar. Cada fila nombra a su dueño; sin dueño no es un bloqueante.

### 1. La pieza en una línea
Qué es, para quién, y qué se lleva el lector. Si no cabe en una línea, el tema no está decidido.

### 2. Los cuatro titulares
Un artículo **no repite el mismo titular en las cuatro superficies** (`copywriting/03` §6):
- **H1** — sostiene la tesis y la voz.
- **SEO title** — resuelve intención y entidad. Con su conteo de caracteres.
- **OG/social** — gana la lectura cuando alguien la comparte.
- **Slug** — identifica el tema de forma estable; no intenta ser headline.
Más el **título de trabajo** (el nombre del slot). **Nunca metas taxonomía interna en el título de
trabajo**: "Nodo consolidador —", "Pillar —", "Satélite 3" son etiquetas de arquitectura, no nombres.
La arquitectura va en el bloque 5.

### 3. Objetivo y métrica de éxito
Qué mueve esta pieza y cómo se sabe. Una métrica principal, no seis.

### 4. Lector, JTBD y nivel de consciencia
Una persona concreta con un trabajo concreto. El nivel de consciencia (Schwartz) calibra el ángulo.

### 5. Lugar en la arquitectura
Pillar o satélite, de qué territorio, **qué enlaza a qué en ambas direcciones**. Aquí sí va la
taxonomía. Si la pieza no tiene lugar en un clúster, decláralo — puede ser señal de que no debe
escribirse todavía. Si la pieza pertenece a un ciclo anual de marca, la bidireccionalidad incluye
**la edición del año anterior** (modelo operativo §5.2.1).

### 6. La gran idea y el ángulo propietario
**Una sola.** Qué dice esta pieza que nadie más puede decir, y por qué. Si dice todo, no dice nada.

### 7. Estructura de la pieza
Los H2 como pregunta literal, en orden, y **el objeto citable** (tabla, checklist, matriz) con su
ancla estable. Lista, no prosa.

**Todo elemento que el brief pide y cuyo dato no aporta se marca como investigación asignada al
redactor, con su fuente esperada**, y viaja al bloque 0 con tipo *investigación*. Pedir "tiempos
concretos en horas", "un rango de costo por metro cuadrado" o "tres paletas nombradas" sin aportar
ninguno y sin declararlo deja el hueco para que quien redacta lo descubra a mitad del texto. Un dato
faltante declarado es gestionable; uno implícito termina siendo un número inventado.

**El `unbrand test` puede fallar de forma legítima, y entonces cambia la métrica, no el objeto.** El
método de utilidad citable exige que el objeto siga sirviendo sin logo ni CTA. Cuando el objeto **es
la entidad de marca** —un léxico propietario, una nomenclatura, un índice con nombre—, quitarle la
marca lo vacía: el gate falla **por construcción**. La lectura correcta no es arreglarlo ni marcarlo
verde para que cuadre: es declarar que **la pieza construye entidad, no utilidad neutra**, y por lo
tanto **se mide por menciones y citas del léxico, no por backlinks al objeto**. Se escribe así en el
bloque 3 y en el bloque 11.

### 8. Respaldo de producto
Los datos que hacen falta y de dónde salen. **Si la ficha no lo declara literalmente, el H2 no se
escribe.** Lo que falte va al bloque 0 con dueño.

**Todo producto mencionado llega con la URL de su ficha, verificada.** Nombrar el producto y hasta
proponer el texto del ancla, pero sin la URL, traslada la verificación a quien redacta: una pasada
contra el sitemap por producto y por pieza. Y cuando el brief pide citar un dato de la ficha, **la
URL tiene que ser la de la variante que sostiene ese dato**. Si el claim solo lo declara una variante
concreta y la URL base lo contradice, sin la URL correcta en el brief el error se publica.

**Separa lo que el brief propone de lo que la ficha declara.** En un brief con dato de fabricante
conviven dos cosas que no se pueden confundir: la **propuesta editorial** (qué producto va en qué
uso, qué color en qué muro) y la **especificación declarada**. Cuando ambas viven en la misma tabla,
la columna propuesta se rotula **"propuesto"** de forma explícita. Sin ese rótulo, la pieza publica
como especificación del fabricante algo que decidió quien escribió el brief.

### 9. Descubribilidad
Keyword cabeza con su volumen medido, el clúster, schema, y lo que el SERP exige. Tabla corta.

### 10. Salida
Distribución, mapa de átomos, CTA. Si el canal lo opera un tercero, el entregable es un
**paquete de insumo**, no una parrilla.

### 11. Gate de review
Checklist accionable. Sin esto, la pieza no entra a redacción ni sale a publicación. **Un gate que
falla se declara fallado con su razón** —y si el fallo es legítimo (bloque 7), la consecuencia es la
métrica que lo reemplaza, escrita ahí mismo—. Un gate marcado verde para que cuadre no es un gate.

### Anexo (fuera del brief, enlazado)
Research, SERP, competencia, evidencia, supuestos y límites. **Se enlaza, no se transcribe.** Los
**supuestos** viven acá; lo que exige una acción antes de escribir sube al bloque 0.

## Reglas de forma

1. **Techo duro: 12.000 caracteres.** Si lo pasa, hay research infiltrado; muévelo al anexo. **Se
   mide antes de escribir en el sistema del cliente**, no después (runbook, paso 5).
2. **Cada bloque cabe en pantalla.** Si no, se resume y se enlaza.
3. **Tablas para datos, listas para instrucciones, prosa solo para el ángulo.**
4. **Marca de evidencia** (MEDIDO / OBSERVADO / ESTIMADO / INFERIDO / REPORTADO) en cada dato
   citado. El dato vive en el anexo; el brief cita la conclusión con su marca.
5. **Los bloqueantes van en el bloque 0**, en tabla con dueño y tipo, no repartidos por el cuerpo ni
   enterrados al final. Separados de los supuestos, que son otra cosa y viven en el anexo.
6. **El brief se escribe después del research, nunca antes**, y **nunca sin el chequeo de
   canibalización a nivel de CONTENIDO** — no de slug. Ver el modelo operativo §5.
7. **Ningún producto se nombra sin la URL de su ficha verificada**, y el dato que se cita sale de la
   URL de la variante que lo declara.
8. **Lo que el brief pide y no aporta se declara investigación**, con dueño y fuente esperada. No
   hay elementos pedidos en silencio.

## Antipatrones

- **Transcribir el research al brief.** Es el error que originó este documento.
- **Meter taxonomía interna en el nombre visible** de la pieza.
- **Repetir el mismo titular** en H1, SEO, OG y slug.
- **Poner el concepto en el lugar del título.** Un titular promete; el concepto solo nombra.
- **Un brief sin lugar en un clúster** — es un artículo suelto, y publicar sueltos no construye
  autoridad.
- **Declarar "el tema está libre" sin haber leído el contenido** de las piezas adyacentes.
- **Enterrar los bloqueantes** al final, donde quien redacta los ve cuando ya empezó.
- **Confundir supuestos con bloqueantes.** El supuesto se lee; el bloqueante se cierra, y tiene dueño.
- **Nombrar un producto sin la URL de su ficha.** Quien redacta termina verificando contra el sitemap
  lo que el brief ya sabía.
- **Citar un dato de ficha con la URL base cuando solo lo sostiene una variante.** La URL base lo
  contradice y el error se publica.
- **Pedir un dato que el brief no aporta sin marcarlo como investigación.** El hueco aparece a mitad
  del texto y se rellena inventando.
- **Forzar el verde de un gate que falla por construcción.** Declararlo fallado y explicar por qué es
  más honesto y más útil; lo que cambia es la medición, no el objeto.
- **Publicar como declarado por ficha lo que el brief propuso.** Si la columna no dice "propuesto",
  se lee como especificación del fabricante.
