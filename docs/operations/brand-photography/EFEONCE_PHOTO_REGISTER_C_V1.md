# Registro C · «la respuesta a la vista» — el lenguaje

> **Tipo:** documento de registro del lenguaje fotográfico · **Versión:** 1.0 · **Creado:** 2026-09-21 por Claude
> **Nace en:** [delta del maestro](EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#delta-2026-09-21-tarde--tercer-registro-c--la-respuesta-a-la-vista)
> **Primer consumer:** ads de SEO/AEO (`ai-generations/2026-09-21_registro-c-respuesta/`)
> **Estado:** **en construcción** — dos piezas producidas, sin prueba de reconocimiento

## 1. Qué es

**El sujeto es la respuesta de la máquina y quién la da cuando tú no estás.** Nadie del equipo Efeonce
protagoniza. Sirve para los servicios donde **la persona no porta el mensaje**: SEO, AEO, visibilidad, datos.

**Qué NO es:** no es el registro B con un juguete encima. La diferencia no es el atrezzo, es **quién
protagoniza**. Si el protagonista es una persona nuestra y la criatura acompaña, eso es B con la palanca
`copiloto`. En C la criatura, Nexa o el objeto **son el sujeto**.

## 2. El elenco

| Quién | Cuándo | Riesgo |
|---|---|---|
| **El objeto del oficio** (el informe, la proyección, la pila) | Siempre disponible. Es el vehículo más seguro | Ninguno |
| **Nexa** | Cuando hace falta una figura que decida, examine o enseñe | Ninguno: es nuestra. Lleva uniforme |
| **Codex** (OpenAI) · **Gigi** (Gemini) | Cuando la pieza es sobre la relación con ESE motor | Partnership con Google y OpenAI lo hace defendible, **pero un partnership no es licencia de mascota**: antes de pauta, rights governance + legal |
| **Clawd** | Orgánico, referencia nominativa | No es mascota oficial de Anthropic y no hay partnership. **No como aval en pauta** |

🔴 **Nunca las tres criaturas juntas como panel de jueces:** es la composición que más se lee como endoso.

## 3. 🔴 El color: cuando el protagonista es de otra marca **[medido 2026-09-21]**

**La criatura de un partner trae su propio color, y puede quedarse con el sistema de color de la pieza.**

Medido sobre las dos primeras piezas:

| Pieza | Azul en el cuadro | De dónde viene |
|---|---|---|
| `d1` (sala vacía) | **1,6%** | 🔴 **Casi todo Codex** — no hay uniforme ni otro portador |
| `d2` (la lupa) | **3,6%** | Codex **+ el uniforme navy de Nexa** ✅ |

En `d1` el único portador de azul es **una criatura de OpenAI**. El canon pide el azul como portador de
**marca**; una pieza cuyo único azul es ajeno no dice Efeonce: dice OpenAI.

> ## Regla: si la criatura del partner porta color, el azul de Efeonce entra por OTRO portador.
> Uniforme navy, un material, una superficie. **Nunca dejar que el único azul del cuadro sea el de otra marca.**

🔴 **Con Gigi esa regla NO alcanza, y la corrección es de la sesión que produjo su kit [2026-09-21].** Gigi no
«tiene un color propio»: **Gigi ES el espectro de Google.** Medido sobre su arte oficial — rojo `#D93B2B`,
**azul `#3B7DF5` dominando dos tercios**, verde-lima `#9ED957`. Con ella en cuadro no es sólo que el azul sea
ajeno: el rojo y el verde también, y entre los tres se llevan la paleta entera.

> ## Con Gigi: ella es el ÚNICO acento de color, y Efeonce vive en el navy y en la estructura.
> Buscarle otro portador de azul es competir contra un degradado de tres colores, y se pierde.

**Y dos cosas de producción con Gigi**, medidas por esa misma sesión:

- 🔴 **Un prop translúcido delante de su cara le DUPLICA el ojo.** Con una lupa encima salió con tres ojos, y lo
  cazó el operador, no el QA: a tamaño de feed un arco duplicado pasa por sombra. Nada translúcido sobre los
  arcos de los ojos ni sobre la boca — tampoco un cursor, un bounding box o un chip compuestos después.
- **En `aeo-03-no-te-conoce` el sujeto es el VACÍO de la tarjeta, no Gigi.** Ella la sostiene en alto y la
  tarjeta es lo más grande y brillante del cuadro. **El titular no puede repetir lo que la tarjeta ya dice**:
  tiene que hablar del paso siguiente.

### El kit de Gigi (Google Gemini) — 24 vistas **[de la sesión que lo produjo, 2026-09-21]**

OneDrive `5. Contenidos/14. Mascotas de partners/Gigi (Google Gemini)/`, en tres familias: `Poses 3D/v01`
(8 ángulos) · `Poses 3D con accesorios/v01` (8 de servicio) · `Poses 3D busqueda y AEO/v01` (8 propias).
Nombre: `efeonce-gigi-3d-<vista>-1x1-1600x1600-v01-{fondo-estudio|transparente}.png`.

**Las ocho de búsqueda y AEO son las del registro C:** `aeo-01-la-pregunta` (un cursor solo en una barra
vacía) · `aeo-02-la-respuesta-con-citas` · **`aeo-03-no-te-conoce`** (tarjeta vacía; **el sujeto es el vacío,
no Gigi**) · `aeo-04-el-podio` (Share of Voice) · `aeo-05-leyendo-tu-sitio` · `aeo-06-datos-estructurados` ·
`aeo-07-la-entidad` · `aeo-08-el-diagnostico` (medidor con aguja, sin un solo número). **Ni una letra ni un
número en ninguna utilería.**

Se piden con `{ objeto: 'gigi-aeo', vista: 'no-te-conoce' }` (ésa es la `vistaDefecto`); las otras 16, con
`{ objeto: 'gigi', vista: … }`.

🔴 **Gobernanza.** Gigi es propiedad de **Google**, como Clawd de Anthropic, Codex de OpenAI y el sprocket de
HubSpot: es una **interpretación 3D** de la mascota de un tercero, de **uso interno y orgánico**. Orgánico
aprobado **no es pauta**: antes de pautar hay que validar contra la guía de marca de Google. Y sigue vigente
**una sola mascota de partner por imagen** salvo pedido explícito del operador, registrado en el LEEME.

✅ **Ese aviso ya no vive sólo en los docs:** hasta el `cb86ccf7e` sólo el sprocket llevaba el campo `aviso` en
el catálogo, así que quien generaba con Clawd, Codex o Gigi **nunca lo veía**. Las cuatro claves avisan ahora,
con un test que lo mantiene cableado.

## 4. La escala es un recurso propio de C

Las criaturas son **figuras físicas de ~25 cm**. Esa desproporción no es un accidente que haya que disimular:
es material narrativo.

- **La máquina cabe en una mano** — y aun así responde por tu marca (`d1`).
- **Una lente la hace enorme** — se ve gigante a través del vidrio y en realidad es un muñeco (`d2`).

🔴 **La figura se copia de su referencia, nunca se redibuja**, y va con escala correcta y **sombras de contacto**:
sin ellas flota y se lee como render pegado.

## 5. El registro de objetos: digital, no analógico **[operador, 2026-09-21]**

El registro habla de motores de respuesta, así que **la mesa es de esta década**: tablet, teclado de perfil bajo,
cable trenzado, disco portátil, lupa de inspección de aluminio mecanizado.

🔴 **Lo que delata y envejece la pieza:** lupa de latón con mango (cliché de detective victoriano), tarro de
lápices, pilas de libros, tazas. *Caso fuente: la primera versión de `d2` fue rechazada por esto.*

⚠️ **Digital tampoco es el cliché de pantallas de fondo** — pero **la pantalla encendida SÍ sirve, y es
lenguaje aprobado.** 🔴 *Corregido 2026-09-21: este bloque decía «los aparatos van apagados o en reposo», y era
falso.* Salía de un salto inválido: la colorimetría prohíbe **paneles azules grandes DE FONDO** (campo de color
añadido, repetido entre piezas — caso `rondas/personas/JN2-podcast`) y **lámparas prácticas encendidas**
(b\* de altas luces **+20,1**, look de podcast de stock — caso `rondas/paleta/P2-podcast`). De ahí **no** se
sigue apagar los aparatos.

**Lo que el canon tiene, y es lo contrario:** la palanca **`luz-motivada`** pide explícitamente una fuente
visible en cuadro — *«monitor, pantalla, práctica o ventana en el encuadre»*— con caída visible y **el color de
la fuente, nunca un filtro**. Dos piezas aprobadas del lenguaje la usan con pantalla encendida:

| Pieza | Qué está encendido | Qué NO |
|---|---|---|
| `E-estudio-v2.png` | el **monitor con la toma tirada**, más los dos softbox | ningún panel azul añadido: el fondo es el ciclorama real del estudio |
| `F-podcast-v1.png` | el **laptop con la forma de onda** + los LEDs de nivel de la interfaz | prácticas apagadas; llave = panel LED neutro fuera de cuadro → **b\* −0,3** |

🎯 **La distinción que sí manda:** la luz digital entra **por el objeto** —un monitor, un visor, una forma de
onda, un standby, una proyección— **nunca por un campo de color de fondo**. Un aparato apagado es una opción
narrativa (`d1` usa el standby), no una obligación.

🔴 **Regla medida que viene con la palanca:** con fuente visible en cuadro, **la lámpara se riggea BAJA**, entre
rodilla y pecho —que además es como se ilumina de verdad un objeto pequeño—, porque `luz-motivada` pide la
fuente como lo más brillante mientras la reserva pide el tercio superior limpio. Con el softbox a la altura del
pecho **la banda de texto midió 0,00** (inservible); riggeado bajo sube a **0,28**. **Lámpara baja, o no hay
banda de texto.**

## 5b. 🎯 La metáfora entra POR el objeto del oficio **[medido 2026-09-22]**

> **El objeto que identifica el servicio no puede ser decoración ni fondo: tiene que ser el que SOSTIENE
> la acción de la escena.**

Una rueda de prensa con una criatura capta atención — pero **no dice de qué categoría hablamos**, y sólo el
**19%** de los avisos B2B se recuerda *y* se atribuye a la marca correcta (LinkedIn B2B Institute ×
MediaScience, 109 avisos, biometría). **Atención sin atribución es gasto.**

Por eso, en la pieza del atril, el atril **no está junto a** una pantalla: **el atril ES la barra de
búsqueda**, vacía y con un solo cursor. Un objeto carga la autoridad usurpada *y* la categoría.

✅ **Prueba para saberlo antes de generar:** quítale el objeto del oficio a la escena. **Si sigue funcionando
igual, el objeto estaba al lado y no adentro** — hay que rehacerla.

Es gemela de la regla de luz de §5: *la luz digital entra por el objeto, nunca por el fondo*.

⚠️ **Y lo que envejece una escena de oficina:** el bloque de realismo pide materia impresa, así que **si la
escena calla, el default es una oficina de 2010** — libros encuadernados, plantas, tazas, monitores con marco
grueso. Declarar **hardware de generación actual, superficie desnuda y pantallas sin marco**, prohibiendo lo
analógico incluso fuera de foco. Caso medido: dos plates de la corrida de ads salieron viejos **con el gate
en verde**.

## 6. Palancas

| | |
|---|---|
| **Sirven** | `ausencia` (nadie en cuadro, el rastro de lo que pasó) · `variantes` · `descarte` · `proyeccion` · `instrumento` · `marcado` · **`luz-motivada`** (la pantalla encendida COMO fuente; ver §5 y su regla de lámpara baja) |
| 🔴 **No es de C** | **`copiloto`** — exige que la criatura se pose sobre una persona, y eso la vuelve acompañante: es B |

## 7. El lecho, con la cámara baja **[medido 2026-09-21]**

A la altura de la mesa **el canto de la mesa NO sirve de lecho**: recibe la luz rasante y queda gris (medido
2,98 y 1,75). Hace falta **un objeto del oficio cruzando el borde inferior, fuera de toda luz** — un road case,
el respaldo de un monitor, una caja de equipo.

✅ **Y la banda no decide sola:** la reserva se mide como banda, la firma bajo **su caja**. La misma pieza dio
banda 1,75 ✗ y **logo 9,82 ✓**. Si la banda falla, mide el logo antes de descartar la pieza.

## 8. La capa gráfica en C

Las tres voces de siempre (entrada · dominante · cierre), todas en blanco, con la regla de las tres veces.

**Cursores:** en C va **sólo el cursor local**. El «colaborador» que en B aporta una etiqueta de rol aquí ya
está **dentro de la escena**: es la criatura. Sumar una etiqueta de rol duplica el actor y satura.

## 9. El emblema: la criatura lo contamina **[medido, 4 pasadas]**

Con una criatura de partner grande en cuadro, el emblema del uniforme **se contamina**: la primera pasada bordó
la nube de OpenAI en el pecho de Nexa. Y **describir nuestro emblema para desambiguar lo inventa** (salió un
cohete genérico, luego unas alas).

✅ **Lo que funciona:** prohibir el símbolo de la criatura en la ropa **sin describir el nuestro**, dejando mandar
a la referencia del kit. Verificar siempre con `pnpm foto:emblema`.

## 10. La barra de juicio

1. **Significa sin titular** — el actor del problema está en cuadro.
2. **La respuesta se lee como respuesta** — impresa, proyectada, en pantalla.
3. **El azul de la pieza es nuestro**, no el de la criatura (§3).
4. Identidad y colorimetría intactas · las seis reservas · el bloque de impacto.

## 11. Evidencia y estado

| Pieza | Palanca | Reservas |
|---|---|---|
| `d1-la-respuesta` | `ausencia` | **5/5** |
| `d2-la-revisa` | `instrumento` | 3/5 · lecho declarado como excepción medida |

**Pendiente:** el registro no tiene prueba de reconocimiento. Con dos piezas es un sistema coherente,
**no un activo distintivo medido** — la misma condición que el maestro fija para A y B.

## Paid media: primera aplicación y validación pendiente

Para hipótesis visuales de estático, video e híbrido, usar el
[playbook de atención visual](../../../.codex/skills/efeonce-advertising-creative/references/paid-visual-attention-playbook.md).
El brief separa palanca publicitaria de `palanca` fotográfica: usar las admitidas por el compilador sin
redefinir el registro. Ausencia, demostración y revelado son candidatos para C; no implican aprobación
visual ni rendimiento medido. El estado «en construcción» y la prueba de reconocimiento pendiente se conservan.
