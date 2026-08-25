# 11 · La ficha de producción de una infografía

> **Fuente de verdad:** **Fichas para Gráficos** (`3c739c2fefe7803d9958cd74648cb036`, base
> `Flujos de Trabajo` de la wiki de Berel). Extraída el **2026-08-25**.

## 🔴 Qué ficha usa cada banner

| Pieza | Ficha que se escribe en el cuerpo de la subtarea |
|---|---|
| **N1 hero · N3 · N4 cierre** | La ficha de **13 campos** de la Spec para imágenes → [`05_BANNERS_IMAGENES.md`](05_BANNERS_IMAGENES.md) |
| **La INFOGRAFÍA (normalmente N2 🔁)** | 🔴 **Esta ficha**: 9 secciones + **tabla de contenido por módulo** |

La infografía necesita más porque **es la única pieza donde el diseñador reconstruye información**:
en un hero interpreta una escena, aquí tiene que colocar textos, datos y productos exactos. Si algo
queda descrito en vez de escrito, lo inventa.

## El principio que gobierna todo

> **Esta ficha es una ORDEN DE PRODUCCIÓN para un diseñador gráfico, no un resumen del artículo.**

Y su prueba de aceptación:

> **Un diseñador que NO haya leído el artículo debe poder producir la pieza correctamente, sin
> reinterpretar el contenido.**

Si para completar un campo hace falta volver al artículo, la ficha está mal escrita.

## Las 14 instrucciones (verbatim)

1. Todo texto destinado a aparecer en el diseño se entrega **literalmente, listo para copiar y
   pegar**.
2. 🔴 **Nunca describas lo que debería decir un texto: escribe el texto final.**
3. Cuando existan cards, pasos, módulos, columnas o categorías, usa **una fila independiente por cada
   módulo** en la tabla de contenido.
4. Cada módulo lleva asignados explícitamente su **texto, producto, acabado/solución, dato, ícono y
   asset** cuando corresponda.
5. 🔴 **Nunca entregues una lista general de productos sin indicar qué producto corresponde a qué
   módulo.**
6. Distingue el **nombre del producto que aparece como texto** del **asset PNG que usa el diseñador**.
7. 🔴 **No deduzcas información técnica.** Si una relación, producto, claim, acabado o dato no puede
   confirmarse con la información proporcionada, escribe exactamente:
   **`PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE`**.
8. **No uses "por ejemplo", "puede llevar", "algo como", "etc."** ni instrucciones abiertas para
   elementos obligatorios.
9. Reúne todos los pendientes nuevamente en la tabla de pendientes.
10. **No mezcles copy con instrucciones visuales.**
11. **No mezcles productos con assets.**
12. La sección de **dirección visual indica CÓMO SE VE**; la **tabla de contenido indica QUÉ
    CONTIENE**.
13. Antes de entregar, comprueba que **cada texto, producto, dato, ícono y asset tenga una ubicación
    específica**.
14. La ficha debe bastar para que un diseñador que no leyó el artículo produzca la pieza sin
    reinterpretar.

## La plantilla — 9 secciones

Encabezado antes de la tabla: **TIPO DE PIEZA SEGÚN WIKI →** (adjuntar link o imagen de referencia).
Ese "tipo según wiki" es el formato del catálogo → [`10_FORMATOS_DE_INFOGRAFIA.md`](10_FORMATOS_DE_INFOGRAFIA.md).

| Sección | Campo | Información para diseño |
|---|---|---|
| **01 · Identificación** | Artículo | `[Número — Nombre exacto del artículo]` |
| | ID de pieza | `[N1 / N2 / N3...]` |
| | Nombre de la pieza | `[Nombre exacto]` |
| | Tipo de gráfico | `[Infografía técnica / comparativa / diagrama / proceso / etc.]` |
| | Sistema / estructura | `[Cards / tabla / diagrama / pasos / mapa / etc.]` |
| | Ubicación en artículo | `[H2/H3 + nombre de sección]` |
| **02 · Objetivo** | Qué debe entender el usuario | Una sola frase concreta |
| | Relación que comunica | `[SUPERFICIE → PRODUCTO → ACABADO → DATO]` |
| | Tiempo de lectura esperado | `[5 segundos]` |
| **03 · Formato** | Master | `[1408 × 768 px]` |
| | Formato final | `[.webp]` |
| | Peso máximo | `[menos de 200 KB]` |
| | Adaptaciones | `[Pinterest / IG 4:5 / Story 9:16 / Reel...]` |
| | Nombre de archivo | `[nombre-del-archivo.webp]` |
| **04 · Arquitectura** | Estructura general | `[1 título + 5 cards + logo]` |
| | Cantidad de módulos | Número exacto |
| | Orden de lectura | `[01 → 02 → 03 → 04...]` |
| | Estructura de cada módulo | `[Header → ícono → producto → acabado → dato → PNG]` |
| | Jerarquía visual | `[Superficie > Producto > Acabado > Dato]` |
| **05 · Copy final** | Título T01 | **TEXTO LITERAL PARA COPIAR Y PEGAR** |
| | Subtítulo ST01 | Texto literal / NO APLICA |
| | Otros textos generales | Texto literal / NO APLICA |
| **06 · Dirección visual** | Fondo · Cards/bloques · Paleta/acentos · Tipografía · Íconos · Fotografía · Productos · Logo · Sensación general | Descripción concreta por campo. **Los colores autorizados van con su regla de uso** |
| **07 · Producto** | Tratamiento obligatorio | `[PNG directo, proporción original, etiqueta intacta]` |
| | Escala | `[misma escala visual entre cards]` |
| | Qué no modificar | `[Etiqueta, color, tipografía, proporción...]` |
| **08 · Restricciones** | NO incluir | Lista concreta de elementos prohibidos |
| | NO inventar | Claims, datos técnicos, productos, compatibilidades... |
| **09 · ALT** | ALT exacto | Texto literal |

## La tabla de contenido por módulo

🔴 **Obligatoria siempre que la pieza tenga cards, categorías, pasos, bloques o columnas.**
Una fila por módulo, con `ID` (`C01`, `C02`…) y `Orden`:

| ID | Orden | Módulo / superficie | Header — COPY LITERAL | Producto — COPY LITERAL | Acabado / solución — COPY LITERAL | Dato — COPY LITERAL | Ícono / gráfico | Asset producto |
|---|---|---|---|---|---|---|---|---|
| C01 | 01 | … | … | … | … | … | … | `P01 / nombre PNG` |

Las columnas **Producto** y **Asset producto** son distintas a propósito (instrucción 6): la primera
es **el texto que se rotula**, la segunda es **el archivo PNG que usa el diseñador**.
Si un módulo no lleva producto, la celda va vacía o con `NO APLICA` — **nunca con un "etc."**.

→ Plantilla copiable: [`../templates/ficha-infografia.md`](../templates/ficha-infografia.md)

## Cómo se conecta con lo demás

- **El "tipo de pieza según wiki"** (encabezado) y los campos `Tipo de gráfico` + `Sistema /
  estructura` se llenan con el formato y la variante del catálogo → módulo `10`.
- **`Paleta / acentos`** lleva los colores autorizados **con su regla de uso**: Rojo Editorial
  `#B3153A` y la paleta complementaria, nunca el rojo corporativo → módulo `10` §6.
- **Master, formato, peso y adaptaciones** salen de la Spec para imágenes → módulo `05`.
- **`ALT exacto`** es el mismo que ya se declaró en la reescritura → módulos `03` y `05`. **No se
  reinventa aquí.**
- **`NO inventar`** se cruza con la regla dura del cliente: ningún claim sin ficha técnica → módulo
  `09`.

## Errores que esta ficha existe para evitar

- Escribir *"un título que hable del rendimiento"* en vez del título final.
- Listar "Berelinte, sellador y Kalos Tone" sin decir en qué card va cada uno.
- Poner el nombre del producto donde iba el nombre del PNG.
- Rellenar un dato técnico que nadie confirmó, en vez de escribir
  `PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE`.
- Mezclar en un mismo campo el copy y la instrucción visual.
