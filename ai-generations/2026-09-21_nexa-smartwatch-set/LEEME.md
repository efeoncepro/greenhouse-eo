# Las 17 del vestuario pasan a smartwatch (2026-09-21)

Las **17 referencias de `4-vestuario/`** que no eran `lifestyle` llevaban **reloj analógico**: se produjeron
por injerto sobre material de la identidad B, mucho antes de que el operador decidiera que *«Nexa es
tecnológica»*. Con la decisión tomada, el 81 % del vestuario del set contradecía al canon.

Editadas las 17 en una pasada. Motor `gpt-image-2.5-sunburst`, `high`, `--input-fidelity high`.
**USD 0,70** la tanda. Los originales quedan en `originales/`.

## Cómo se detectó

Mirando la hoja de contacto del set completo, no revisando archivo por archivo. **Una hoja de contacto de
las 45 referencias mostró en dos segundos lo que un inventario por nombre no dice**: los diales redondos se
distinguen a 300 px de ancho.

## La receta: pad LATERAL, no vertical

🔴 Estas 17 son **1152×2048 = 9:16**, y el modelo sólo entrega 1:1, 2:3 y 3:2. Editarlas directamente cae
en el agujero del reencuadre —el mismo que deformó la cabeza en el ancla— así que hay que padear. Pero
**aquí el pad va a los LADOS**, no arriba y abajo como en el ancla 4:5:

```
1152×2048 (9:16) → pad 107 px por lado espejando los bordes → 1365×2048 (2:3)
                 → editar 1024×1536 → recortar 80 px por lado → 864×1536 (9:16 exacto)
```

**La dirección del pad la decide de qué lado sobra ratio**: 4:5 es más ancho que 2:3, así que se padea
arriba y abajo; 9:16 es más estrecho, así que se padea a los lados. Calcularlo, no recordarlo.

**Costo:** el ancho útil baja de 1152 a **864 px**. La alternativa —recortar alto en vez de padear ancho—
les cortaría los pies o la cabeza, así que no es alternativa en cuerpo entero.

## Verificación **[medido]**

- **Proporción:** sonda sobre `home-2` con grilla de veinteavos. Bun, gafas, hombros, cintura y manos caen
  en las mismas líneas que el original. Sin reencuadre.
- **Accesorios:** tira de las 17 bandas de muñeca ampliadas. Donde había reloj, ahora hay smartwatch —
  `home-1` y `home-3` muestran incluso la pantalla encendida— y los anillos son signets cuadrados plateados.
- **Lo que no cambió:** moño y gafas de luz azul en `home`, acentos naranja y azul eléctrico en `speaker`,
  blazer navy sobre blanco en `prof`, escenarios y luz en las 17.

**El prompt está escrito para no inventar:** si una pieza no tiene reloj visible no añade ninguno, y si no
hay mano clara no pone anillo. Por eso editar las 17 en bloque es seguro aunque sólo unas nueve muestren la
muñeca — y evita que quede una sin revisar.

## Deuda heredada, no introducida

`casual-4` conserva **uñas de dos colores en la misma mano** (navy y fucsia), que viene del material B
original. El prompt declara que las uñas se quedan como están, así que no se empeoró; queda anotado porque
§5.1 pide un solo color y sigue incumplido ahí.

Y el set queda con **dos ratios**: estas 17 a 9:16 (864×1536) y las cuatro `lifestyle` a 2:3 (1024×1536).
No afecta su uso como referencia, pero quien edite cualquiera **debe volver a calcular el pad**.
