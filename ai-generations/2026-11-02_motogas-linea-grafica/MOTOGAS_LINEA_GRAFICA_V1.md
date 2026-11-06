# Motogas — Línea gráfica de las cuentas de gas (análisis consolidado V1)

> **Estado:** análisis candidato, 2026-11-02. Nada de esto está aprobado por el cliente ni por el squad.
> **Fuente:** OneDrive Efeonce, en solo lectura. Lo revisaron 6 subagentes, unas 400 piezas de 2019 a agosto de 2026.
> **Anexos:** los 6 informes completos, con rutas absolutas y la marca VERIFICADO/INFERIDO, están en `anexos/`.
> **Láminas del manual del cliente:** `referencias/manual-motogas-lamina-1..4.png`.
> **Destino:** base para la skill de cliente, los contratos del Workbench y el canvas en /design (igual que Berel).

## 0. Lo esencial en 10 líneas

1. **Motogas SpA** (RUT 77.130.996-8) es la razón social, no una marca. No tiene logo paraguas; «MG_» es solo el prefijo de los archivos.
2. **Opera 5 marcas y 8 locales**, todos de **recarga con retiro en bodega y sin despacho**: Rey del Gas (2), Gas Don Julio (2), Lipigas Recoleta (1), Lipiestación (2) y Gas Noviciado (1, sin sistema gráfico). Lipivecino está inactivo desde abril de 2024.
3. **Ya existe un mini manual del cliente:** `Produccion Grafica/1. Recursos Graficos/MotoGas-LineaGrafica.ai` (25-11-2025, 4 láminas). Trae una ficha por marca (logo, personaje, píldora, dirección, tipografía, paleta y marcas que vende). Es el punto de partida de los tokens.
4. **Hay dos personajes, y ninguno es un señor:** el **Rey del Gas** es un cilindro rojo con corona, y **Gasfield** (Gas Don Julio) es un cilindro rojo con extremidades de palito. Las cuentas Lipi no tienen mascota.
5. **La temporada se suma; nunca se rediseña.** Se agregan 3 a 6 objetos 3D tipo plastilina en las esquinas y bordes. Logo, paleta, tarjeta de datos, precios, teléfonos y legal no se tocan.
6. **La lista de precios es un set fijo de 10 piezas 4:5 cada jueves**, con un número por local. Se mueven la fecha, los precios y la decoración de temporada.
7. **El «legal» es el pie de condiciones más la vigencia**, con 3 perfiles: multimarca, Rey del Gas y Lipi. No hay bases ni «hasta agotar stock».
8. **Horario, ubicación y contacto** son piezas fijas recurrentes (evergreen) que se re-visten por temporada.
9. **Lo vigente está en** `Produccion Grafica/2. Grilla Diseño/<mes>/`, `3. Evergreen/` y `00. Lista de precios/`. `Workspace/` y `Archivo/` son históricos.
10. **El mayor riesgo es el dato cruzado entre locales** (teléfono, sello o fecha equivocados). Se resuelve con un registro único de locales.

---

## 1. Registro de locales (fuente única propuesta)

| Id | Marca | Local | Dirección | WhatsApp | Vende | N.º en la lista |
|---|---|---|---|---|---|---|
| `rdg-lo-prado` | El Rey del Gas | Lo Prado | Neptuno 934, Lo Prado | +56 9 5460 6758 | Gasco · Abastible · Lipigas — 5/11/15 kg | 9 (fondo rojo) |
| `rdg-cerro-navia` | El Rey del Gas | Cerro Navia (desde abr-2026) | El Pastizal 1518 con Mapocho Sur, Cerro Navia | +56 9 6642 6189 | ídem | 10 (fondo naranjo) |
| `dj-pudahuel` | Gas Don Julio | Pudahuel Sur (abr-2023) | Los Mares 7503, Pudahuel Sur | +56 9 7255 5023 | 3 marcas — 5/11/15 kg | 1 |
| `dj2-quinta-normal` | Gas Don Julio 2 | Quinta Normal (sep-2024) | Av. María Rozas Velásquez 475, Quinta Normal | +56 9 3104 6901 | 3 marcas — 5/11/15/45 kg + Yale Al (+ Yale Fierro en Abastible) | 2 (portada) + 3 Lipigas · 4 Gasco · 5 Abastible |
| `lipi-recoleta` | Lipigas Recoleta | Recoleta | Av. Perú 1337, Recoleta, Santiago | +56 9 8247 7870 (no va en la lista) | Solo Lipigas — 5/11/15/45 kg + Yale Al | 6 |
| `lipiest-vecinal` | Lipiestación Central | Vecinal | Vecinal 4494, Estación Central, Santiago | +56 9 8640 9812 (no va en la lista) | Solo Lipigas — 5/11/15 kg | 7 |
| `lipiest-velasquez` | Lipiestación Central | Velásquez | 5 de Abril 4021, esq. General Velásquez, Estación Central, Santiago | ídem | Solo Lipigas — 5/11/15/45 kg + Yale Al | 8 |
| `gas-noviciado` | Gas Noviciado | ¿Noviciado? | **Sin dato** | **Sin dato** | 3 marcas — 5–45 kg (según el pendón) | No está en el set |

**Horario común:** lunes a sábado de 10:00 a 20:00; domingos y festivos de 10:00 a 15:00. Hay horarios especiales de feriado (17–19 de septiembre, 1 y 21 de mayo, Navidad y Año Nuevo).

**Medio de pago (CONTRADICCIÓN ABIERTA):** las listas 2025–26 dicen «SÓLO EFECTIVO». En cambio, las respuestas de atención al cliente de Rey del Gas, una story de 2024 y los impresos de Don Julio aceptan transferencia (Motogas SpA, una cuenta por banco y local). **Hay que confirmarlo con el cliente antes de automatizar.**

---

## 2. Fichas por marca

### 2.1 El Rey del Gas
- **Logo:** «EL / REY DEL GAS», serif en versalitas negras con filete, más la versión con el personaje. El vector existe en `Workspace/Clientes/Motogas/SVG/rey-del-gas.svg`.
- **Personaje (sin nombre propio):** cilindro rojo `#FF0000`/`#FF1B00` con **corona amarilla `#FFC214` ladeada**, ojos grandes unidos en «8», sonrisa abierta con lengua, brazos negros finos, guantes blancos y zapatos blancos grandes. Es **2D vectorial de color plano con contorno negro grueso**, en estilo mascota retro. Tiene **una sola pose** (mano en la cadera y pulgar arriba) desde 2019. En oct-2025 se probó un 3D y se abandonó: **lo vigente es el 2D.**
- **Paleta (manual):** degradado amarillo→naranja, ámbar `#FFAA00`, café `#5C2A00`, rojo `#FF1B00` y rojo profundo. Con la nueva línea se suman la tela gris o roja de fondo y paneles rojos y amarillos.
- **Tipografía:** Metropolis (texto) y **Komika Axis** (display de cómic). En las piezas también aparece Poppins.
- **Composición vigente (4:5):** franja de contacto arriba → logo al centro → objeto 3D o foto protagonista con una cinta de titular → personaje junto a un cilindro Lipigas 3D → megáfono «¡Tenemos descuentos!» abajo a la izquierda → al pie, «Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!».
- **Temporada:** en 2026 el personaje **no se disfraza**; antes cambiaba la corona por un gorro de Santa o una chupalla, o se ponía lentes. La temporada se cuenta con objetos 3D.
- **Choque de estilo conocido:** el personaje plano junto a objetos 3D brillantes. Hay que decidir si se acepta como sello o se resuelve.

### 2.2 Gas Don Julio (y Don Julio 2)
- **Logo:** «GAS / Don Julio» en sans black navy con contorno rojo, más «MULTIMARCAS». **Don Julio 2** lleva un «2» amarillo con la bandera de Venezuela. Hay `.ai` vectoriales en `Archivo/`.
- **Personaje: GASFIELD.** Ganó un concurso de nombre en junio de 2023 (ganadora: Gabriela Mondaca Puga). Es un cilindro rojo con aro y válvula arriba, línea de soldadura a media altura, ojos ovalados con brillo, extremidades negras de palito y pulgar arriba.
  - **2D (2023):** sale de stock de Freepik. El manual trae **5 poses**: confundido con papel, con llave, celebrando, con celular y corriendo.
  - **3D tipo juguete (vigente desde jul-2026):** generado con IA de Freepik. El mejor retrato es `3. Evergreen/OTROS/Propuesta grafica Don Julio/freepik__talk__21861.png`, transparente.
  - **Falta una hoja de modelo 3D:** hoy conviven al menos 3 cuerpos (esférico con aro, cápsula sin aro y cilindro alto).
- **Es la única marca cuyo personaje se disfraza por temporada:** traje de baño o camisa hawaiana, gorro de Santa, chupalla, sombrero de bruja, bufanda y gorro de lana, camiseta de fútbol, chef, esmoquin.
- **Paleta:** navy `#163459`/`#17325C`, rojo `#B40904`, chartreuse `#CEC805`/`#D1CB06`, oliva y gris `#E8E8E8`.
- **Tipografía:** Poppins (Bold, Black, Black Italic) y Metropolis.
- **Composición 2026:** papel con semitono y grano, borde rasgado con banda navy, brochazo chartreuse, cinta roja «TENEMOS DCTOS», y un cilindro Lipigas con celular, logo y Gasfield sobre una forma chartreuse.
- **Desde 2025 casi todas las piezas comunes llevan las dos sucursales.**

### 2.3 Lipigas Recoleta y Lipiestación (cuentas Lipi)
- **Marca de terceros:** operan bajo la identidad Lipigas (el corazón, la familia de cilindros amarillos y el perro **Spike**, que es de Lipigas y aparece solo en Recoleta).
- **Logos:** Lipiestación usa un sub-logo propio, «Lipiestación Central», con el corazón. Recoleta usa el logo Lipigas más «Recoleta».
- **Sin mascota propia.** El rol lo cumplen la forma del corazón, la familia de cilindros y personajes temáticos de temporada (Santa, bruja, monito de nieve, chef).
- **Paleta (manual):** navy `#002989`, amarillo `#FFD400` y degradado amarillo-verde-azul `#CBC100 → #6D9F27 → #0E7960`.
- **Tipografía:** Poppins y Metropolis Black. Komika Axis para «¿Sabías qué?».
- **Las diferencias entre los dos locales son mínimas:** el panel de horario (celeste en Lipiestación, lima en Recoleta), el contenido local («Orgullo local Estación Central» frente a «Patrimonio en Recoleta») y la pantalla del teléfono, que en Lipiestación cambia el paisaje según la temporada.
- **Las efemérides comparten la misma escena para los dos locales**; solo cambia el pie.

### 2.4 Gas Noviciado (pendiente)
Aparece solo en los pendones de oct-2025. No tiene logo suelto, paleta, dirección ni teléfono. **Se necesita su ficha antes de incluirlo.**

---

## 3. Sistema común (lo que comparten las 4 marcas activas)

| Elemento | Regla observada |
|---|---|
| Formato principal | Post 4:5, 1080×1350. Además: story 1080×1920, anuncios 1:1 y 16:9, portada de Facebook 851×315, pendones de 75×120, 120×75 y 100×200 cm, flyer de 10×14 cm y lista impresa de 1×2 m |
| Píldora de condiciones | «SÓLO EFECTIVO \| RETIRO EN BODEGA \| [WhatsApp] +56…» en una cápsula navy (o roja en Rey del Gas V2) |
| Cierre comercial | Megáfono o cinta «¡TENEMOS DSCTOS!» + «Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!» |
| Objetos | 3D tipo plastilina, con luz suave y tintados en la paleta de la marca. Desde 2025 no se mezclan con ilustración plana (salvo el personaje de Rey del Gas) |
| Paridad | Toda campaña, temporada o efeméride sale **×4 marcas** con el mismo concepto |
| Tono | Tuteo, chileno coloquial y cercano. Lo que mejor rinde es el humor local y lo estacional (reporte de paid de jul-ago) |
| Tipos de pieza | Lista de precios (semanal) · Fijos evergreen (Horario, Ubicación, Contacto/Mesa de ayuda) · Efeméride · Grilla por pilares (Receta, ¿Sabías qué?, Orgullo local, Rostros y números, Meme, Historias, Reels) · Promo · Pendón |

---

## 4. Sistema de temporadas

**Calendario:** ene–feb Verano · mar–may Otoño · jun Mundial (cuando corresponda) y luego Invierno · jul–ago Invierno · sep Fiestas Patrias y luego Primavera · oct Primavera y Halloween · dic Navidad (que **en Chile es veraniega**: Santa con playa) y luego Verano. Las temporadas pueden **apilarse** (Mundial + Invierno).

**Receta para vestir una pieza:**
1. Identifica el tipo de pieza, porque define la intensidad del vestido: alta en el evergreen, ambiente completo en la efeméride y mínima (solo esquinas) en la lista de precios.
2. Resuelve la temporada por fecha, apilando si corresponde.
3. **Congela las zonas intocables:** logo, tarjeta de datos, precios, teléfonos, legal, CTA, megáfono y cintas.
4. Coloca de 3 a 6 objetos 3D del set de la temporada: 2 arriba, 1–2 asomando a los costados de la tarjeta y 1 al pie del personaje o del cilindro. Puedes agregar arena o nieve en el borde inferior.
5. Vestuario: solo Gasfield (Don Julio). Rey del Gas no se disfraza en 2026. En las cuentas Lipi suma, como máximo, un personaje temático.
6. En Lipiestación, cambia el paisaje de la pantalla del teléfono.
7. QA: ortografía, año correcto, sin restos de la temporada anterior y las ×4 marcas consistentes.

**Set de objetos por temporada (resumen):**

| Temporada | Objetos |
|---|---|
| Verano | Palmera, quitasol, snorkel, tabla de surf, flotador, pelota de playa, reposera, sol con lentes |
| Navidad | Lo de verano + acebo, bolas, corona, regalos, saco, Santa en reposera |
| Otoño | Hojas de arce, bellotas, piñas, calabaza, colchón de hojas |
| Invierno | Copos 3D **en colores de la marca**, montones de nieve, antiparras, globo de nieve, casita, monito de nieve |
| Fiestas Patrias | Bandera con asta, volantín, guitarra con cinta tricolor, pareja de cueca, banderines, papel picado |
| Primavera | Mariposa, picaflor, chinita, abeja, margarita, tulipán, nido, rama con brotes |
| Halloween | Telaraña, fantasma, murciélago, araña, calabaza, vela, calavera, bruja |
| Mundial | Arco, balón, guantes, cornetas, papel picado |

**Efemérides:** son otro sistema. Usan una escena fotorrealista generada con IA a sangre, titular en Poppins o Metropolis Black y un pie fijo de marca. La biblioteca de evergreen de julio de 2026 tiene **V1 y V2** por temporada; V2 es más limpia y da más jerarquía al dato. **No está claro cuál rige; confirmar con el equipo.**

Las referencias canónicas por temporada están en `anexos/temporadas.md` §6.

---

## 5. Lista de precios del jueves

- **Ciclo de jueves a miércoles.** La carpeta lleva la fecha de término (`00. Lista de precios/Agosto 26/` = «Vigente hasta el 26/08/26», exportada el jueves 20/08).
- **El set es de 10 piezas 1080×1350** (`Lista Precios-1..10.png`), exportadas de un `.ai` con 10 mesas de trabajo. El mapa número→local está en §1.
- **Cambia:** la fecha cada semana; los precios cuando el cliente los mueve (entre el 12/08 y el 26/08/26 no cambió ninguno); la promo, casi siempre en 15 kg; y la decoración de temporada, solo en las esquinas.
- **Es fijo:** el layout, los logos de Gasco, Abastible y Lipigas, la dirección, el teléfono y el pie.
- **Formato del precio:** `$11.900`, con punto de miles y sin decimales, en múltiplos de 100. La unidad se escribe distinto según la marca: «5Kg» en Don Julio, «5KG» en Rey del Gas y «Recarga de 5 kilos» en Lipi.
- **Marca de promo por familia:** Don Julio y Don Julio 2 usan una celda roja con «- Promo -». Rey del Gas usa «P R O M O», un asterisco, la nota y dos cintillos con el precio estrella. Las cuentas Lipi usan la palabra «PROMO» y una píldora en verde.
- **Origen de los precios:** no hay planilla. Se infiere que llegan por WhatsApp y se tipean a mano. **Proponer al cliente una planilla de local × marca × formato.**
- El esquema JSON propuesto, con un ejemplo real lleno, está en `anexos/lista-precios-legales.md` §7.

## 6. Legales (textos fijos por contexto)

| Perfil | Texto literal |
|---|---|
| **Lista multimarca** (Don Julio y Don Julio 2) | `SÓLO EFECTIVO \| RETIRO EN BODEGA \| [WA] {whatsapp}` + `Vigente hasta el {DD/MM/AA}` |
| **Lista Rey del Gas** | `SÓLO EFECTIVO \| Retiro en bodega \| [WA] {whatsapp}` + `Números con (*) estan en OFERTA` (sic) + `Vigente hasta el {DD/MM/AA}` |
| **Lista Lipi** (Recoleta y Lipiestación) | `Precios válidos hasta el {D de Mes de AAAA}` + `Todas las semanas tenemos distintas promociones.` Sin pago, retiro ni teléfono |
| **Contacto evergreen Rey del Gas** | `SÓLO EFECTIVO \| RETIRO EN BODEGA \| [WA] LO PRADO: +56 9 5460 6758 – CERRO NAVIA: +56 9 6642 6189` |
| **Pendón** (Lipiestación, Don Julio y Gas Noviciado) | `SÓLO VENTA EN EFECTIVO, NO TENEMOS PAGO CON TARJETAS,` / `SÓLO RETIRO EN LOCAL, NO REALIZAMOS ENVÍOS A DOMICILIO.` |
| **Oferta del día** (impreso Don Julio) | `OFERTA VÁLIDA __/__` · `SOLO POR HOY` |

Los cupones históricos y los textos de método de pago (con cuentas bancarias) están en `anexos/lista-precios-legales.md` §4.

## 7. Errores que el sistema debe impedir (observados en piezas reales)

- **Datos cruzados entre locales:**
  - el sello «Orgullo local Estación Central» en un post de Recoleta;
  - cupones con los nombres invertidos;
  - una promo de Fiestas Patrias de Recoleta con «Vigente hasta el 09/07/25»;
  - el flyer de Don Julio 2 con el teléfono de Pudahuel.
- **Ortografía y fecha:**
  - «CHINELIDAD» en 3 marcas;
  - «DOMIGOS» en los horarios de 2023–24;
  - un Año Nuevo de diciembre de 2025 que dice «2025»;
  - mezcla de «SOLO» y «SÓLO»;
  - «estan» sin tilde (decidir si se corrige).
- **Inglés y restos:** badges en inglés de 2023–24 («Summer Sale»), nieve en Fiestas Patrias V2 y fotos de repartidor cuando el negocio no tiene despacho.

## 8. Riesgos de producción y licencias

- **Vectores:** no hay vectores del personaje de Rey del Gas fuera del SVG del logo. Sus poses están incrustadas en `.ai` de 30 a 170 MB.
- **`.ai` sin PDF compatible:** varios maestros se guardaron así y no se pueden leer fuera de Illustrator.
- **Logos:** solo hay PNG de menos de 750 px, sin versiones blancas ni negras. El archivo `logo.svg` es en realidad de Abastible.
- **Metric (Klim)** está empaquetada en una grilla: es una tipografía comercial y podría no tener licencia.
- **Gasfield 2D** sale de stock de Freepik y **Spike** e identidad son de Lipigas: son activos de terceros.

## 9. Decisiones que necesito del equipo o del cliente

1. **Medio de pago:** ¿solo efectivo, o efectivo y transferencia?
2. **Evergreen V1 o V2:** ¿cuál rige, o se alternan?
3. **Rey del Gas:** ¿se mantiene el personaje 2D con objetos 3D como sello, o se hace una versión 3D coherente?
4. **Gasfield 3D:** ¿fijamos una hoja de modelo con un solo cuerpo?
5. **Gas Noviciado:** ¿entra al sistema y a la lista semanal? Falta su ficha.
6. **Erratas heredadas** («estan», «SÓLO»): ¿se corrigen en la plantilla?
7. **Fuente de precios:** ¿pedimos al cliente una planilla estructurada cada miércoles?

## 10. Cómo se baja esto (propuesta, igual que Berel)

| Capa | Qué | Dónde |
|---|---|---|
| Skill de criterio | `motogas-graphic-line`, exclusiva de Motogas, aislada de Efeonce, Berel y SKY | `.claude/skills/motogas-graphic-line/` en Greenhouse |
| Contratos | `motogas-stores.json` (§1, fuente única de dirección, teléfono, horario y formatos) · `motogas-tokens.json` (paleta, tipografía y logos por marca) · `motogas-seasons.json` (calendario, sets de objetos, vestuario y zonas intocables) · `motogas-legal.json` (perfiles de §6) · `motogas-price-list.json` (esquema semanal) | Workbench `brands/motogas/contracts/` |
| Compositor | Lista de precios de 10 mesas desde el JSON semanal + fijos de Horario, Ubicación y Contacto ×4 marcas con la temporada como capa | Workbench `brands/motogas/compose/` |
| Canvas /design | Una lámina por marca (logo, personaje, paleta, tipografía y píldora) + el set de temporadas + la plantilla de lista de precios con variables por local | /design |
