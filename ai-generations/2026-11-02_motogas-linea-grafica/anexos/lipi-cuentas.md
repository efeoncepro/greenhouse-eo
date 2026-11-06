# Motogas · Cuentas de distribuidores Lipigas: Lipiestación, Lipigas Recoleta (y Lipivecino)

> Análisis de dirección de arte para construir un sistema reutilizable y un canvas de diseño.
> Fecha: 2026-11-02. Muestra: unas 78 piezas copiadas y reducidas, de las que se miraron unas 58, más 4 páginas de la guía de línea gráfica. Colores medidos en píxel con un muestreador propio (BMP vía `sips`). Tipografías medidas con `pdffonts` en los `.ai`. En OneDrive no se modificó nada.
> Convención: **[V]** = VERIFICADO (visto en píxel, en un `.ai` o en el nombre del archivo) · **[I]** = INFERIDO (interpretación del analista).

Raíz: `R=/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA`
PG = `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica`

---

## 0. Hallazgos que cambian el encargo

1. **Ya existe una guía de línea gráfica de Motogas** con una página por cuenta: `PG/1. Recursos Graficos/MotoGas-LineaGrafica.ai` (4 mesas de trabajo: Rey del Gas, Don Julio, **Recoleta**, **Lipiestación**; modificada el 2025-11-25). Para las cuentas Lipi define: logo, «Elemento» (en lugar de «Personaje»), «Marcas que trabajan» (solo el cilindro Lipigas), tipografía **Poppins** y una paleta de 3 muestras. [V] Es el punto de partida canónico del sistema.
2. **La producción vigente no está en `Archivo/` ni en `Workspace/`.** Vive en `PG/2. Grilla Diseño/<NN. Mes>/` (sep-2025 → ago-2026), en `PG/3. Evergreen/` (fijos por temporada, julio de 2026) y en `PG/00. Lista de precios/` (la última es «Agosto 26», modificada el 2026-08-20). `Workspace/…/Lipiestacion` y `…/Lipigas Recoleta` llegan hasta abril de 2024; `Archivo/02-03` llega hasta mayo de 2025. [V]
3. **Desde 2025 el sistema es UNA plantilla Motogas («MG_») que se clona por cuenta.** Lipiestación y Recoleta reciben la misma pieza y cambian solo el logo, el teléfono, la dirección y, en la versión V1 de los fijos, el color del panel. Los archivos llevan nombre `MG_…_LP_…` y `MG_…_RECOLETA_…`. [V]
4. **Lipivecino está INACTIVO.** El último archivo es del 2024-04-25 (`Workspace/Clientes/Motogas/Lipivecino/ABRIL/2501_Mesa de trabajo 1.png`) y no tiene carpeta en Produccion Grafica 2025-2026 ni página en la guía. [V] Ver §8.

---

## 1. ¿Personaje o mascota?

**Ninguna de las dos cuentas tiene un personaje propio** [V]: la guía rotula ese espacio como «Elemento», no como «Personaje». En cambio, Rey del Gas tiene un cilindro rojo animado y Don Julio tiene su personaje.

Lo que cumple el rol de personaje:

| Rol | Qué es | Evidencia |
|---|---|---|
| **«Elemento» de marca** | El **corazón de Lipigas** (isotipo nuevo de Lipigas, 2 lóbulos): amarillo `#FFD400` con una porción en degradado azul `#006AAC→#0C4B92` y una cuña lima/verde. Funciona como gran forma de fondo detrás del producto o del teléfono. | guía p.3-4 [V]; `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/contacto/MG_Evergreen_Invierno_RECOLETA_CONTACTO.jpg` [V] |
| **Protagonista de producto** | El **cilindro amarillo Lipigas** (5, 11, 15 y 45 kg, más Yale aluminio gris), en render 3D, casi siempre como «familia» de 5 cilindros. | todas las piezas [V] |
| **Cilindro personificado (ocasional)** | El cilindro disfrazado o con manos: con sombrero y capa de bruja en Halloween, con guantes de dibujo animado en San Valentín, con gorro de chef en Recetas. | `PG/2. Grilla Diseño/02. Octubre/Lipiestacion/LP_Post_(31-10).png`; `PG/2. Grilla Diseño/06. Febrero/Festivos/San Valetin/MG_PostEspacial_LP_Post_(12-10) copia 2.jpg`; `…/10. Junio/RECETA BARROS LUCO/LIPIESTACION/MG_Receta-01-LP_ingredientes.png` [V] |
| **Perro «Spike» (de Lipigas)** | Perrito de peluche realista con collar amarillo y una placa con forma de cilindro y el logo Lipigas. Solo aparece en Recoleta («¿Ya viniste a visitarnos? Av. Perú 1337»), en 2024 y en el Evergreen Verano. | `$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipigas Recoleta/Aislados/spike.png`; `$R/Workspace/Clientes/Motogas/Lipigas Recoleta/smm-02.png`; `PG/3. Evergreen/05_Evergreen Verano/V1/MG_Evergreen_Verano_RECOLETA_UBICACION.jpg` [V]. [I] Es un activo de la marca Lipigas (la placa lleva su logo), así que no es propio del local: no se puede tratar como mascota de la cuenta sin autorización de Lipigas. |
| **Personajes 3D de temporada (stock o IA)** | Niño estilo Pixar (Sabías qué, Mundial), huasos (Fiestas Patrias), bruja, murciélagos y arañas (Halloween), Viejo Pascuero en traje de baño (Navidad), monito de nieve (Invierno), espantapájaros (Otoño), sol con lentes (Verano). Rotan; no son fijos. | `PG/2. Grilla Diseño/10. Junio/SABIAS QUE 01/MG_SabiasQue-01-2-Lipiestacion.png`; `PG/2. Grilla Diseño/01. Septiembre/Lipiestacion/LE_Post_(01-09 Semana 1).jpg` [V] |
| **Fotografía (IA o escena)** | Las efemérides se hacen como escena fotográfica: cilindro Lipigas real en un ambiente (atardecer, estadio, cabaña nevada, plaza con niños). | `PG/2. Grilla Diseño/11. Julio/…/EFEMERIDES/Pueblos indigenas/Efemerides Lipiestacion Pueblos indigenas 6.jpg` [V]; [I] por el acabado, las escenas parecen generadas con IA. |

No aparecen repartidor ni camión: el modelo es **retiro en bodega**, sin despacho. [V] por el texto fijo «SÓLO EFECTIVO | RETIRO EN BODEGA».

---

## 2. Línea gráfica

### 2.1 Logos
| Cuenta | Logo | Qué es de Lipigas y qué es propio |
|---|---|---|
| **Lipiestación** | Isotipo corazón (2 lóbulos con un trazo «C» blanco) sobre la palabra **«Lıpıestación»**, con la «ı» sin punto de la letra Lipigas, y **«Central»** pequeño a la derecha. Monocromo navy `#2E2E82` (medido). En negativo va blanco sobre degradado. | [V] archivo `PG/1. Recursos Graficos/Logos/Lipiestacion Logo.png` (663×263). [I] El isotipo y la caligrafía «ı» son del sistema Lipigas, y el nombre del local está compuesto con esa letra: es un sub-logo derivado de Lipigas. |
| **Lipigas Recoleta** | **Logo Lipigas** (palabra navy `#18317F`, arco verde `#4EA048`, ®) con **«Recoleta»** en navy debajo, a la derecha. | [V] `PG/1. Recursos Graficos/Logos/Recoletas Logp.png` (584×244). Es el logo Lipigas oficial más un descriptor. En la portada de Facebook se usa además el isotipo corazón en línea blanca junto al logo: `$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipigas Recoleta/portada-lipirecoleta_Mesa de trabajo 1.png` [V]. |
| Era 2023-2024 (histórica) | Logo Lipigas **antiguo** (palabra en itálica con gota/corazón amarillo y navy) más «Estación Central». | `$R/Workspace/Clientes/Motogas/Lipiestacion/lista0713-02.png` [V]. Ya no se usa. |

Posición del logo [V]: centrado arriba, bajo la franja de contacto, a unos 10-13 % del alto. En efemérides y Halloween puede ir abajo, centrado sobre la ola (variante «firma inferior»).

### 2.2 Colores (medidos en píxel)
| Token | Hex | Uso | Fuente |
|---|---|---|---|
| Navy Lipigas | `#002989` (guía); `#183180` (titulares y logo Recoleta); `#2E2E82` (logo Lipiestación) | titulares, franja de contacto, píldoras de horario de Recoleta, textos | guía p.3-4 y piezas [V] |
| Amarillo Lipigas | `#FFD400` (guía); `#FED600` (listas de precios) | corazón, ola, cilindros (`#F8C220` / `#E3AD25` en sombra) | [V] |
| Degradado verde (3.ª muestra de la guía) | `#CBC100 → #6D9F27 → #0E7960` | píldoras «LUNES A SÁBADO» en Lipiestación, botón PROMO, cuña del corazón | [V] |
| Azul brillante → navy (píldoras de precio y titulares en píldora) | `#0079BD/#189BD7 → #133A87/#144180` | barras de precio, píldora «RECETA DEL DÍA», «¡Estamos trabajando para ti!» | [V] |
| Panel Lipiestación (fijos V1) | celeste `#07A6DC` que se aclara a `#79B1D4` | tarjeta del Horario | `MG_Evergreen_Invierno_LP_HORARIOS.jpg` [V] |
| Panel Recoleta (fijos V1) | lima/oliva `#D4C700 → #8FAE20 → #AFCD99` | tarjeta del Horario | `MG_Evergreen_Invierno_Recoleta_HORARIOS.jpg` [V] |
| Fondo | blanco `#FEFEFE` / `#F6F7FA` (55 % de las listas) | base | [V] |
| Banda inferior CTA | azul `#0078B6 → #095296` | «Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!» | [V] |
| Acento rojo | el rojo del pin de ubicación y de las píldoras de dirección (Lipiestación) | ubicación | visual [V]; hex no medido |
| Era 2023-24 | amarillo-naranjo `#F7BB35/#FAC526` con trama de puntos y navy `#00298C` | fondo completo | `lista0713-02.png` [V] |

[I] Lipiestación tiende al **azul/celeste** y Recoleta al **lima/verde** (por el arco verde de su logo). Es la única diferencia cromática deliberada, y solo en los fijos V1; en V2 ambas comparten el panel en degradado amarillo→verde→azul.

### 2.3 Tipografías
- **Poppins** (Bold, SemiBold, ExtraBold, Black, BlackItalic): la tipografía oficial de ambas cuentas según la guía. [V] Se embebe en `PG/6. Plantillas Graficas/MG-Plantillas_SabiasQue.ai` y `MG-Plantillas_OrgulloLocal.ai`.
- **Metropolis Black** (ExtraBold, Light): titulares grandes como «HORARIO COMERCIAL» y los precios. [V] Se embebe en las plantillas y en `Lipiestacion Verano.ai`, y está en `PG/1. Recursos Graficos/Fuentes/Metropolis`.
- **Komika Axis** (`KOMIKAX.ttf`): display de cómic para «¿SABÍAS QUÉ?» y «PABLO NERUDA» en Rostros y números. [V] Embebida en `MG-Plantillas_SabiasQue.ai` y `MG-Plantilla_Historias.ai`.
- **Eras ITC Bold**: rastro de la era 2023-2024 (`content.ai`, `orgánico-nuevo.ai`, `Lipiestacion Dic.ai`). [V] No usar en piezas nuevas [I].
- Los fijos Evergreen 2026 tienen el texto trazado (pdffonts solo devuelve MyriadPro). [V]
- «¡TENEMOS DSCTOS!» va en itálica pesada (Poppins BlackItalic) [I por la forma; la fuente está embebida en la plantilla].

### 2.4 Fondos
1. **Blanco con objetos 3D de temporada en las esquinas** (el más común desde 2025). [V]
2. **Blanco con el corazón Lipigas** grande al centro, detrás del producto o del teléfono. [V]
3. **Blanco con un arco u ola** amarillo→verde→azul cortando una esquina: listas de precios y firma inferior de efemérides. [V]
4. **Panel/tarjeta redondeada** (celeste en Lipiestación, lima en Recoleta, degradado en V2) para Horarios. [V]
5. **Escena fotográfica a sangre** con la ola de marca abajo (efemérides). [V]
6. Siluetas tenues de palmeras o árboles en gris claro como textura de temporada (verano y otoño). [V]
7. Histórico: amarillo con trama de puntos (2023-24). [V]

### 2.5 Composición típica (post 4:5, 1080×1350 o 2250×2812)
De arriba hacia abajo [V]:
1. **Franja de contacto** (texto navy sobre blanco, o píldora navy): `SÓLO EFECTIVO | RETIRO EN BODEGA | [ícono WhatsApp] +569…`
2. **Logo** de la cuenta, centrado.
3. **Titular** en navy (Poppins o Metropolis Black), a veces dentro de una píldora en degradado azul.
4. **Bloque central**: panel de horario, corazón con familia de cilindros, teléfono con WhatsApp, foto con marco de estampilla (Orgullo local / Rostros y números) o personaje 3D.
5. Objetos 3D de temporada en 2-4 esquinas.
6. **Banda CTA inferior** (fija desde mediados de 2025): megáfono, «¡TENEMOS DSCTOS!» (píldoras azul y verde), sello «PROMO NUEVA» amarillo, mini-cilindro y el texto «Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!» sobre la banda azul.

No llevan legal ni bajada de precio, salvo en las listas («Precios válidos hasta el…» y «Todas las semanas tenemos distintas promociones.»). [V]

### 2.6 Formatos y tamaños [V]
| Formato | px | Ejemplo |
|---|---|---|
| Post 4:5 | 1080×1350 (2025, listas) · 2250×2812/2813 (Evergreen y Efemérides 2026) · 6000×7500 (Orgullo local / Receta nov-2025) | `PG/00. Lista de precios/Agosto 26/Lipiestacion/Lista Precios-8.png` |
| Story / Historia destacada 9:16 | 1081×1921 | `$R/…/Produccion Grafica/Archivo/02 Lipiestacion/Historias Destacadas/LE_Highlights_Contacto-8.png` (ícono blanco sobre navy) |
| Ad cuadrado/vertical | 1081×1350 | `…/Archivo/02 Lipiestacion/Ad/Lipiestacion_AD_Cuadrado.png` |
| Ad horizontal 16:9 | 1921×1081 | `…/Archivo/03 Lipigas Recoleta/Ad/LipiestacionRecoletas_AD_Horizontal.png` |
| Avatar 1:1 | 1081×1081 / 2250×2250 | `…/Archivo/02 Lipiestacion/Avatar_Lipiestacion.png` |
| Portada Facebook | 1773×657 | `…/Archivo/Lipigas Recoleta/portada-lipirecoleta_Mesa de trabajo 1.png` |
| Video/GIF (mp4) | — | `…/Archivo/02 Lipiestacion/Otoño 2025/LE_GIFF-FIJO_Ubicacion.mp4`, `…/Ad/Lipiestacion_Video_Ad-(Listo).mp4` |
| Carrusel | 1081×1351 por lámina | `…/Archivo/02 Lipiestacion/Verano 2025/Grilla Marzo/Carrusel (19-03)/` |

---

## 3. Qué es común y qué cambia por local

**Común (plantilla MG compartida)** [V]: estructura, banda CTA «¡TENEMOS DSCTOS!», franja «SÓLO EFECTIVO | RETIRO EN BODEGA», corazón y ola, paleta, Poppins/Metropolis, familia de cilindros, horario comercial, copys de los pilares de contenido, objetos de temporada. Las piezas se producen en pares con el mismo arte.

| Variable | Lipiestación (código LP/LE) | Lipigas Recoleta (código RE/RECOLETA/LER/«Lipigas»/«Lipirecoleta») |
|---|---|---|
| Logo | Lipiestación Central (sub-logo corazón) | Logo Lipigas + «Recoleta» |
| WhatsApp | **+56986409812** | **+56982477870** |
| Dirección | **2 locales**: **5 de Abril 4021** (esq. General Velásquez) y **Vecinal 4494**, Estación Central, Santiago | **Av. Perú 1337**, Recoleta, Santiago |
| Horario | L-S 10:00-20:00 · Dom y festivos 10:00-15:00 | igual |
| Precios (ago-2026) | Vecinal: 5 kg $11.900 · 11 kg $16.900 · 15 kg PROMO $22.900. 5 de Abril suma Yale Aluminio $27.900 y 45 kg $67.900 | 5 kg $11.000 · 11 kg $17.000 · 15 kg PROMO $21.900 · Yale $27.900 · 45 kg $67.900 |
| Lista de precios | 2 piezas por semana (una por local) | 1 pieza |
| Color del panel (fijos V1) | celeste | lima/oliva |
| Contenido local | «Orgullo local · Estación Central» (sello con tren): Estación de Ferrocarriles, Piscina Municipal | «Patrimonio en Recoleta»: Museo Histórico Dominico, Pablo Neruda («Sus días viviendo en Recoleta») |
| Halloween | «Halloween prendido en Estación Central» | ídem adaptado |

[V] Riesgo de QA real, porque la plantilla se clona: el post Recoleta «Museo Histórico Dominico» usa el **sello «ORGULLO LOCAL · ESTACIÓN CENTRAL»** (`PG/2. Grilla Diseño/02. Octubre/Recoleta/RECOLETA_Post_(17-10).png`). Además, los archivos de cupones están **cruzados de nombre**: `MTG_Promo_Cupones_GDS_Recoleta.jpg` muestra Lipiestación y `…_Lipigas.jpg` muestra Recoleta. Y la promo de Fiestas Patrias 2025 de Recoleta dice «Vigente hasta el 09/07/25» (`PG/2. Grilla Diseño/01. Septiembre/FIJOS/Otros/Grafica Fiestas Patrias(Version Promo)_Recoleta_Promo_Semana1.jpg`). → El sistema necesita **variables de local** (logo, teléfono, dirección, sello, fecha) separadas del arte.

---

## 4. Cómo integran la temporada sin romper la línea [V]
Regla observada: **la estructura no cambia; la temporada entra como objetos 3D en las esquinas y personajes junto a los cilindros**. Rara vez cambia el fondo. Los fijos (Horario, Ubicación, Contacto/Mesa de ayuda) se rehacen por temporada en `PG/3. Evergreen/` con versiones V1 y V2.

| Temporada | Objetos y recursos | Ejemplo |
|---|---|---|
| Verano | sol con lentes, palmeras, flotador, sillas de playa, quitasol, tabla de surf, perro Spike con sombrero | `PG/3. Evergreen/05_Evergreen Verano/V2/MG_Evergreen_Verano_V2_LP_CONTACTO.jpg` |
| Navidad (verano austral) | Viejo Pascuero con lentes y traje de baño, coronas, acebo, bota con dulces en la arena, guirnaldas de esferas (2024) | `PG/2. Grilla Diseño/04. DIciembre/1-NAVIDAD/LIPIESTACION/MG_FIJOS_NAVIDAD_2025_v2_LP_HORARIO_1.png` |
| Año nuevo | carpetas «POST VERANO, NAVIDAD Y AÑO NUEVO» y `Archivo/Lipiestacion/VERANO/AÑO NUEVO.png` | `$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipiestacion/VERANO/AÑO NUEVO.png` (no abierto) |
| Otoño | hojas 3D, bellotas, carretilla con zapallo, espantapájaros, árboles en silueta | `PG/2. Grilla Diseño/07. Marzo/EVERGREEN/LIPIESTACION/LP_MESA_AUYUDA_1.png` |
| Invierno | copos 3D amarillo y navy, antiparras, bola de nieve, monito de nieve, gorro de lana, nieve en la base, casita | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/Horarios/MG_Evergreen_Invierno_LP_HORARIOS.jpg` |
| Mundial 2026 | vuvuzelas amarillas y rojas, balón, confeti, niño futbolista | `PG/2. Grilla Diseño/10. Junio/SABIAS QUE 01/MG_SabiasQue-01-1-Recoleta.png` |
| Fiestas Patrias | volantín, bandera, guitarra, guirnalda tricolor, huasos bailando cueca, corazón bandera, parrilla con anticuchos («¡TIKITIKITI!») | `PG/3. Evergreen/01_Fiestas Patrias/02 Fiestas Patrias/Horarios/MG_Evergreen_Fiestas Patrias_LP_HORARIOS.jpg` |
| Halloween | arañas, telarañas, murciélagos, bruja, zapallos, cilindro disfrazado | `PG/3. Evergreen/02_Halloween/04 Evergreen Halloween v2/horarios/MG_Evergreen_Halloween_V2_Recoleta_HORARIOS.jpg` |
| Primavera | mariposas, picaflor, abeja, tulipán, nido, flores rosadas, aromo | `PG/3. Evergreen/03_Primavera/05 Evergreen Primavera/Ubicación/MG_Evergreen_Primavera_LP_UBICACION.jpg` |
| Día del niño / juventud | escena fotográfica con niños, globos y banderines + cilindros | `PG/2. Grilla Diseño/12. Agosto/Efemerides/dia del niño/Efemerides Julio 2_dia del niño-02.jpg` |
| San Valentín | cilindros en pareja con manos de dibujo animado y corazones 3D | `PG/2. Grilla Diseño/06. Febrero/Festivos/San Valetin/MG_PostEspacial_LP_Post_(12-10) copia 2.jpg` |
| Efemérides (pueblos indígenas, inicio del invierno, etc.) | escena fotográfica a sangre, cilindro protagonista, titular blanco con píldora amarilla, firma abajo sobre la ola | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA INVIERNO + MUNDIAL/EFEMERIDES/Pueblos indigenas/Efemerides Lipiestacion Pueblos indigenas 6.jpg` |

Las carpetas de recursos de temporada están en `PG/2. Seasonalitys-Efemerides/{Agosto,Septiembre,Octubre,Noviembre,Diciembre}` (juventud, día del niño, primavera, 18 de septiembre, Halloween, Chef, Café, Sándwich, Antártica Chilena, Navidad, Año Nuevo, Inocentes, Verano). [V por los nombres de carpeta]

---

## 5. Tipos de pieza (1 ruta de ejemplo cada uno)
| Tipo | Ruta |
|---|---|
| Lista de precios semanal | `PG/00. Lista de precios/Agosto 26/Lipiestacion/Lista Precios-8.png` |
| Fijo Horario comercial | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/Horarios/MG_Evergreen_Invierno_Recoleta_HORARIOS.jpg` |
| Fijo Ubicación («Encuentra los mejores precios aquí» con pin y direcciones) | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/ubicación/MG_Evergreen_Invierno_LP_UBICACION.jpg` |
| Fijo Contacto / Mesa de ayuda (teléfono WhatsApp) | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/contacto/MG_Evergreen_Invierno_RECOLETA_CONTACTO.jpg` |
| Horario especial / feriado | `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/Archivo/02 Lipiestacion/Otoño 2025/Grilla Mayo/LE_HorarioFeriado.png` |
| Promo «¡TENEMOS DSCTOS!» | `PG/2. Grilla Diseño/01. Septiembre/FIJOS/Otros/Grafica Fiestas Patrias(Version Promo)_Recoleta_Promo_Semana1.jpg` |
| Promo de precio puntual | `$R/…/Produccion Grafica/Archivo/02 Lipiestacion/Navidad 2024/Promo_Lipiestacion.png` («NAVIDAD DE DESCUENTOS · Lipigas 15KG = $19.900») |
| Promo cupón Gas Licuado (gobierno) | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA INVIERNO + MUNDIAL/MTG_CUPONES_GAS/MTG_Promo_Cupones_GDS_Lipigas.jpg` |
| ¿Sabías qué? (seguridad o consejo) | `PG/2. Grilla Diseño/10. Junio/SABIAS QUE 01/MG_SabiasQue-01-2-Lipiestacion.png` |
| Receta del día (carrusel portada, ingredientes y pasos) | `PG/2. Grilla Diseño/10. Junio/RECETA BARROS LUCO/LIPIESTACION/MG_Receta-01-3-LP_Portada.png` |
| Orgullo local / Patrimonio (foto con marco de estampilla y sello) | `PG/2. Grilla Diseño/03. Noviembre/LIPIESTACION/ORGULLO LOCAL/orgullo local_lipiestacion.png` |
| Rostros y números (personaje del barrio) | `PG/2. Grilla Diseño/05. Enero/Lipirecoleta/ROSTROS Y NÚMEROS- 2 ENERO.png` |
| Meme (Millennial vs Gen Z) | `PG/2. Grilla Diseño/10. Junio/MEME/MG_Meme-2-Recoleta.png` |
| Efeméride (escena fotográfica) | `PG/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA INVIERNO + MUNDIAL/EFEMERIDES/Aquien le vas/Efemerides Recoleta¿A quién le vas- (Mundial)-11.jpg` |
| Festivo especial | `PG/2. Grilla Diseño/06. Febrero/Festivos/Viña del mar/MG_PostEspacial_LP_Post_(12-10) copia.jpg` (no abierto) |
| Post temático o de mes (huasos, Halloween) | `PG/2. Grilla Diseño/02. Octubre/Lipiestacion/LP_Post_(31-10).png` |
| Educativo («¿Sabes cómo comprar?» en 3 pasos) | `$R/…/Produccion Grafica/Archivo/02 Lipiestacion/Otoño 2025/Grilla Mayo/LE_Post(02-05).png` |
| Consejo con foto en arco (carrusel) | `$R/…/Produccion Grafica/Archivo/02 Lipiestacion/Verano 2025/Grilla Marzo/Carrusel (19-03)/Lipiestacion_Post_(19-03)-4.png` |
| Story | `$R/…/Produccion Grafica/Archivo/02 Lipiestacion/Verano 2025/Grilla Enero/Stories/LE_Storie(14-01).png` |
| Portada de historia destacada | `$R/…/Produccion Grafica/Archivo/03 Lipigas Recoleta/Historias Destacadas/LER_Highlights_Contacto-8.png` |
| Ad paid (3 formatos más video) | `$R/…/Produccion Grafica/Archivo/03 Lipigas Recoleta/Ad/LipiestacionRecoletas_AD_Horizontal.png` |
| Avatar / portada | `$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipigas Recoleta/portada-lipirecoleta_Mesa de trabajo 1.png` |
| GIF/Reel (mp4) | `$R/…/Produccion Grafica/Archivo/03 Lipigas Recoleta/Otoño 2025/Grilla Abril/Recoleta_ComentaPromo.mp4` (no abierto) |

---

## 6. Textos fijos (literales y pieza de origen) [V]
- `SÓLO EFECTIVO | RETIRO EN BODEGA | [WhatsApp] +56986409812`: Lipiestación, todos los fijos 2025-26 (`MG_Evergreen_Invierno_LP_HORARIOS.jpg`). En ads y stories aparece sin tilde: `SOLO EFECTIVO | RETIRO EN BODEGA |` (`Lipiestacion_AD_Cuadrado.png`, guía p.4). → normalizar.
- `SÓLO EFECTIVO | RETIRO EN BODEGA | [WhatsApp] +56982477870`: Recoleta (`MG_Evergreen_Invierno_Recoleta_HORARIOS.jpg`).
- `5 De Abril 4021, Estación Central, Chile y Vecinal 4494 - Estacion Central`: guía p.4, Ad cuadrado, Story verano 2025, cupones (con variaciones de mayúsculas y tildes).
- `5 de Abril 4021` / `Esq General Velasquez, Estación Central, Santiago`: `PG/00. Lista de precios/Agosto 26/Lipiestacion/Lista Precios-8.png`.
- `Vecinal 4494` / `Estación Central, Santiago`: `…/Agosto 26/Lipiestacion/Lista Precios-7.png`.
- `Perú 1337, Santiago, Chile` (guía p.3, Ad) · `Av. Perú 1337` / `Recoleta, Santiago` (listas, `Lista Precios-6.png`).
- Horario: `HORARIO COMERCIAL` · `LUNES A SÁBADO` `10:00 – 20:00` · `DOMINGOS Y FESTIVOS` `10:00 – 15:00` · `¡Estamos trabajando para ti!` (Evergreen 2026). Las variantes 2024-25 dicen `DOMINGO Y FESTIVOS`.
- Feriados: `1 DE MAYO / Estamos Cerrados` (`LE_HorarioFeriado.png`) · `24 DE DICIEMBRE HASTA LAS 18:00 HRS / 25 DE DICIEMBRE CERRADO` (`…/03 Lipigas Recoleta/Navidad 2024/Horarios/LPRecoletas_Horarios_Diseño1.png`).
- Lista: `Encuentra los mejores precios aquí` · `Recarga de 5 kilos` / `11 kilos` / `15 kilos` / `45 kilos` · `Yale Aluminio` · `PROMO` · `Precios válidos hasta el 26 de Agosto de 2026` · `Todas las semanas tenemos distintas promociones.` (`Lista Precios-6/7/8.png`, ago-2026).
- Banda CTA: `¡TENEMOS DSCTOS!` · `PROMO NUEVA` · `Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!` (todos los posts desde mediados de 2025).
- Promo: `Visítanos y llévate ¡EL MEJOR GAS PARA TU HOGAR!` · `¡Ven a visitarnos!` (Ads). `Potencia tu Cocina con EL MEJOR GAS` (`LE_Post(15-01).png`).
- Cupón: `YA RECIBIMOS CUPONES EN` / `YA ACEPTAMOS CUPONES EN` · `Recuerda habilitarlo antes de ir al local.` · `Presentalo y llévate tu cilindro de Lipigas. ¡Ambos locales habilitados!` · `www.cupondegas.gob.cl` · `Cupón de $27.000 para gas licuado.` (`MTG_Promo_Cupones_GDS_*.jpg`).
- Educativo: `¿SABES CÓMO COMPRAR? Te lo explicamos fácil: 1 Ven directo a la bodega 2 Paga en efectivo 3 ¡Y listo! Te llevas tu recarga de gas · ¿Tienes dudas? Escríbenos por WhatsApp` (`LE_Post(02-05).png`).
- Histórico 2023-24: `CONSULTE POR PRECIO ESPECIAL A MAYORISTAS` · `Precios vigentes hasta el 13-11-24` (`$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipiestacion/2024/07NOV_LIPIESTACION_vecinal_velázques-02.png`).
- No hay legales formales (sin bases ni letra chica, aparte de la vigencia del precio). [V en la muestra]

---

## 7. Referencias canónicas

### Lipiestación (15)
1. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/MotoGas-LineaGrafica.ai` (p.4)
2. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/Logos/Lipiestacion Logo.png`
3. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/00. Lista de precios/Agosto 26/Lipiestacion/Lista Precios-8.png`
4. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/00. Lista de precios/Agosto 26/Lipiestacion/Lista Precios-7.png`
5. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/Horarios/MG_Evergreen_Invierno_LP_HORARIOS.jpg`
6. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/ubicación/MG_Evergreen_Invierno_LP_UBICACION.jpg`
7. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/3. Evergreen/05_Evergreen Verano/V2/MG_Evergreen_Verano_V2_LP_CONTACTO.jpg`
8. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/3. Evergreen/01_Fiestas Patrias/02 Fiestas Patrias/Horarios/MG_Evergreen_Fiestas Patrias_LP_HORARIOS.jpg`
9. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/04. DIciembre/1-NAVIDAD/LIPIESTACION/MG_FIJOS_NAVIDAD_2025_v2_LP_HORARIO_1.png`
10. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/10. Junio/SABIAS QUE 01/MG_SabiasQue-01-2-Lipiestacion.png`
11. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/10. Junio/RECETA BARROS LUCO/LIPIESTACION/MG_Receta-01-3-LP_Portada.png`
12. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/03. Noviembre/LIPIESTACION/ORGULLO LOCAL/orgullo local_lipiestacion.png`
13. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA INVIERNO + MUNDIAL/EFEMERIDES/Pueblos indigenas/Efemerides Lipiestacion Pueblos indigenas 6.jpg`
14. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/02. Octubre/Lipiestacion/LP_Post_(31-10).png`
15. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/Archivo/02 Lipiestacion/Ad/Lipiestacion_AD_Cuadrado.png`

### Lipigas Recoleta (15)
1. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/MotoGas-LineaGrafica.ai` (p.3)
2. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/Logos/Recoletas Logp.png`
3. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/00. Lista de precios/Agosto 26/Lipigas/Lista Precios-6.png`
4. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/Horarios/MG_Evergreen_Invierno_Recoleta_HORARIOS.jpg`
5. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA SOLO INVIERNO/V1/contacto/MG_Evergreen_Invierno_RECOLETA_CONTACTO.jpg`
6. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/3. Evergreen/02_Halloween/04 Evergreen Halloween v2/horarios/MG_Evergreen_Halloween_V2_Recoleta_HORARIOS.jpg`
7. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/3. Evergreen/05_Evergreen Verano/V1/MG_Evergreen_Verano_RECOLETA_UBICACION.jpg`
8. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/04. DIciembre/1-NAVIDAD/RECOLETA/MG_FIJOS_NAVIDAD_2025_v2_RECOLETA_MESA_AYUDA_1.png`
9. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/01. Septiembre/Recoletas/RE_Post_(18-09 Semana 3).png`
10. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/01. Septiembre/FIJOS/Otros/Grafica Fiestas Patrias(Version Promo)_Recoleta_Promo_Semana1.jpg`
11. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/10. Junio/MEME/MG_Meme-2-Recoleta.png`
12. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/05. Enero/Lipirecoleta/ROSTROS Y NÚMEROS- 2 ENERO.png`
13. `$R/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/2. Grilla Diseño/11. Julio/EVERGREEN - TEMATICA INVIERNO + MUNDIAL/EFEMERIDES/Aquien le vas/Efemerides Recoleta¿A quién le vas- (Mundial)-11.jpg`
14. `$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipigas Recoleta/Aislados/spike.png`
15. `$R/Alineación/1. Clientes (Interno)/Motogas/Archivo/Lipigas Recoleta/portada-lipirecoleta_Mesa de trabajo 1.png`

### Recursos compartidos
- Cilindros aislados: `PG/1. Recursos Graficos/Imagenes/{Lipigas Cilindro.png, Cilindro_5kg.png, Cilindro_15kg.png, 45kilos-catalitico-500.png, banner-cilindros.png}`. [I] `gas777-15kg-catalitico.png` parece de otra marca.
- Fuentes: `PG/1. Recursos Graficos/Fuentes/{Metropolis, Poppins, KOMIKAX.ttf}`.
- Plantillas: `PG/6. Plantillas Graficas/MG-Plantillas_{SabiasQue,SabiasQue2,SabiasQue3,Recetas,Recetas2,OrgulloLocal,Storys}.ai`, `MG-Plantilla_Historias.ai`, `Marco Postal.png`.
- Fijos editables por temporada: `PG/3. Evergreen/OTROS/MG_FIJOS_Otoño-2026.ai`, `MG_FIJOS_NAVIDAD_2025/MG_FIJOS_NAVIDAD_2025.ai`, `PG/3. Evergreen/06_Evergreen_Invierno/MG_Evergreen_Invierno.ai`.
- Mockups de portafolio: `$R/Alineación/7. Branding & Diseño/03. Portafolio Material/03. Motogas/01. Mockups/396{Navidad lipi,VeranoLipi,otoño lipi}.png` (no abiertos).

---

## 8. Lipivecino: ¿sigue activo? → NO
- [V] Último archivo: 2024-04-25. Ni la guía 2025 ni la Produccion Grafica 2025-26 lo incluyen. `Archivo/Lipivecino/Listas` está vacía.
- [V] Identidad: logo oficial del programa **«LipiVecino de Lipigas»** (pin de ubicación con el corazón Lipigas), fondo amarillo `#FFD200` con un gran pin navy recortado, tipografía **Montserrat** (`rrss.ai`), slogan **«Venga, ahorre y retire.»**. Local en **Laguna Sur #7106, Pudahuel Sur**, WhatsApp **+56 978178877**, horario L-S 09:00-20:30 · Dom y festivos 10:00-16:00. Mostraba «Precio sin descuento» frente a «Incluye Dscto.» y ofrecía la «Recarga Lipigas Plus». Fuentes: `$R/Workspace/Clientes/Motogas/Lipivecino/Lipivecino/horario_nuevadireccion.png`, `$R/Workspace/Clientes/Motogas/Lipivecino/ABRIL/2501_Mesa de trabajo 1.png`.
- [I] «Vecinal 4494» (2.º local de Lipiestación) **no** es Lipivecino: es otra calle de Estación Central, presente desde 2023 (`orgánico-nuevo.ai`).
- Métricas: `$R/Workspace/Clientes/Motogas/Métricas/Metricas Lipivecino.pptx` y `Metricas Lipiestacion.pptx` (enero de 2024) son plantillas sin cifras extraíbles en texto. [V] Lipiestación tenía IG, FB y TikTok en el reporte.

---

## 9. Qué es de Lipigas (terceros) y qué es propio del sistema MG

| De Lipigas (no alterar; usar el original) | Propio del sistema Motogas/Efeonce (reutilizable y editable) |
|---|---|
| Logo Lipigas y su arco verde; isotipo corazón; letra «ı» sin punto | Franja «SÓLO EFECTIVO \| RETIRO EN BODEGA \| WhatsApp» |
| Paleta amarillo `#FFD400` / navy `#002989` / degradado verde-azul | Banda CTA megáfono, «¡TENEMOS DSCTOS!» y «PROMO NUEVA» |
| Renders de cilindros con el logo; Yale aluminio | Panel de horario y píldoras de día y hora |
| El corazón como forma de fondo («Elemento») | Barras de precio en píldora; titular «Encuentra los mejores precios aquí» |
| Perro Spike (placa Lipigas) | Pilares: Sabías qué (Komika), Receta del día, Orgullo local (sello y estampilla), Rostros y números, Meme |
| Programa LipiVecino (logo pin) | Objetos 3D de temporada; escenas de efeméride; sub-logo «Lipiestación Central» [I: derivado de Lipigas, conviene confirmar quién lo posee] |

[I] Para el canvas conviene modelar 3 capas: (1) **marco Lipigas fijo** (logo, paleta, cilindros, corazón); (2) **plantilla MG** con slots (franja, logo de cuenta, titular, bloque central, banda CTA); (3) **variables por local** (teléfono, direcciones, sello local, color de panel celeste o lima, precios y vigencia) más un **pack de temporada** (4-6 objetos 3D para las esquinas y un personaje). Antes de exportar, validar las variables del local para no repetir los cruces de §3.
