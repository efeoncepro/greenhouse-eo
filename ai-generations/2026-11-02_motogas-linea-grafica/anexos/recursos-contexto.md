# Motogas: inventario de recursos de producción y contexto de negocio

> Fecha: 2026-11-02 · Alcance: lectura de OneDrive, sin modificar nada · Analista: subagente «recursos + contexto».
> Convención: **[V]** = VERIFICADO (lo leí, rendericé o medí). **[I]** = INFERIDO (deducción mía, sin confirmar).
> Abreviaturas de ruta:
> - `ALI` = `/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/1. Clientes (Interno)/Motogas`
> - `PG` = `ALI/Produccion Grafica`
> - `WS` = `/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Workspace/Clientes/Motogas`
> - `PORT` = `/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/7. Branding & Diseño/03. Portafolio Material/03. Motogas`
> Las vistas previas que generé (PNG con montajes) están en `/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/3f03f28a-b6cb-49fc-b180-4d348f7a352a/scratchpad/motogas/` (`lg-1..4.png` = manual de línea gráfica, `pl_*.png` = plantillas, `dj.png` = refresh Don Julio, `mba.png`, `links_*.png` = íconos 3D, `rep.png` = banco de imágenes, `pago.png`, `pend.png`).

---

## 0. Hallazgo principal: ya existe un mini manual de marca

**[V]** `PG/1. Recursos Graficos/MotoGas-LineaGrafica.ai` (Illustrator 30, 25-11-2025, PDF compatible, 4 mesas de trabajo de 4517×2541 px) es una **ficha por marca**: logo, personaje o elemento, píldora de condiciones de venta, dirección, WhatsApp, marcas que vende, tipografía y paleta. Es la fuente de verdad más reciente y la base natural de los tokens. Páginas: 1 Rey del Gas · 2 Don Julio · 3 Lipigas Recoleta · 4 Lipiestación. **No incluye a Gas Noviciado ni a Lipivecino, y no hay página «Motogas».**

---

## 1. Logos por marca

| Marca | Archivo listo para usar | Formato / tamaño | Fuente vectorial | Variantes |
|---|---|---|---|---|
| **El Rey del Gas (RDG)** | `PG/1. Recursos Graficos/Logos/RDG-Logo-8.png` | PNG 744×272, transparente **[V]** | `WS/SVG/rey-del-gas.svg` (viewBox 1602×414, personaje + logotipo vectorial) **[V]**; `ALI/Archivo/Rey del Gas/VIEJOS/logo.ai`, `ALI/Archivo/Rey del Gas/Nueva Imagen/Viejos/logo.ai` | Solo a color. En el manual aparecen dos lockups: con personaje y solo logotipo «EL REY DEL GAS» (serif negro) **[V]**. Hay PNG antiguos en `ALI/Archivo/Rey del Gas/VIEJOS/` (`Logo ReydelGas PNG.png`, `Logo LETRAS ReydelGas PNG.png`, `Logo GAS ReydelGas PNG.png`, `gafas-rey-02.png`) **[V, contenido sin abrir]** |
| **Gas Don Julio (DJ1, Pudahuel Sur)** | `PG/1. Recursos Graficos/Logos/Logo DJ.png` | PNG 654×389, transparente **[V]** | `ALI/Archivo/Gas Don Julio/Logo/logo-final.ai` (también en `WS/Gas Don Julio/Logo/logo-final.ai`) | A color con contorno rojo y bajada «MULTIMARCAS» **[V]** |
| **Gas 2 Don Julio (DJ2, Quinta Normal)** | `PG/1. Recursos Graficos/Logos/Logo DJ-8.png` | PNG 654×389, transparente **[V]** | `ALI/Archivo/Gas Don Julio/Logo/logo-gas-don-julio-2.ai` | El «2» lleva la bandera de Venezuela **[V]** |
| **Lipiestación Central** | `PG/1. Recursos Graficos/Logos/Lipiestacion Logo.png` | PNG 663×263, transparente **[V]** | No encontré un .ai de logo dedicado **[V, búsqueda por nombre]** | Morado/navy, con el símbolo Lipigas y la bajada «Central» |
| **Lipigas Recoleta** | `PG/1. Recursos Graficos/Logos/Recoletas Logp.png` (sic) | PNG 584×244, transparente **[V]** | `ALI/Archivo/Lipigas Recoleta/ELEMENTOS_LIPIGAS.ai`, `ALI/Archivo/Lipigas Recoleta/avatar.ai` | Logotipo Lipigas con arco verde y la bajada «Recoleta» |
| **Gas Noviciado** (nueva, oct-2025) | No hay un archivo de logo suelto **[V]** | Solo aparece dentro de `PG/4. Impresiones/Pendones/GasNoviciado_Pendon-*.ai/.pdf` | — | — |
| **Lipivecino** | `WS/Cuenta Gas Archivo/Lipivecino/lipivecino_250x140.png`, `avatar.ai` | Material de 2023-2024 | — | Cuenta histórica **[I: absorbida por Lipiestación, local Vecinal 4494]** |

**Logos de proveedores (cilindros):** `WS/Logos de Marcas/logo-lipigas.svg` (Lipigas corporativo, 189×42) **[V]**; `WS/Logos de Marcas/logo.svg` es en realidad **Abastible** (#003594 + símbolo como raster incrustado), con nombre engañoso **[V]**; `WS/Logos de Marcas/logoGasco2024.png` **[V]**.

**Logo paraguas «Motogas»: no existe [V, búsqueda por nombre en todo el árbol + manual].** «Motogas SpA» es la razón social (RUT 77.130.996-8, `admin@motogas.cl`, según `WS/Metodo de pago Primavera 2024/*.png`) **[V]**. «MG» solo funciona como prefijo de archivos (`MG-Plantillas_*`, `MG_Evergreen_*`). La carpeta `PG/2. Grilla Diseño/01. Septiembre/02_Motogas/Motogas_Brand_Assets/` no contiene un logo: son íconos 3D (ver §5).

**Faltan [V]:** versiones blanco/negro/monocromas y SVG de DJ, DJ2, Lipiestación y Recoleta. Los PNG miden menos de 750 px de ancho, lo que no alcanza para impresión ni para pendones.

---

## 2. Paleta por marca

Método: **SVG** = hex leído del código (exacto). **Manual** = muestreé el píxel central de cada muestra del render de `MotoGas-LineaGrafica.ai` con pdftoppm (±2-3 por canal; conviene confirmarlo en Illustrator). El panel de muestras del .ai solo trae los colores por defecto de Illustrator, así que no sirve como fuente **[V]**.

### El Rey del Gas
| Rol | Hex | Fuente |
|---|---|---|
| Rojo personaje / primario | `#FF1B00` | SVG `rey-del-gas.svg` **y** muestra del manual (coinciden) **[V]** |
| Corona / amarillo | `#FFBE00` | SVG **[V]** |
| Degradado cálido | `#FEC600` → `#E55000` | Manual **[V≈]** |
| Ámbar | `#FFAA00` | Manual **[V≈]** |
| Café | `#642900` | Manual **[V≈]** |
| Degradado rojo | `#C11000` → `#FB1A00` | Manual **[V≈]** |
| Logotipo (negro/gris con degradado) | `#1E191A`, `#3F3E40`, `#58595B` | SVG **[V]** |
| Píldora de condiciones | navy oscuro | Manual (sin medir) |

### Gas Don Julio (DJ1/DJ2)
| Rol | Hex | Fuente |
|---|---|---|
| Navy (logotipo, píldora) | `#163459` (píldora `#00346B`) | Manual **[V≈]** |
| Rojo | `#B40904` | Manual **[V≈]** |
| Amarillo verdoso (fondos, burbujas) | `#CEC805`; burbuja de plantilla `#CDC70B` al 80 % de opacidad | Manual **[V≈]** / SVG `PG/6. Plantillas Graficas/Mesa de trabajo 10.svg` **[V]** |
| Oliva | `#A19C09` | Manual **[V≈]** |
| Personaje (cuerpo y sombras) | `#CF1317`, `#E31917`, `#DE0A14`, `#B31918`, `#8F1915`; luces `#E74228`, `#EB5F46`, `#F39C67`; contorno `#111`/`#282828` | SVG `PG/6. Plantillas Graficas/Mesa de trabajo 8.svg` **[V]** |
| Fondo de patrón «?» | `#E3E4E3` | SVG `Mesa de trabajo 1 copia 6.svg` **[V]** |

### Lipigas Recoleta y Lipiestación (misma paleta en el manual)
| Rol | Hex | Fuente |
|---|---|---|
| Navy | `#002989` | Manual **[V≈]** |
| Amarillo | `#FFD400` | Manual **[V≈]** |
| Degradado | `#D2C400` → `#077665` | Manual **[V≈]** |
| Referencia Lipigas corporativo | logotipo `#2E2E82`, amarillo `#FCDB00`, verdes `#D5CD06 #C2C40E #90B025 #428E4A #007369`, azules `#2C3789 #2465AD #1E87C8 #1B9BD8 #1AA3DE` | SVG `WS/Logos de Marcas/logo-lipigas.svg` **[V]** |

Abastible corporativo: `#003594` (SVG) **[V]**.

---

## 3. Tipografías

| Familia | Archivos | Uso |
|---|---|---|
| **Metropolis** (licencia SIL OFL) | `PG/1. Recursos Graficos/Fuentes/Metropolis/`: 18 OTF de Thin a Black, con itálicas, más la licencia **[V]** | RDG: tipografía de texto según el manual **[V]**. Las plantillas usan Metropolis-Black **[V]** |
| **Komika Axis** | `PG/1. Recursos Graficos/Fuentes/KOMIKAX.ttf` (un solo peso) + `ALI/Archivo/Rey del Gas/komika_axis.zip` **[V]** | RDG: display en cómic según el manual. También aparece en títulos de DJ («LA INSTALACIÓN CORRECTA ES LA B», «¿SABÍAS QUE?») **[V]** |
| **Poppins** (OFL) | `PG/1. Recursos Graficos/Fuentes/Poppins/`: 18 TTF de Thin a Black, con itálicas **[V]** | Tipografía oficial de DJ, Recoleta y Lipiestación según el manual; en la práctica, el texto de todas las plantillas (Regular a Black/BlackItalic) **[V, metadatos XMP]** |
| **Metric** (Klim, comercial) | Solo `PG/1. Recursos Graficos/Editables/Grilla Motogas (Historias)_Carpeta/Fonts/Metric-{Semibold,Bold}.otf` **[V]** | Grilla de historias **[V]**. Riesgo de licencia **[I]** |
| Myriad Pro | Referenciada en `MG-Plantillas_Recetas.ai` **[V]** | Parece un residuo **[I]** |

---

## 4. Plantillas y editables

Todas las de `PG/6. Plantillas Graficas/` son **«nueva línea gráfica» (oct-dic 2025)**. Comparten el sistema: **la misma pieza se replica para las 4 marcas** cambiando logo, paleta, píldora de contacto y personaje **[V]**.

| Archivo | Mesas de trabajo | Pieza | Notas |
|---|---|---|---|
| `PG/6. Plantillas Graficas/MG-Plantilla_Historias.ai` (1 MB, 21-10-2025) | 5 × **1080×1920** | Historia «consejo de seguridad» de DJ («La instalación correcta es la B»): personaje grande, patrón «?», burbujas `#CDC70B` | **[V]** render |
| `PG/6. Plantillas Graficas/MG-Plantillas_Storys.ai` (36 MB, 25-11-2025) | 4 × **1080×1920** | Trivia en historias («¿Cuál de estos gases usamos más en casa?» → «El Butano…»), versiones RDG (amarilla y roja) y DJ (gris) | **[V]** |
| `PG/6. Plantillas Graficas/MG-Plantillas_SabiasQue.ai` (12 MB, 11-12-2025) | 4 × **1080×1350** | «¿Sabías qué?» en versión verano (sol con lentes, palmeras), una por marca: DJ, Lipiestación, Recoleta y RDG. CTA «Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!», sello «¡Tenemos dctos!» | **[V]** |
| `PG/6. Plantillas Graficas/MG-Plantillas_SabiasQue3.ai` (16 MB) | 4 × 1080×1350 | Las mismas piezas sin ilustración (base limpia) | **[V]** |
| `PG/6. Plantillas Graficas/MG-Plantillas_SabiasQue2.ai`, `MG-Plantillas_Recetas.ai` (29 MB), `MG-Plantillas_Recetas2.ai` (168 MB) | 1080×1350 | Recetas / «¿Sabías qué?» | **Guardadas sin PDF compatible**: no se pueden previsualizar fuera de Illustrator **[V]**. No abrí Recetas2 por su tamaño |
| `PG/6. Plantillas Graficas/MG-Plantillas_OrgulloLocal.ai` (85 MB, 15-12-2025) | 5 × **1080×1350** | «Orgullo local»: postal con sello por comuna (DJ «Posadas los Pepes», Pudahuel/Quinta Normal; Lipiestación «Así sabe Estación Central», Don Pepe; Recoleta «El Mesón Nerudiano»; RDG «La previa criolla», Lo Prado) + 1 marco vacío | **[V]** |
| Componentes sueltos | `PG/6. Plantillas Graficas/Mesa de trabajo 1 copia 6.svg` (patrón «?» 1080×1920), `PG/6. Plantillas Graficas/Mesa de trabajo 10.svg` (burbuja de diálogo), `PG/6. Plantillas Graficas/Mesa de trabajo 8.svg` (**personaje DJ vectorial, pose «dedo arriba»**), `PG/6. Plantillas Graficas/Marco Postal.png` | Piezas reutilizables | **[V]** |
| `PG/3. Evergreen/OTROS/Nueva Grafica rey del gas/Grafica promos y lista de precios.ai` (46 MB) + `Horarios y ubicacion.ai` (27 MB), del 06-11-2025 | 1080×1350 | Nueva línea de RDG: promos, lista de precios, horario y ubicación | Sin PDF compatible **[V]**. **Hay una copia distinta** (22-10-2025, otros tamaños) en `PG/Archivo/04 Rey del Gas/Nueva línea grafica/` **[V]**: no se sabe cuál es la vigente |
| `PG/3. Evergreen/OTROS/Propuesta grafica Don Julio/Refresch Posts_ENVIO 2.ai` (128 MB, 27-04-2026; v1 `Refresch Posts_ENVIO.ai`) | 5 × 1080×1350 | **Refresh de DJ (lo más reciente)**: «Consulta la mesa de ayuda» (WhatsApp ×2), «Horario comercial», «¿Ya viniste a visitarnos?» con mapa por local, todo en otoño, con el **personaje DJ en 3D** | **[V]**. Exports: `PG/3. Evergreen/OTROS/Propuesta grafica Don Julio/1x/PROPUESTA_DJ01.png`, `PROPUESTA_DJ02.png`, `Fondo.png` |
| Grillas | `PG/1. Recursos Graficos/Editables/MG-Grilla_Agosto.ai`; `PG/1. Recursos Graficos/Editables/Grilla Motogas (Historias)_Carpeta/Grilla Motogas (Historias) 2.ai` (empaquetado con Fonts y Links); `PG/2. Grilla Diseño/01. Septiembre/02_Motogas/2025/Grilla Motogas/Grilla Motogas.ai`, con exports `Exportado/{RDG,DJ,LP,Recoletas}_Post_(dd-mm).jpg` | Grilla mensual multimarca | **[V]**. La convención de nombres del export es útil para la automatización |
| Evergreen por temporada | `PG/3. Evergreen/{01_Fiestas Patrias,02_Halloween,03_Primavera,04_Evergreen Navidad,05_Evergreen Verano,06_Evergreen_Invierno,Temporada de Nieve}/` (V1/V2), más `PG/3. Evergreen/OTROS/MG_Evergreen_Mundial2.ai`, `MG_Evergreen_Otoño+Mundial.ai`, `MG_FIJOS_Otoño-2026 [Recuperado].ai` (2026) | 47 .ai, 148 jpg | **[V]** inventario (no rendericé) |
| Pendones | `PG/4. Impresiones/Pendones/`: `Pendones.ai`, `Lipiestacion_Pendon-Promocion.ai/.pdf`, `Lipiestacion_Pendon-Precios1/2.ai/.pdf` (**75×120 cm**), `DonJulio_Pendon-Promocion.ai/.pdf` (75×120 cm), `GasNoviciado_Pendon-Precios.ai/.pdf` (**100×200 cm**), `GasNoviciado_Pendon-Promocion.ai/.pdf` (**120×75 cm**), `AdaptarARDG_Pendon-Promocion.ai`; presentación `Motogas - Pendones Octubre 2025 (AJUSTES).pdf/.pptx` | Impresos | Medidas convertidas desde los pt de pdfinfo **[V]**. El pendón de precios lista Lipigas/Abastible/Gasco en 5/11/15/45 kg más «Vale» **[V]** |
| Lista de precios | `PG/00. Lista de precios/` (40 PNG, agosto 2026 por marca); antecedentes en `PG/Archivo/0. Lista de precios/` (`Lista Precios (Fiestas Patrias)_Editable`, `Lista Precios Invierno_Carpeta`) | — | Las cubre otro agente |
| Portafolio | `PORT/05. Editables/EO_Portafolio-Motogas.ai`, `PORT/05. Editables/Lamina Video Motogas.aep` (After Effects), `PORT/01. Mockups/*.png` (≈30), `PORT/02. Graficos/banner-cilindros.png` | Material de presentación de Efeonce | **[V]** inventario |

---

## 5. Banco de imágenes y personajes

### Personajes (lo más importante para reutilizar)
| Personaje | Recorte reutilizable | Estado |
|---|---|---|
| **«Rey» de RDG**: cilindro rojo con corona y lentes de sol, guantes blancos (2D cartoon) | **Solo como vector dentro de `WS/SVG/rey-del-gas.svg`** (una pose, junto al logotipo) **[V]**. Las plantillas lo muestran en ≥3 poses (abrazando un cilindro Lipigas, de cuerpo entero, saludando) **incrustadas en los .ai** **[V render]** | **No hay una biblioteca PNG de poses de RDG [V, búsqueda por nombre]**. Habría que exportarlas desde los .ai o reconstruirlas |
| **Personaje DJ 2D**: cilindro rojo plano con brazos y piernas de trazo | El manual muestra 5 poses (dudando con papel, llave inglesa, dedo arriba con logo, teléfono, corriendo) **[V]**. Recortes sueltos: `PG/6. Plantillas Graficas/Mesa de trabajo 8.svg` (vector, dedo arriba) y `PG/3. Evergreen/OTROS/Propuesta grafica Don Julio/Personaje Don Julio.png` (PNG transparente, pose «dudando») **[V]** | Parcial. **[I]** Su origen probable son vectores stock de Freepik: `ALI/Archivo/Gas Don Julio/Recursos/*cilindro-gas*mascota*.zip` (≈9 sets: profesión, pirata, vaquero, tecnología, etc.). Hay que revisar la licencia y la exclusividad |
| **Personaje DJ 3D** (refresh 2026) | `PG/3. Evergreen/OTROS/Propuesta grafica Don Julio/freepik__talk__21861.png`: **PNG transparente**, pose con llave inglesa y teléfono, alta calidad **[V]** | Es el mejor activo para generar poses nuevas por IA. Nombre «freepik__talk» **[I: generado o editado con Freepik AI]** |
| Bases de historias DJ | `WS/Gas Don Julio/BASE DE HISTORIAS/{ROJO,AMARILLO}{,_LOGO,_MASCOTA}.png`: fondos 1080×1920 opacos con patrón y mascota pequeña **[V]** | Fondos, no recortes |
| Lipigas Recoleta / Lipiestación | No tienen personaje: usan el **«Elemento»**, el símbolo Lipigas en degradado amarillo-azul-verde **[V manual]** | El vector debería estar en `ALI/Archivo/Lipigas Recoleta/ELEMENTOS_LIPIGAS.ai` **[I]** |
| «Spike» (perro mascota de Lipigas corporativo) | `ALI/Archivo/Lipigas Recoleta/Aislados/spike.png` (recorte) **[V]** | Es propiedad de Lipigas, no del cliente. Usarlo solo con autorización **[I]** |

### Cilindros (recortes con transparencia **[V]**)
`PG/1. Recursos Graficos/Imagenes/`: `Cilindro_15kg.png` (Abastible 45 kg alto, 951×1000), `Cilindro_5kg.png` (Abastible, 1419×2000), `gas777-15kg-catalitico.png` (Abastible 15 kg, 1875×1875), `Lipigas Cilindro.png` (906×1350), `45kilos-catalitico-500.png` (familia Lipigas, 500×500), `banner-cilindros.png` (Gasco, 720×560). Y además `ALI/Archivo/Lipigas Recoleta/Aislados/{ALUMINIO.png, cilindro_transparente.png (Lipigas «lámpara»), lipi45.png, banner-cilindros.png}`. **Ojo:** los nombres no corresponden al contenido (por ejemplo, «Cilindro_15kg» es un Abastible de 45 kg) **[V]**.

### Fotografía
- `PG/7. Banco de Imagenes/repartidor{,2..7}.png`: 7 imágenes de 1516×1932, **fotorrealistas y opacas (no recortadas)** **[V]**. Personas en la vereda de un barrio cargando o arrastrando cilindros Lipigas (amarillo), Gasco (blanco) y Abastible (naranjo) en un carro, más un repartidor uniformado de rojo. **[I]** Son generadas con IA (abr-2026). **Conflicto:** RDG, Recoleta y Lipiestación declaran «retiro en bodega, sin despacho», así que el repartidor no debe usarse con esas marcas.
- `PG/4. Graficos para Promo/{1..4}.png`: escenas fotorrealistas de Fiestas Patrias (fonda, cocina, parrilla), opacas **[V]**.
- `PG/2. Grilla Diseño/01. Septiembre/02_Motogas/Motogas_Photography/`: **carpeta vacía** **[V]**.

### Íconos e ilustración 3D tipo «clay» (recortes PNG transparentes **[V]**)
- `PG/2. Grilla Diseño/01. Septiembre/02_Motogas/Motogas_Brand_Assets/`: 15 PNG (poncho, chamanto, chupalla, empanada, cilindro Lipigas con poncho y chupalla, parque «+7 hectáreas», observatorio, mausoleo y otros hitos comunales).
- `PG/2. Grilla Diseño/04. DIciembre/1-NAVIDAD/MG_FIJOS_NAVIDAD_2025/MG_FIJOS_NAVIDAD_2025/Links/`: viejito pascuero veraniego en 7 poses (surf, ukelele, maleta, tumbado), regalos, bota, ojotas, flotador y castillo de arena.
- `PG/2. Grilla Diseño/04. DIciembre/3- GRILLA/MG_GRILLA_DICIEMBRE_Carpeta 0/MG_GRILLA_DICIEMBRE_Carpeta 0/Links/` y `.../MG_CARRUSEL_RECETA_Carpeta/MG_CARRUSEL_RECETA_Carpeta/Links/`: familias cocinando, pavo, horno, niños jugando, árbol de Navidad y comida (nombres «ChatGPT Image 27/28 nov 2025» **[V]**: generados con IA).

Volumen del histórico **[V]**: `PG/2. Grilla Diseño` (628 png, 402 jpg, 36 mp4, 25 ai, por mes de septiembre a agosto), `PG/Archivo` (425 png, 34 mp4), `PG/2. Seasonalitys-Efemerides` (64 jpg, referencias por efeméride).

---

## 6. Contexto de negocio

### Qué es Motogas
**[V]** Motogas SpA (RUT 77.130.996-8, `admin@motogas.cl`) opera **locales independientes de venta de gas licuado en cilindros con retiro en bodega**, cada uno con su propia marca de fachada y sus propias redes. **[V, SAC de RDG]** No hace despacho a domicilio ni vende en camión, no vende envases, no hace canje de formato y no acepta cupones. Su promesa central es el **precio más bajo** y, en las multimarca, «todas las marcas en un solo lugar». Es la subcuenta del portafolio de Efeonce que el plan de paid llama «Cuentas Gas».

### Locales y marcas (desde el manual de nov-2025, salvo que se indique otra fuente)
| Marca | Local(es) | WhatsApp | Marcas de gas | Fuente |
|---|---|---|---|---|
| El Rey del Gas | Av. Neptuno 934, **Lo Prado** | +56 9 5460 6758 | Abastible, Gasco, Lipigas (multimarca). Formatos 5/11/15 kg, **no vende 45 kg** | Manual + SAC **[V]** |
| Gas Don Julio (1) | Los Mares 7503, **Pudahuel Sur** | +56 9 7255 5023 | Multimarca (Abastible, Gasco, Lipigas) | Manual **[V]** |
| Gas 2 Don Julio | Av. María Rozas Velásquez 475, **Quinta Normal** | +56 9 3104 6901 | Multimarca | Manual **[V]** |
| Lipigas Recoleta | Perú 1337, Santiago (**Recoleta**) | +56 9 8247 7870 | Solo Lipigas | Manual **[V]** |
| Lipiestación Central | 5 de Abril 4021 y Vecinal 4494, **Estación Central** | +56 9 8640 9812 (en 2024, Vecinal tenía +56 9 7782 2525) | Solo Lipigas | Manual + medios de pago 2024 **[V]** |
| Gas Noviciado | Sin dirección en el material **[V]** | — | Lipigas/Abastible/Gasco, 5-45 kg (según el pendón de precios) | Pendones oct-2025 **[V]**. **[I]** Está en el sector Noviciado (Pudahuel/Lampa) |
| Lipivecino | **[I]** Era el local Vecinal 4494 de Estación Central | — | Lipigas | No aparece en Metas 2025 ni en el manual **[V]** → **[I]** retirada o fusionada |

**Horario [V]** (SAC de RDG y refresh de DJ): de lunes a sábado de 10:00 a 20:00; domingos y festivos de 10:00 a 15:00, en horario continuado.

### Medios de pago (hay contradicción)
- 2025-2026, manual y todas las plantillas: **«SÓLO EFECTIVO | RETIRO EN BODEGA»** **[V]**.
- SAC de RDG (sin fecha): «solo efectivo y transferencia» **[V]**.
- Primavera 2024 (`WS/Metodo de pago Primavera 2024/*.png`): piezas de **transferencia** con cuentas a nombre de Motogas SpA en Banco de Chile, Santander y BCI, y correos `admin@motogas.cl`, `gasdonjulio1@gmail.com`, `lipirecoleta1@gmail.com` **[V]**. Hay nombres de archivo errados («Velazques» muestra 5 de Abril 4021; «Lipiestacion Recoleta» es Lipigas Recoleta) **[V]**.
- **Hay que confirmar con el cliente si hoy aceptan transferencia.** Redcompra no se acepta (SAC) **[V]**.

### Paid media (`ALI/Paid Media/Plan Paid Media - Cuentas Gas .docx` **[V]**)
- **Objetivos:** alcance en la zona del local, interacción (comentarios, reacciones, mensajes directos), crecimiento de seguidores e impulso a la compra con precio bajo, promociones y variedad de marcas.
- **Público:** de 25 a 55 años, hombres y mujeres, en las localidades de cada punto de venta. Intereses: ahorro en el hogar, compras para la casa, promociones de supermercado. Psicografía: buscan la mejor relación precio-calidad, son familias preocupadas por la economía y valoran la rapidez.
- **Embudo:** TOFU, video animado de 10-15 s «Los precios más bajos en gas» con los 3 cilindros juntos («Calidad, economía y todas las marcas en un solo lugar»), segmentado a lookalike 1 %. MOFU, imagen de **lista de precios** («¡Siempre con los mejores precios en Santiago!»), con retargeting a quienes vieron ≥50 % del video. BOFU, dos campañas: «Oferta especial 15 kg Lipigas» con sticker «OFERTA EXCLUSIVA / PROMO LIMITADA», y «El mejor gas para tu hogar» con los 3 cilindros.
- **KPIs:** TOFU, vistas completas, impresiones y frecuencia. MOFU, comentarios, mensajes directos, likes y clics en las listas. BOFU, ventas, visitas al local y clics. Existe un tablero en Looker Studio, cuya URL está en el docx.
- **Canales:** Facebook e Instagram (los reportes miden solo esas dos redes). Las plantillas de métricas en `WS/Métricas/*.pptx` incluyen LinkedIn y TikTok, pero están vacías (solo títulos) **[V]**. **WhatsApp** es el canal de contacto en todas las piezas **[V]**. La estrategia de RDG de 2023 (`ALI/Archivo/Rey del Gas/2023/Estrategia y Copys/Nueva Estrategia de Contenido El Rey del Gas.pdf`) define pilares: cocina (2 por semana), personalidad, ofertas (1 por semana), seguridad (cada 15 días), clientes felices y contacto/ubicación, con hashtags como #CocinaConElRey y #OfertasElReyDelGas **[V]**.

**Metas (`ALI/Paid Media/Metas Cuentas Gas.xlsx` **[V]**).** Por cuenta: línea base de diciembre → meta de enero → real de enero / real de febrero. **[I]** Corresponde al periodo dic-2024 a feb-2025.
| Cuenta | IG alcance | IG eng. % | IG seguidores | FB eng. % | FB seguidores |
|---|---|---|---|---|---|
| RDG | 437→500 · 3.361/1.531 | 4,07→4,1 · 2,38/1,15 | 3.222→3.300 · 3.320/3.382 | 4,5→4,8 · 1,94/1,42 | 11.776→12.000 · 11.785/11.802 |
| Don Julio | 401→450 · 2.566/885 | 4,93→5,0 · 1,62/2,07 | 199→199 · 319/387 | 11,11→11,2 · 4,64/4,19 | 549→570 · 552/558 |
| Lipiestación | 438→500 · 3.218/1.736 | 2,38→3,0 · 1,34/1,84 | 122→250 · 277/395 | 7,72→8,0 · 1,08/0,41 | 574→600 · 575/577 |
| Lipirecoleta | 305→400 · 3.304/1.636 | 2,45→3,0 · 1,52/2,11 | 48→55 · 122/182 | 16,61→16 · 1,83/0,87 | 76→80 · 78/85 |

La planilla tiene valores atípicos que parecen errores de digitación: «me gusta» de FB de RDG en enero = 77.453 e impresiones de FB de Lipiestación en febrero = 462.772 **[V dato; I error]**. Lectura: el paid multiplica el alcance, pero el **engagement cae bajo la meta en todas las cuentas** **[V]**.

**Reporte jul-ago (`ALI/Paid Media/REPORTE MOTOGAS JULIO - AGOSTO.pptx`, 21 láminas **[V]**; [I] 2025):**
| Cuenta | Seguidores (FB / IG) | Impresiones | Publicaciones |
|---|---|---|---|
| RDG | 15,53 mil (11,95 mil / 3,58 mil) | 129,7 mil | 156 |
| Don Julio | 1.003 (563 / 440) | 14,43 mil | 175 |
| Lipiestación | 1.058 (580 / 478) | 10,65 mil | 174 |
| Lipirecoleta | 346 (100 / 246) | 7.192 | 149 |

Lo que funcionó: contenido **estacional y emocional** («¡Llegó el invierno! Pero que no te pille desprevenido», 36 mil impresiones y 1,7 mil interacciones en RDG) y el **humor local** («Tu compa: “Pucha, justo ayer cargué…”»). Las listas de precios y los mensajes de ubicación (Quinta Normal, Pudahuel) sostienen la interacción. Recomendaciones del reporte: más reels, carruseles y encuestas; CTAs locales («¿en qué comuna estás?»); tips de seguridad y ahorro; calendarizar invierno, feriados y Fiestas Patrias; potenciar Instagram, que concentra ~70-80 % de las impresiones en las cuentas chicas.

### Tono y copy
**[V]** Tuteo amistoso y chileno coloquial («Pucha», «¡Te atenderemos con una sonrisa!», «Corre a ver nuestros precios bajos y ¡APROVECHA AHORA!», «¡Tenemos dctos!», «¿Ya viniste a visitarnos?», «¡Estamos trabajando para ti!»). RDG se define como «alegre y divertido». Las piezas se apoyan en orgullo de barrio y comuna (serie Orgullo Local).

**Claves del SAC para el copy [V]** (`WS/SAC/Preguntas Rey del Gas.docx`, 15 preguntas):
- No hay despacho ni costo extra.
- Ante «¿por qué en mi comuna es más caro?»: cada distribuidor fija su precio.
- Ante «¿es publicidad falsa?»: es un local establecido que paga patentes e impuestos; se invita a ir.
- WhatsApp sirve para consultas, no para pedidos.
- No venden envase, no hacen canje y no aceptan cupones.
- Hay balanza para pesar el cilindro en el local.
- Ante una fuga, se deriva al técnico de la marca.

Hay FAQs gráficas en `WS/FAQ'S/CARRUSEL 1..15/` (30 PNG) **[V inventario]**.

---

## 7. Faltantes, desorden y riesgos para automatizar

1. **No hay identidad paraguas Motogas** (ni logo ni página en el manual) **[V]**. Hay que decidir si el sistema es «Motogas → 4-5 marcas» con tokens compartidos más overrides por marca, que es lo que ya hacen las plantillas **[I recomendado]**.
2. **Gas Noviciado no está en el manual**: no tiene logo suelto, paleta ni dirección **[V]**. Lipivecino tiene un estado ambiguo **[I]**.
3. **Logos solo en PNG de baja resolución** (<750 px) y sin versiones mono/blanco/negro. Los vectores están dispersos en `Archivo/` o «VIEJOS», y no hay un SVG de DJ, Lipiestación ni Recoleta **[V]**.
4. **Los hex del manual son muestras del render, no definiciones**: el panel de muestras del .ai está vacío de colores de marca **[V]**. Hay que confirmarlos en Illustrator antes de fijar los tokens.
5. **No existe una biblioteca de poses en PNG del personaje de RDG**. Las poses viven incrustadas en .ai de 30-170 MB **[V]**. El DJ 2D tiene 1 SVG y 1 PNG; el DJ 3D, 1 PNG. **Es el principal cuello de botella para producir piezas automáticamente.**
6. **Varios .ai están guardados sin PDF compatible** (Recetas, Recetas2, SabiasQue2, Nueva Gráfica RDG): no se pueden leer ni rasterizar fuera de Illustrator **[V]**.
7. **Versiones duplicadas o divergentes** de la nueva línea de RDG (`PG/3. Evergreen/OTROS/Nueva Grafica rey del gas/` del 06-11 frente a `PG/Archivo/04 Rey del Gas/Nueva línea grafica/` del 22-10), y la carpeta `PG/1. Recursos Graficos/Editables/Nueva linea grafica/Rey del gas/` está **vacía** **[V]**.
8. **Nombres de archivo engañosos**: `logo.svg` = Abastible, `Cilindro_15kg.png` = Abastible de 45 kg, `Recoletas Logp.png`, métodos de pago con el local cruzado, `[Recuperado].ai` **[V]**.
9. **Datos operativos inconsistentes o vencidos**: los medios de pago (solo efectivo, o efectivo y transferencia), el WhatsApp de Lipiestación Vecinal y las cuentas bancarias de 2024 **[V]**. Para automatizar conviene un **registro por local** (dirección, WhatsApp, horario, marcas, formatos, medios de pago) como dato y no como texto horneado en el .ai.
10. **Licencias**: Metric (Klim) está empaquetada; los vectores de mascota DJ vienen de stock Freepik; Spike es de Lipigas; las imágenes fueron generadas con ChatGPT o Freepik. Y el fotorrealismo del «repartidor» contradice el «sin despacho» **[V hechos; I riesgo]**.
11. **Fuentes de color de terceros**: las marcas mono-Lipigas (Recoleta, Lipiestación) dependen de la identidad corporativa Lipigas. Hay que confirmar qué uso tienen permitido **[I]**.
12. Las métricas solo existen en PPTX/PDF con tablas en imagen, y las plantillas de `WS/Métricas` están vacías. La fuente viva es Looker Studio **[V]**.
13. `Motogas_Photography/` está vacía y el banco de imágenes tiene 7 fotos sin recortar **[V]**.
