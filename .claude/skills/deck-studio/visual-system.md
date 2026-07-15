# El sistema visual — el molde, y qué está quemado en 2026

> **⚠️ Regla que gobierna este documento: esta skill enseña INTENCIÓN, no VALORES.**
>
> Los HEX, los px y los pesos **viven en el catálogo compilado** (el brand pack + el molde). Si esta
> skill los re-declara, **acabo de crear la segunda fuente de drift** — justo lo que el ADR del
> Artifact Composer salió a matar (las 25 plantillas re-declaraban la paleta: **262 HEX literales**).
>
> **Aquí se dice QUÉ decisión tomar y POR QUÉ. El valor concreto sale del catálogo.**
> Es la misma disciplina que el contrato de Figma: **intención, no valores.**

---

## Lo primero: la marca es un INPUT

**AXIS es *el* brand pack de Efeonce, no *el* brand pack.** El molde se parametriza por el pack; el
día que compongamos el deck de un cliente, **lo único que cambia es su pack**.

**NUNCA** hornees "AXIS"/"Efeonce" como constante en una plantilla. **NUNCA** hardcodees un HEX de
marca. Contrato completo: `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.

---

## Las reglas del molde (intención)

Los valores exactos están en el catálogo. Aquí está **por qué** son así, que es lo que la skill debe
saber para no romperlas por accidente.

### 1. Fondo — rico, no plano

**Decisión dura del operador (2026-07-11): NO navy plano.** Se probó bajar el degradado a navy
sólido y **se rechazó** — se veía apagado. **Nunca revertir.**

Las láminas full-bleed con texto blanco a todo el ancho usan un navy más parejo **solo por
legibilidad**, no por estética.

### 2. Tipografía — pocos pesos, semánticos

Jerarquía por **peso y tamaño**, no por color. **NUNCA Black/900** (se ve gritón y barato).
**Cursivas reales, nunca faux-italic.** Numerales tabulares.

> **La tipografía es tu única ventaja no imitable por IA barata.** Un deck con jerarquía tipográfica
> real y una fuente con personalidad **deja de verse como Gamma**. Es donde vale la pena invertir.

**La jerarquía es la obsesión.** En cada lámina debe estar clarísimo qué se lee primero, qué segundo
y qué es soporte. **Si todo pesa lo mismo, la lámina no comunica** — y además es **la firma delatora
del deck IA** (uniformidad).

### 3. Safe-area — el contenido nunca toca el borde

**Tarjetas cohesivas con gap fijo. NUNCA `space-between`**, que deja huecos disparejos.

### 4. Íconos — un solo lenguaje

Set único, inlineado, acento sobre oscuro. Los **3D clay** son otra capa (abajo), **no reemplazan** a
los íconos de sistema.

### 5. ⚠️ Glass — **DECISIÓN ABIERTA, ver abajo**

---

## ⚠️ La regla del glass, en revisión (hallazgo 2026-07-12)

El molde vigente **exige** glassmorphism *milky*. **La evidencia de 2026 va en contra para material
client-facing**, y esto merece decisión explícita del operador.

**Lo que pasó:** Apple presentó **Liquid Glass** (WWDC 2025), comió críticas de legibilidad y
contraste, respondió con *Reduce Transparency*, y en **WWDC 2026 terminó agregando un slider de
opacidad** para que el usuario pueda **apagar su propio efecto**. En la encuesta a creativos de
Creative Boom (2026-04), *glassmorphism / liquid glass* aparece explícitamente entre lo que el gremio
ya no soporta.

> **El argumento que importa:** Apple, con el mejor equipo de diseño del mundo y **control total del
> hardware**, tuvo que darle al usuario **una perilla para apagarlo**.
> **En un deck no tienes esa perilla.** Se ve en el proyector ajeno, en el visor de PDF ajeno, en el
> móvil ajeno, con la luz ambiente ajena.

**Posición recomendada** (no aplicada — requiere decisión):

- **Texto sobre blur: NO.** Nunca. Es donde el efecto se come la legibilidad, y la legibilidad en un
  documento contractual **no es negociable**.
- **Panel translúcido sobre un fondo que TÚ controlas** (el degradado del molde): aceptable, con
  contraste verificado.
- **Cuando dudes, usa una superficie sólida.** El glass **nunca** es lo que gana la licitación.

---

## Color y contraste — el piso no es negociable

**WCAG 2.2, SC 1.4.3 (AA):** **4,5:1** texto normal · **3:1** texto grande (≥18pt regular o ≥14pt
bold).

> 🚫 **Mito: "WCAG exige 24pt en las láminas".** **WCAG NO fija tamaño mínimo de fuente.** Fija
> **contraste** y *resize*. Lo de 24pt es **buena práctica de proyección**, no norma. No lo cites.

**Color como herramienta escasa** (Knaflic): **gris para el contexto, un solo acento para el dato que
importa.** Los atributos preatentivos (color, tamaño, posición, negrita) se procesan en **<250 ms** —
antes de la atención consciente. **Si todo está acentuado, nada lo está.**

### La trampa del deck oscuro

**Un proyector NO puede proyectar negro.** La pantalla es tela; el "negro" es el gris de la sala.
Blanco sobre negro que en tu monitor mide 21:1, **en proyección puede caer a apenas legible**.

Tufte no prescribe fondo claro ni oscuro. Su regla es mejor: **mira la solución en condiciones
reales, no decidas por discusión verbal.**

| | |
|---|---|
| **Deck que se LEE en pantalla** (enviado, PDF, link) | **oscuro OK** — es nuestro caso dominante |
| **Deck que se PROYECTA en sala ajena** | fondo claro, **o fondo oscuro verificado en ESA sala** |
| Siempre | **nunca #000 puro, nunca blanco puro.** Charcoal/navy profundo + off-white |

---

## Densidad — el presupuesto de atención

**Un deck enviado se lee en 2-4 minutos** (DocSend, orden de magnitud). Con 15 láminas → **10-15
segundos por lámina.**

> **Si una lámina necesita más de 30 segundos de parseo, está rota.**

Pero **densidad no es lo mismo que carga**. La distinción de Sweller:

- **Carga intrínseca** — la complejidad real del contenido. **No se baja, se SEGMENTA.**
- **Carga extraneous** — **la que impone tu diseño. Ésta es tuya y hay que matarla.**
- **Carga germane** — la que construye comprensión. **Ésta la quieres.**

> **La carga extraneous es presupuesto robado a la comprensión.** Cada adorno, cada bullet
> redundante, **cada leyenda lejos de su dato**, es memoria de trabajo que el evaluador **ya no
> tiene** para entender tu propuesta.

**Split-attention (Sweller):** si el lector tiene que integrar mentalmente dos fuentes separadas
—leyenda al costado, nota al pie, el número en otra lámina— **la carga sube y la comprensión cae**.
→ **Etiquetas SOBRE el dato, no leyenda aparte. La conclusión EN el título, no debajo del gráfico.**

⚠️ **Y densidad alta está BIEN en un deck que se lee sin orador.** La regla "poco texto" es del
escenario. Ver [`deck-archetypes.md`](deck-archetypes.md).

---

## Imagen — el guardrail de honestidad

### ⚠️ Las caras del equipo: FOTOS REALES. NUNCA IA.

**El evaluador cruza el CV contra la persona.** Presentar una cara fabricada como parte del squad es
**tergiversación** — en un proceso de licitación **no es un problema estético, es de integridad**.

Una persona **decorativa/ilustrativa** puede ser IA. **Jamás presentada como "su equipo".**
**Si falta la foto de alguien, se pide la foto. No se fabrica.**

Retratos corporativos reales: `public/images/greenhouse/team/`. Set recortado (alpha) en
`tender-deck-composer-prototypes/assets/squad/`.
⚠️ **No confundir** con las piezas de redes sociales del equipo en OneDrive (texto quemado sobre
selfies) — **inservibles para un comité, y no se arreglan recortando**.

### Ilustración 3D clay — **CURAR antes que GENERAR**

Estilo: arcilla mate, formas gruesas redondeadas, luz suave, sombra de contacto, perspectiva 3/4,
color plano, sin textura.

**El equipo YA tiene librerías** (OneDrive: `4. Comercial/01. Propuestas Plantillas/01. Libreria
Assets/Iconos 3D` — 108 curados; y `7. Branding & Diseño/…/04. Iconos 3D Claystyle` — 283 crudos).
**Ésa es siempre la primera parada.**

**Pero la librería es heterogénea. Un asset entra sólo si pasa los 3 filtros:**

1. **Es un OBJETO, no un personaje cartoon.** Los monitos contradicen el guardrail de honestidad (si
   el equipo va con fotos reales, meter cartoons como "equipo" es incoherente) **y leen a stock**.
2. **Paleta que armoniza** con el fondo del molde. Fuera lo que pelea.
3. **Mismo lenguaje de render** y **cero texto quemado** en la imagen.

> **El veredicto se emite mirando el SET COMPUESTO sobre el fondo real, nunca los thumbnails
> sueltos.** *(Aprendizaje 2026-07-11: la primera curaduría no aguantó su propio criterio — al
> montar el set sobre el navy, la mitad se cayó.)*

**Generar solo el gap**, con el generador canónico (`pnpm ai:image`), anclado al subset: misma
paleta, objeto único, **cero texto/letras/números/logos**. Recorte con `pnpm ai:image:rmbg` (matting)
— **nunca** color-key ni `trim` (dejan halo). Ojo: **el matting devora los objetos blancos** sobre
fondo claro.

### El muro de logos de clientes — la confianza, y los gotchas de SVG

Un muro de *"quiénes confían en nosotros"* es prueba social ante el comité. Mismo guardrail que las
fotos: **el logo es de un cliente REAL** (allowlist cerrada). Un cliente que no lo es es tergiversación.

**El craft para un set HETEROGÉNEO** (logos de colores, tamaños y construcciones distintas — el caso
real). Se probaron tres tratamientos; **sólo uno aguanta "premium"** (aprendizaje en vivo 2026-07-15,
el muro tomó 3 iteraciones con el operador diciendo "HORRIBLE" hasta acertar):

| Tratamiento | Veredicto |
|---|---|
| **Cajas blancas** por logo | ❌ genérico — el *"trusted-by"* de plantilla 2015 |
| **Monocromo** (todos a un tinte) | ❌ para un set con logos de **ícono sólido** (un cuadrado, un sello, una hoja): el filtro los vuelve **manchas/bloques**. Sólo sirve si TODOS son wordmarks limpios |
| **Color en UN solo panel claro cohesivo** | ✅ un estante claro, logos a color **alineados por ALTURA**, grilla de hairlines. El color da reconocimiento; el panel único da cohesión |

> **Alinea por ALTURA, no por ancho.** Un muro parejo se lee cuando todos los logos comparten la misma
> altura óptica — no el mismo ancho (un wordmark ancho y un ícono cuadrado al mismo ancho se ven
> disparejos).

**Destacar UN logo** (el prospecto que ya es cliente): su celda va **oscura con la versión dark del
logo** — resalta como la única celda oscura entre las claras, más limpio que un anillo sobre claro. Y
el destaque es **DATO del plan, nunca un literal en el CSS** (es el acoplamiento al primer cliente que
mata el test del segundo consumidor de `arch-architect`).

**⚠️ Los 3 gotchas de SVG de logos** — queman horas si no los conocés, los tres vistos en vivo:

1. **Máscara de luminancia vacía = logo invisible.** Un export con `<mask style="mask-type:luminance">`
   SIN contenido enmascara **todo** el grupo a negro → el logo entero desaparece. Fix: quitar la
   referencia de máscara. *(Un tile "vacío" misterioso casi siempre es esto.)*
2. **viewBox con espacio en blanco = logo chico.** Si el `viewBox` es más grande que la marca (mucho
   padding), con `object-fit:contain` la marca sale **diminuta** rodeada de aire. Fix: recortar el
   viewBox al bounding-box real del trazo.
3. **Logo diseñado en blanco = se desvanece en claro.** Muchos logos oficiales vienen en su versión
   *para fondo oscuro* (trazos blancos). Sobre un panel claro **no se ven**. Fix: usar su lockup para
   fondo claro (recolorear a su color de marca en claro) **o** darle una celda oscura. Ojo con la guía
   de marca: p. ej. SKY en claro va **morado**, no navy.

> **La regla que los une:** un logo **se mira renderizado sobre el fondo real**, nunca se asume por el
> archivo. Es el mismo *"míralo en el SET, sobre el fondo real"* de los assets clay — un SVG puede
> compilar, pasar el build y aun así salir invisible, diminuto o roto.

### Lo que se lee a stock (y a IA)

Gente-que-no-existe sonriendo · manos estrechándose · gráficos genéricos flotando · el mismo
degradado violeta de todo 2023.

> **La tendencia real de 2026 es "imperfect by design".** Canva —el vendor más grande de
> plantillas— publicó que tras años de *"algorithmic sameness"*, **el 80% de los creadores dice que
> 2026 es el año de recuperar el control creativo.** **Que el rey de las plantillas confiese que las
> plantillas mataron la diferenciación es la señal más útil del año.**
>
> **Traducción operativa:** foto real de tu equipo y tu trabajo, captura real de producto, gráfico
> con datos reales aunque sea feo — **le ganan a la ilustración perfecta.** La imperfección honesta
> es la nueva señal de autoría.

---

## Lo que ya se lee viejo en 2026

De la encuesta a creativos en activo (Creative Boom, 2026-04) y del gremio:

**Quemado:** AI slop · retratos/caricaturas IA · **glassmorphism / liquid glass** · el gradiente-logo
de startup IA (y la estrella de 4 puntas) · minimalismo perezoso · cultura de plantilla · nostalgia
Y2K · **bento grids** ("no podemos parar de usarlos", dicho con culpa) · **motion por el motion**.

> ⚠️ **Léelo con cuidado: "estamos hartos" ≠ "ya no funciona".** Es saturación de gremio, no
> obsolescencia funcional. **Un bento grid sigue siendo el layout correcto para un dashboard.** Lo
> que cansó es el bento **sin razón**.

**Vigente:** **tipografía editorial/expresiva** (el movimiento más real — el péndulo volvió tras una
década de sans neutro) · modularidad **como sistema, no como decoración** · gradientes ricos como
**superficie** (no como identidad) · **motion sutil, y solo donde vive** — *en un PDF el motion
MUERE; nunca diseñes dependiendo de él*.

---

## Anti-patrones (la taxonomía)

| # | Falla | Por qué |
|---|---|---|
| 1 | **Uniformidad** — todo pesa lo mismo | **firma del deck IA.** Un deck humano es irregular: **una lámina grita, cinco susurran** |
| 2 | **Texto sobre blur** | Apple tuvo que dar una perilla para apagarlo. Tú no la tienes |
| 3 | **Leyenda lejos del dato** | split-attention: la carga sube, la comprensión cae |
| 4 | **Todo acentuado** | si todo grita, nada grita |
| 5 | **Cara IA presentada como el equipo** | **tergiversación**, no estética |
| 6 | **Cartoon en un deck con fotos reales** | incoherencia que lee a stock |
| 7 | **HEX hardcodeado en una plantilla** | fuente de brand drift. Sale del **brand pack** |
| 8 | **Deck oscuro que se va a proyectar** sin verificar en sala | el proyector no proyecta negro |
| 9 | **Motion como parte del argumento** | en el PDF muere |
| 10 | **Densidad de escenario en un deck que se lee** | lámina muda |
| 11 | **Muro de logos monocromo con íconos sólidos** | los vuelve manchas/bloques; color en panel claro |
| 12 | **Logo asumido por el archivo, no mirado renderizado** | máscara vacía / viewBox con aire / trazo blanco en claro = invisible o diminuto |

---

## Hard rules

- **NUNCA** re-declares valores (HEX/px/pesos) en esta skill ni en una plantilla. **Salen del brand
  pack.** La marca es un **input**.
- **NUNCA** navy plano en el fondo. Decisión del operador, no revertir.
- **NUNCA** Black/900. **NUNCA** faux-italic. **NUNCA** `space-between`.
- **NUNCA** texto sobre blur en material client-facing. **Cuando dudes, superficie sólida.**
- **NUNCA** una cara generada por IA presentada como una persona real del equipo. **Si falta la foto,
  se pide.**
- **NUNCA** un asset clay sin pasar los 3 filtros, y **NUNCA** lo juzgues suelto: **míralo en el SET,
  sobre el fondo real**.
- **NUNCA** un logo de cliente que no sea un cliente real (allowlist), ni un logo **asumido por el
  archivo**: míralo renderizado sobre el fondo real (máscara vacía, viewBox con aire o trazo blanco en
  claro lo dejan invisible/diminuto aunque el SVG "compile"). Muro de logos heterogéneo → **color en
  panel claro**, alineados por altura; monocromo sólo si TODOS son wordmarks limpios.
- **NUNCA** contraste bajo 4,5:1 en texto normal. Es piso, no aspiración.
- **SIEMPRE** curar antes que generar. La librería del equipo es la primera parada.
- **SIEMPRE** que dudes si algo aporta: **la carga extraneous es presupuesto robado a la
  comprensión.** Bórralo.
