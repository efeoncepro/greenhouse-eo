# Datos en un deck — un gráfico en una lámina NO es un gráfico en un dashboard

> **La diferencia que lo explica todo:** un dashboard es para **explorar** (el usuario busca lo que no
> sabe). Un gráfico en un deck es para **afirmar** (tú ya sabes qué encontraste y necesitas que él lo
> vea).
>
> **Encoding, paletas y elección de librería → `dataviz-design`.** Acá vive lo que es propio del deck.

---

## La regla #1: el takeaway ES el título

**Knaflic**, y respaldado por el *signaling principle* de **Mayer** y por **Assertion-Evidence**
(Garner & Alley, p < .01 — la única evidencia experimental que existe sobre láminas).

```
❌  "Ventas por trimestre"                      ← etiqueta el eje. No dice nada.
✅  "Las ventas cayeron 12% en Q3 por churn en enterprise"
```

**Si el lector tiene que MIRAR el gráfico para saber qué le estás diciendo, el gráfico falló.** El
gráfico **prueba** el titular; no lo reemplaza.

---

## La regla #2: un mensaje por gráfico

Si tu gráfico soporta dos conclusiones, **son dos gráficos** — o es uno con la segunda conclusión
sacada.

**Un gráfico que "muestra varias cosas interesantes" no muestra ninguna.** *(Y es carga extraneous:
presupuesto robado a la comprensión.)*

---

## La regla #3: sin orador, cada gráfico lleva su ANOTACIÓN

En un deck que se lee solo **no hay quién señale qué mirar**. La flecha, el círculo, el texto que
dice *"aquí está el punto"* **no son decoración: son el narrador ausente**.

**Split-attention (Sweller):** etiqueta **SOBRE** el dato. **Leyenda separada = carga que se paga en
comprensión.** Si el lector tiene que ir y volver entre la leyenda y la barra, ya perdiste.

---

## Elegir el gráfico: por el MENSAJE, no por el dato (Zelazny)

**El aporte real de Zelazny** (Director of Visual Communications de McKinsey): la secuencia es
**mensaje → tipo de comparación → forma**. No "tengo estos datos, ¿qué gráfico hago?".

| Tu mensaje es sobre… | Comparación | Forma |
|---|---|---|
| qué parte del total | **componente** | ⚠️ pie — **ver abajo** |
| cuál es mayor / menor | **ranking** | **barras horizontales** |
| cómo cambia en el tiempo | **serie temporal** | columnas (pocos puntos) · línea (muchos) |
| cuántos caen en cada rango | **distribución** | columnas / línea |
| si dos variables se mueven juntas | **correlación** | scatter |

> ⚠️ **La fricción honesta:** Zelazny es **pro-pie chart** para composición. **La ortodoxia moderna
> demuestra que el ojo compara LONGITUD mucho mejor que ÁNGULO o ÁREA** → una barra (simple o
> apilada) casi siempre le gana al pie.
>
> **Usa su árbol de decisión. No uses su pie.**

**Knaflic — el repertorio corto que sirve:** texto simple · tabla · heatmap · scatter · línea ·
slopegraph · barra (vertical/horizontal/apilada) · waterfall · área.
**Anti-pie · anti-donut · anti-3D · anti-eje secundario.**

**Y a veces el mejor gráfico es un NÚMERO GRANDE.** Si tu mensaje es *"cero"*, no hagas un gráfico de
cero: **escribe el cero, enorme, y deja que duela.** *(El diagnóstico de SKY: **0 citas del blog en 35
respuestas**. Eso no es un gráfico. Es un número que cambia una conversación.)*

---

## Color: escaso y estratégico

**Atributos preatentivos** (color, tamaño, posición, negrita) se procesan en **<250 ms**, antes de la
atención consciente. Son tu palanca más fuerte — **y se gastan**.

> **Gris para el contexto. UN solo acento para el dato que importa.**
> **Si todo está acentuado, nada lo está.**

---

## El eje: cuándo empieza en cero

- **Barras: SIEMPRE en cero.** La longitud de la barra **ES** el valor. Truncarla **miente sobre la
  magnitud** — y es exactamente la fabricación gráfica que el composer aborta.
- **Líneas: no necesariamente.** La línea codifica **cambio**, no magnitud absoluta. Forzar el cero
  puede aplanar una tendencia real hasta hacerla invisible.

**El test:** *¿estoy exagerando la diferencia con la elección del eje?* Si la respuesta honesta es sí
**y te conviene**, estás mintiendo con el eje.

---

## ⚠️ Anti-fabricación: la geometría sale del DATO

**El bug más peligroso del composer.** Los prototipos tienen barras con **anchos hardcodeados**. Si
solo se reemplazan los NÚMEROS, **la barra sigue midiendo lo del ejemplo** — exagerando o escondiendo
la magnitud real.

> **Una barra sin dato es una barra que miente.**
> **En una oferta no es un bug de layout: es FABRICACIÓN GRÁFICA.**

Por eso los resolvers de geometría **derivan** el ancho del valor, la posición del hito de su fecha,
la brecha de la diferencia real. **Si el resolver no corre, el composer ABORTA la lámina.** Es la
conducta correcta.

**Y el corolario de Columbia:** un gráfico puede ser **técnicamente cierto** y aun así **esconder lo
que importa** — si el dato crítico está en el nivel 6 de la jerarquía en vez de en el titular.

---

## Anti-patrones

| # | Falla |
|---|---|
| 1 | **Título que etiqueta el eje** en vez de afirmar el hallazgo |
| 2 | **Un gráfico con dos mensajes** → no comunica ninguno |
| 3 | **Sin anotación en un deck que se lee solo** → no hay quién señale |
| 4 | **Leyenda separada del dato** → split-attention |
| 5 | **Pie chart** para comparar magnitudes |
| 6 | **Barra truncada** → miente sobre la magnitud |
| 7 | **Todo acentuado** → nada resalta |
| 8 | **Eje secundario** → dos escalas, cero comprensión |
| 9 | **Gráfico donde bastaba un número** |
| 10 | **Geometría hardcodeada del prototipo** → **fabricación** |

---

## Hard rules

- **NUNCA** un título que etiqueta. **El takeaway ES el título.**
- **NUNCA** dos mensajes en un gráfico.
- **NUNCA** geometría que no salga del dato. **Una barra sin dato es una barra que miente.**
- **NUNCA** barras truncadas. **NUNCA** eje secundario. **NUNCA** pie para comparar magnitudes.
- **NUNCA** leyenda separada cuando puedes etiquetar sobre el dato.
- **SIEMPRE** anotación en un deck que se lee sin orador. **La flecha es el narrador ausente.**
- **SIEMPRE** considera si un **número grande** dice más que el gráfico. Muchas veces sí.
