# ARMOR EPP / Indecaucho — investigación profunda para piloto de performance B2B

Fecha de corte: **27/10/2026** (todas las fuentes se consultaron ese día salvo que se indique otra fecha).
Preparado para: propuesta de piloto de 90 días con LinkedIn Ads y Google Ads (Compras y SSO; Perú, Ecuador y Colombia).
Extiende y corrige los informes del 26/10:
[`2026-10-26-brand-market-research.md`](../2026-10-26-brand-market-research.md) y
[`2026-10-26-digital-demand-audit.md`](../2026-10-26-digital-demand-audit.md). Lo que ya está allí no se repite;
aquí se suma lo nuevo y se marcan las correcciones.

## Método, cobertura y límites

- **Método.** Lectura directa de fuentes públicas: código fuente HTML de `armorepps.com` (las 45 URLs de su
  sitemap), `indecaucho.ec` (10 URLs), sitios de marcas hermanas (`productosmaster.com`,
  `productosmasterprofessional.com`, `fantape.ec`) y del grupo (`amcecuador.com`); los 55 PDF enlazados desde
  ARMOR (fichas y certificados), con extracción de texto; páginas públicas de LinkedIn de ARMOR, Indecaucho y
  Dánamo Colombia; LinkedIn Ad Library; Google Ads Transparency Center; agregadores de comercio exterior
  (ImportGenius, sólo la vista gratuita); estados financieros de Indecaucho publicados en un espejo de la
  Superintendencia de Compañías; catálogos de distribuidores y retail en Ecuador, Colombia y Perú; prensa.
- **Etiquetas.** **HECHO VERIFICADO**: lo vi en la fuente enlazada en la fecha de corte; no certifica que la
  realidad comercial o técnica coincida con lo publicado. **INFERENCIA**: interpretación propia, con su
  razonamiento; requiere validación con ARMOR. **NO ENCONTRADO**: búsqueda hecha sin resultado; no prueba ausencia.
- **No se hizo:** contacto con personas, envío de mensajes de WhatsApp o formularios, enriquecimiento pagado,
  escritura en HubSpot u otra plataforma, ni commit. Tampoco se probó el chat de WhatsApp (el selector de
  país que menciona el encargo no es visible en el sitio: aparece después de abrir la conversación, si existe).
- **Límites.** Sin acceso a GA4, Kommo, Search Console, cuentas publicitarias ni datos internos. La LinkedIn
  Ad Library no muestra fechas ni impresiones fuera de la UE. ImportGenius sólo muestra los 5 envíos más
  recientes. No hay estados financieros públicos de Indecaucho posteriores a 2019 en las fuentes consultadas.
  No se verificaron los certificados en los registros de los organismos emisores (Apave, NIOSH, Intertek).
  Nada de esto es asesoría técnica de EPP ni asesoría legal.

## Resumen: lo que cambia respecto del 26/10

| # | Hallazgo | Estado | Corrige / extiende |
| --- | --- | --- | --- |
| 1 | **Todos los certificados UE de protección respiratoria publicados en el sitio están vencidos** (máscaras 602, 705, F680/F690 y 9 filtros: 13 certificados; vencimientos entre 25/06/2026 y 22/10/2026) | HECHO VERIFICADO (fechas en los PDF); renovación desconocida | Nuevo. El 26/10 no se pudo leer el certificado F680 (HTTP 406) |
| 2 | ARMOR **sí pautó en LinkedIn**: 2 anuncios en la biblioteca, pagados por Indecaucho | HECHO VERIFICADO | Corrige «LinkedIn 100 % orgánico» del encargo y completa el pendiente del audit del 26/10 |
| 3 | **Cero anuncios de Google** para `armorepps.com`, `productosmaster.com` y `fantape.ec` | HECHO VERIFICADO (con prueba de control) | Nuevo |
| 4 | Medición: sólo **GA4 vía Site Kit** (`G-JQEMTBJ442`). Sin GTM, sin etiqueta de Google Ads, sin LinkedIn Insight Tag, sin píxel de Meta, sin banner de consentimiento | HECHO VERIFICADO | Corrige «metadatos no recuperables» del 26/10 |
| 5 | Grupo empresarial: **Grupo AMC** (Indecaucho + AMC Ecuador + Dánamo Colombia) | HECHO VERIFICADO (Dánamo) + INFERENCIA (perímetro exacto) | Nuevo |
| 6 | La nomenclatura de ARMOR **replica la de 3M** casi código por código | INFERENCIA fuerte | Nuevo; define keywords y riesgos |
| 7 | **Productos ARMOR ya se venden en Perú** por al menos tres revendedores; Indecaucho ya exporta a Perú | HECHO VERIFICADO (listados) | Matiza «entrar a Perú en 2027» |
| 8 | Los N95 desechables son **marca privada** de un fabricante chino aprobado por NIOSH | HECHO VERIFICADO (carta NIOSH publicada por ARMOR) | Nuevo; tensión con su anuncio «no somos un catálogo de terceros» |
| 9 | Las cuatro marcas son Master, Master Professional, **Fantape** (cintas) y ARMOR | HECHO VERIFICADO | Resuelve «Fantech/fantasía» de la transcripción |
| 10 | La palabra «armor» es **ambigua en búsqueda** (botines dieléctricos ARMOR en retail, guantes Milwaukee Armor, blindajes Armor International) | HECHO VERIFICADO (colisiones) + INFERENCIA (impacto) | Nuevo |

---

## 1. Empresa

### 1.1 Razones sociales y grupo

| Dato | Estado | Fuente |
| --- | --- | --- |
| **INDECAUCHO CÍA. LTDA.**, expediente Superintendencia **17324**, RUC **1090077887001** (el prefijo 10 corresponde a Imbabura); constituida por resolución del **06/10/1986** | HECHO VERIFICADO | [Nómina de accionistas 2019 (espejo SuperCías)](https://ecuadorpapers.org/ocr/17324%20INDECAUCHO%20C%20LTDA/economica/); [Quiénes somos](https://indecaucho.ec/quienes-somos/) |
| Accionistas 2019: seis personas naturales de nacionalidad ecuatoriana; una concentra la mayoría del capital declarado | HECHO VERIFICADO (no se transcriben nombres por minimización) | Nómina de accionistas 2019, mismo espejo |
| **ARMOR S.C.C.**, Calderón, Quito: figura como **fabricante** en los certificados UE de 2021 de máscaras y filtros | HECHO VERIFICADO | [Certificado F680](https://armorepps.com/wp-content/uploads/2025/06/CertificadoF680.pdf), [Certificado 701](https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-701.pdf) |
| ARMOR S.C.C. aparece como exportador hacia Dánamo Colombia hasta **22/04/2022**; desde entonces el embarcador de producto ARMOR es **Indecaucho** (último envío visible 23/07/2026: filtro AR-206) | HECHO VERIFICADO (vista gratuita de agregador) | [ImportGenius: Dánamo Colombia](https://es.importgenius.com/ecuador/buyers/danamo-colombia-sas) |
| Los certificados de guantes 2025–2026 (AR310, AR320, AR370, AR380, AR410, AR420) nombran como fabricante a **Indecaucho Cía. Ltda.** | HECHO VERIFICADO | PDFs enlazados en [Protección de manos](https://armorepps.com/proteccion-de-manos/) |
| La política de privacidad de ARMOR se titula a nombre de «Indecaucho ARMOR» | HECHO VERIFICADO | [Política de privacidad ARMOR](https://armorepps.com/politica-de-privacidad-de-datos/) |
| **INFERENCIA:** ARMOR nació como sociedad/marca aparte (ARMOR S.C.C., ~2019, «7+ años» según su home) y fue integrada operativamente a Indecaucho entre 2022 y 2025. Los certificados respiratorios siguen a nombre de ARMOR S.C.C.; su renovación podría exigir actualizar el titular. | INFERENCIA | Cruce de las filas anteriores |
| **Dánamo Colombia S.A.S.**: «Compañía multinacional de capital ecuatoriano que pertenece al **Grupo AMC** … llega al país a distribuir las marcas de las empresas del grupo como ARMOR EPPS, MASTER entre otras». Fundada en 2021, Bogotá (Cl. 99 #10-57, piso 6), 11–50 empleados (rango LinkedIn), 294 seguidores. Su segunda sede declarada es la dirección de Indecaucho en Quito | HECHO VERIFICADO | [LinkedIn Dánamo](https://www.linkedin.com/company/danamo-colombia-s-a-s) |
| `danamocolombia.com` muestra una página «Coming Soon» (sin sitio operativo) | HECHO VERIFICADO | [danamocolombia.com](http://www.danamocolombia.com/) |
| **AMC Ecuador**: distribuidor de insumos industriales «desde 1989» (empaque, EPP, herramientas), ~10.000 clientes y 45 marcas aliadas (contadores de su home), certificación BASC; vende Master y ARMOR. Las vacantes de Dánamo e Indecaucho reciben postulaciones en correos `@amcecuador.com` | HECHO VERIFICADO (autodeclaración en cifras) | [amcecuador.com](https://amcecuador.com/); [AMC — respiratoria reutilizable](https://amcecuador.com/categoria-producto/equipos-de-proteccion-personal/proteccion-respiratoria-reutilizable/) |
| **INFERENCIA:** Grupo AMC es el paraguas de Indecaucho (fabricante), AMC Ecuador (distribuidor propio en Ecuador) y Dánamo (distribuidor propio en Colombia). No se encontró un documento societario que lo pruebe; lo sostienen los correos compartidos, la dirección compartida y la declaración de Dánamo. | INFERENCIA | — |

### 1.2 Tamaño

| Dato | Estado | Fuente |
| --- | --- | --- |
| Ventas **USD 13,02 millones (2019)** y 13,49 millones (2018); utilidad del año USD 353 mil (2019) | HECHO VERIFICADO (estados financieros auditados 2019; dato antiguo) | [Auditoría externa 2019, espejo SuperCías](https://ecuadorpapers.org/ocr/17324%20INDECAUCHO%20C%20LTDA/economica/) |
| No se encontraron ventas 2020–2025 ni presencia en rankings EKOS/Vistazo en las búsquedas hechas | NO ENCONTRADO | Búsquedas web 27/10 |
| «250+ colaboradores» (página de empleo); LinkedIn Indecaucho: 201–500 empleados, 165 miembros vinculados, 4.314 seguidores | HECHO VERIFICADO (autodeclaración) | [Únete a nuestro equipo](https://indecaucho.ec/contactenos/unete-a-nuestro-equipo/); [LinkedIn Indecaucho](https://www.linkedin.com/company/indecaucho-ecuador) |
| La página de LinkedIn de ARMOR declara también 201–500 empleados (rango del grupo) pero sólo 10 personas vinculadas | HECHO VERIFICADO | [LinkedIn ARMOR](https://www.linkedin.com/company/armorepps) |
| Capacidad: la planta de Cayambe produce **1,2 millones de pares de guantes de látex al mes** (Freddy Jibaja, gerente, julio 2024) | HECHO VERIFICADO (prensa) | [Vistazo, 24/07/2024](https://www.vistazo.com/portafolio/provincias/2024-07-24-pichincha-provincia-desarrolla-alternativas-productivas-GC8444899) |
| Plantas: planta original en Imbabura (llegó a su límite); planta de Cayambe inaugurada en 2016, 65.000 m²; 600 ha de plantaciones de caucho | HECHO VERIFICADO (autodeclaración + prensa) | [Home Indecaucho](https://indecaucho.ec/); [Quiénes somos](https://indecaucho.ec/quienes-somos/); Vistazo |
| Indecaucho se declara **Empresa B Certificada** (anuncio 13/08/2026; entrega oficial 09/09/2026) y publicó su **primera Memoria de Sostenibilidad** (18/09/2026); ISO 9001:2015 | HECHO VERIFICADO (autodeclaración; no se pudo abrir el directorio de B Lab, HTTP 403) | [LinkedIn Indecaucho](https://www.linkedin.com/company/indecaucho-ecuador); [Certificaciones](https://indecaucho.ec/certificaciones/) |

**Equipo gerencial publicado** (cargos, sólo lo relevante para la cuenta): gerente general Freddy Jibaja;
**Miguel González, Gerente Negocio Industria**; Joel Arce Montoya, Gerente Negocio Consumo y Ferretero; Sandra
Ortiz, Gerente de Proyectos IT (transformación digital). [Equipo gerencial](https://indecaucho.ec/equipo-gerencial/).
HECHO VERIFICADO. **INFERENCIA:** la división Industria (ARMOR y, probablemente, Master Professional) responde a
Miguel González; IT tiene un rol de transformación digital que podría ser interlocutor para tags, CRM y medición.

### 1.3 Marcas: las cuatro, resueltas

| Marca | Qué es | Negocio | Sitio y medición visible |
| --- | --- | --- | --- |
| **Master** | Guantes domésticos, de examinación y multiuso; limpieza (Master Green, lavavajillas, desengrasantes) | Consumo | [productosmaster.com](https://productosmaster.com/): GA4 `G-88S0J4YG04` |
| **Master Professional** | Guantes industriales (línea industrial y línea revestidos) | Industria (INFERENCIA) | [productosmasterprofessional.com](https://productosmasterprofessional.com/): Google tag `GT-WF83D659` |
| **Fantape** | Cintas adhesivas (oficina, montaje, señalización, mantenimiento); menú Consumo e Industria | Consumo / ferretero | [fantape.ec](https://fantape.ec/): GTM, dos GA4 y **etiqueta de Google Ads `AW-11248743492`**; sin anuncios en Transparency Center |
| **ARMOR EPP** | EPP: respiratoria reutilizable y desechable, auditiva, visual, manos, corporal | Industria | [armorepps.com](https://armorepps.com/): ver §4 |

HECHO VERIFICADO: [Nuestras marcas](https://indecaucho.ec/nuestras-marcas/) titula «Tres marcas» (Master, ARMOR
EPP y Master Professional) y abajo agrega Fantape; Fantape tiene sitio propio enlazado. **La «Fantech/fantasía»
de la transcripción es Fantape** (la investigación del 26/10 ya lo listaba). INFERENCIA: la división entre
consumo e industria no es por marca pura: Fantape aparece en ambos menús y Master Professional compite en
guantes industriales con la familia de manos de ARMOR, lo que puede generar canibalización de keywords.

---

## 2. Portafolio ARMOR

### 2.1 Inventario público (sitemap al 27/10)

44 páginas indexables: 6 familias + 34 fichas de producto + institucionales. HECHO VERIFICADO
([sitemap](https://armorepps.com/page-sitemap.xml)). Última actualización relevante: AR410, AR420 y
categoría manos (25/09/2026); máscara 602 y guantes AR310/AR370 (01/09/2026); filtro 70923 (27/05/2026);
F680/F690 e inserto óptico (21/04/2026). El **blog está vacío** («Nothing Found»).

| Familia | Referencias publicadas |
| --- | --- |
| Respiratoria reutilizable — máscaras | **F680 (M) / F690 (L) cara completa** en silicona; **705** media cara de silicona (S/M/L); **602** media cara TPR (S/M/L) |
| Respiratoria reutilizable — filtros | 701 (VO, A1), 703 (VO/GA, A1E1), 704 (amoníaco, K1), 706 (multigás, ABEK1), 793 (P3 R), 793-C (P3 R + carbón), 206 (P3 R + gases ácidos niveles molestos), 207 (P3 R + VO niveles molestos), 70923 (A1E1 P3 R D), 70926 (ABEK1 P3 R D) |
| Respiratoria reutilizable — accesorios | Prefiltro 7N11, retenedor 510, adaptador 520, inserto óptico para F680/F690 (AR10211311), repuestos por SKU (arneses, válvulas, visores, copa nasal) |
| Respiratoria desechable | AR-1058 N95 (copa), AR-1040 plegable N95, AR-1041V plegable con válvula |
| Manos | AR310 Grip Guard, Agroindustrial, AR320 MaxShield, AR370 ProFlex, AR380 UltraFlex, **AR410 CutGuard One (corte D)**, **AR420 CutGuard Max (corte E)** |
| Auditiva, visual, corporal | Tapones 38 dB con/sin cordón; lentes Combat AR-10 gris/transparente, monogafas Combat y Super; traje AR-110 |

Fuentes: páginas de categoría y producto en [armorepps.com](https://armorepps.com/productos/). HECHO VERIFICADO.

### 2.2 Foco respiratorio: certificación, compatibilidad y vigencia

| Modelo | Norma declarada | Certificado publicado (organismo, N.º) | Emitido | **Vence** | Factor de protección (ficha) |
| --- | --- | --- | --- | --- | --- |
| F680 / F690 cara completa | EN 136:1998 CL2 | Apave Sudeurope (OC 0082), 0082/3902/079/09/21/0584 y 0585 | 07/09/2021 | **07/09/2026** | FP 50 |
| 705 media cara silicona | EN 140:1998 | Apave 0082, …/10/21/0664 | 22/10/2021 | **22/10/2026** | FP 10 |
| 602 media cara | EN 140:1998 | Apave 0082, …/10/21/0662 | 21/10/2021 | **21/10/2026** | FP 10 |
| Filtros 701, 703, 706 | EN 14387 | Apave 0082, …/06/21/0428, 0427, 0426 | 09/07/2021 | **09/07/2026** | — |
| Filtros 70923, 70926 | EN 14387 (+P3 R D) | Apave 0082, …/07/21/0466 y 0467 | 07/2021 | **09/07/2026** | — |
| Filtros 793, 793-C | EN 143 | Apave 0082, …/06/21/0440 y 0439 | 25/06/2021 | **25/06/2026** | — |
| Filtros 206, 207 | EN 143 / EN 14387 | Apave 0082, …/07/21/0514 y 0515 | 03/08/2021 | **03/08/2026** | — |
| Filtro 704 | EN 14387 (declarado) | **sin certificado enlazado** | — | — | — |
| AR-1040, AR-1041V, AR-1058 | NIOSH 42 CFR 84, N95 | Carta NIOSH de extensión de aprobación a marca privada (TC-84A-7861/7862 y 7863/7866) | 09/04/2020 | (las aprobaciones NIOSH no vencen; su vigencia no se verificó en el registro) | — |

Fuentes: PDFs enlazados desde cada ficha de
[respiratoria reutilizable](https://armorepps.com/proteccion-respiratoria-reutilizable/) y
[desechable](https://armorepps.com/proteccion-respiratoria-desechable/), p. ej.
[CertificadoF680.pdf](https://armorepps.com/wp-content/uploads/2025/06/CertificadoF680.pdf),
[CERTIFICADO-MASCARA-AR705.pdf](https://armorepps.com/wp-content/uploads/2025/06/CERTIFICADO-MASCARA-AR705.pdf),
[Certificado-602.pdf](https://armorepps.com/wp-content/uploads/2025/06/Certificado-602.pdf),
[carta NIOSH AR1040/1041](https://armorepps.com/wp-content/uploads/2025/06/ficha_1652100432_1652100441.pdf),
[carta NIOSH AR1058](https://armorepps.com/wp-content/uploads/2025/06/ficha_1652100281_1652100291.pdf).

**HECHO VERIFICADO:** las fechas de vencimiento impresas en los 13 certificados UE respiratorios publicados son
anteriores al 27/10/2026 (los dos últimos vencieron hace 5 y 6 días). **NO VERIFICADO:** si existe una
renovación no publicada. Los certificados UE de tipo (Reglamento 2016/425, categoría III) se emiten por un
máximo de cinco años, por lo que el patrón 2021→2026 es el esperado; la pregunta es si se renovaron.
**INFERENCIA:** si la campaña lleva a una ficha con «Certificado bajo la norma EN…» y el comprador de SSO abre
un PDF vencido, el anuncio deteriora la confianza que justamente debe construir. Es un bloqueo de lanzamiento
para la línea respiratoria, no un detalle editorial.

**Compatibilidad.** HECHO VERIFICADO: las fichas dicen «Compatible con todos los filtros ARMOR series 200 y 700» y
los filtros «Compatible con todas las máscaras ARMOR»; los certificados describen máscaras «intended to be used
with twin filters from the same manufacturer» con conector de bayoneta. **No hay ninguna declaración de
compatibilidad con 3M** en el sitio ni en los PDF (búsqueda de texto sobre los 55 documentos). INFERENCIA: un
anuncio no puede prometer «compatible con 3M»; la certificación ampara el sistema ARMOR-ARMOR.

**Detalles editoriales detectados** (para el checklist de landing, no conclusiones técnicas): AR-1058 declara
«NIOSH 42 CFR **48**» (debería ser 84); la ficha del inserto óptico tiene el pie «FT-AR370 Versión 1» (código de
una ficha de guante); AR410 sigue con el encabezado «Revestido de Látex Corrugado» y un cuerpo que describe
nitrilo (ya señalado el 26/10, sigue igual al 27/10). HECHO VERIFICADO.

### 2.3 Posicionamiento frente a 3M

**INFERENCIA fuerte (nomenclatura espejo).** La numeración ARMOR replica la lógica de códigos de 3M que los
compradores de SSO y los mostradores de distribución ya usan:

| 3M (referencia de mercado) | ARMOR | Coincidencia |
| --- | --- | --- |
| 6800 cara completa M / 6900 L | F680 M / F690 L | misma talla por número |
| 7502 media cara silicona | 705 media cara silicona | material y familia |
| 6200 media cara | 602 media cara | familia |
| 6001 VO / 6003 VO-GA / 6004 amoníaco / 6006 multigás | 701 / 703 / 704 / 706 | último dígito idéntico |
| 60923 / 60926 combinados P100 | 70923 / 70926 combinados P3 | sufijo idéntico |
| 2096 / 2097 P100 con carbón para niveles molestos | 206 / 207 P3 con carbón para niveles molestos | uso idéntico |
| 7093 / 2091 P100 | 793 P3 | número |
| 5N11 prefiltro / 501 retenedor / 502 adaptador | 7N11 / 510 / 520 | número |

Fuentes de la nomenclatura 3M: [3M — respiradores reutilizables](https://3m.com/3M/en_US/p/c/ppe/respiratory-protection/reusable-respirators),
[listado 6800 + 6003 + 5N11 + 501](https://lsgindustrial.com/all-categories/safety-security/3m-6800-full-face-respirator-w-6003-cartridge-5n11-n95-particulate-filter-and-501-filter-retainer.html).
Implicancia: el comprador que busca «filtro 6003» o «máscara 7502» es la demanda que ARMOR quiere sustituir. En
Google Ads eso habilita keywords de categoría y de reemplazo, con dos límites: no usar la marca 3M en el texto del
anuncio sin autorización y no afirmar equivalencia ni compatibilidad sin respaldo documental.

**Precio (muestra mínima, no comparable 1 a 1).** En el retail ferretero Pintulac (Ecuador), el filtro ARMOR 793
P3 cuesta **USD 8,89** (USD 7,73 sin impuesto); filtros de carbón 3M para VO y para gases cuestan USD 18,17 y
19,57; un «repuesto filtros P100 NIOSH» sin marca clara, USD 8,53. HECHO VERIFICADO
([Pintulac ARMOR 793](https://www.pintulac.com.ec/filtro-793-alta-eficiencia-reutilizable-armor.html);
búsqueda de catálogo «filtro 3m» en pintulac.com.ec). INFERENCIA: compatible con el «costo-beneficio» que declara
ARMOR, pero los productos no son equivalentes y una tienda no define el precio B2B a distribuidores. Pedir a ARMOR
su lista de precios relativa a 3M antes de usar «ahorro» como argumento.

**Mensaje de marca propio.** Anuncio pagado en LinkedIn (§4.4): «No somos un catálogo de terceros. Somos una marca
ecuatoriana especializada en protección personal.» HECHO VERIFICADO. **Tensión:** los N95 son marca privada de
Suzhou Fangtian Industries (China) según la carta NIOSH que ARMOR publica, y el certificado del traje AR-110 está a
nombre de Hefei HaoXin (ya señalado el 26/10). INFERENCIA: el argumento «marca ecuatoriana» es sólido para guantes
(fabricante Indecaucho) y defendible para la línea respiratoria (titular ARMOR S.C.C.), pero conviene excluir
desechables y traje de cualquier pieza que diga «fabricamos».

### 2.4 Lanzamientos recientes

AR410 CutGuard One y AR420 CutGuard Max: teaser 14/09/2026, anuncio 21/09 y 25/09, piezas 02/10 y 08/10,
carrusel 21/10 (LinkedIn); certificados Intertek Italia emitidos 02/07/2026, vigentes hasta 01/07/2031. Inserto
óptico para cara completa: ficha «revisado 2025-04», página del 21/04/2026. HECHO VERIFICADO
([LinkedIn ARMOR](https://www.linkedin.com/company/armorepps); [AR410](https://armorepps.com/proteccion-de-manos/armor-ar410/);
[inserto óptico](https://armorepps.com/proteccion-respiratoria-reutilizable/inserto-optico/)).
INFERENCIA: el lanzamiento más reciente es de **manos**, no de respiratoria; si el piloto prioriza full face y
filtros, la línea con contenido nuevo y certificados vigentes es otra.

---

## 3. Canal

### 3.1 Ecuador

| Punto de venta visible | Qué lista | Estado |
| --- | --- | --- |
| AMC Ecuador (mismo grupo, INFERENCIA) | 705, F680, filtro 793; Master | HECHO VERIFICADO — [AMC respiratoria](https://amcecuador.com/categoria-producto/equipos-de-proteccion-personal/proteccion-respiratoria-reutilizable/) |
| Pintulac (ferretería/pinturas) | filtro 793, gafa Combat, tapón | HECHO VERIFICADO — [Pintulac](https://www.pintulac.com.ec/filtro-793-alta-eficiencia-reutilizable-armor.html) |
| Ludepa (Manta, Samborondón) | 705, F680 | HECHO VERIFICADO — [Ludepa F680](https://www.ludepa.ec/productos/seguridad-industrial/mascarillas/mascara-armor-de-cara-completa-f-680/) |
| Rochem del Ecuador (Guayaquil) | 705 | HECHO VERIFICADO — [Rochem 705](https://rochem.com.ec/producto/mascara-de-media-cara-armor-705/) |

Pintulac también lista «botín operador dieléctrico … ARMOR», un producto que **no** está en el catálogo de
armorepps.com. HECHO VERIFICADO. INFERENCIA: otra marca o línea con el mismo nombre; riesgo de confusión en búsqueda.

### 3.2 Colombia

- **Dánamo Colombia S.A.S.** (Grupo AMC) distribuye ARMOR y Master; recibe envíos por carretera vía Tulcán (último
  visible 23/07/2026). Sin sitio web operativo; LinkedIn con 294 seguidores y republicaciones de ARMOR. Buscaba
  Coordinador Financiero y Administrativo en Bogotá (17/08/2026). HECHO VERIFICADO
  ([LinkedIn Dánamo](https://www.linkedin.com/company/danamo-colombia-s-a-s); [ImportGenius](https://es.importgenius.com/ecuador/buyers/danamo-colombia-sas)).
- **Protar Industrial** (Cali) lista 705, filtros 793 y 703, sin precio («solicitar cotización»). HECHO VERIFICADO
  ([Protar 705](https://protarindustrial.com.co/producto/mascara-armor-705-media-cara-de-silicon/)).
- En el sitio de ARMOR, Colombia tiene **sólo correo** (`info.colombia@armorepps.com`) y el enlace a LinkedIn de
  Dánamo; el WhatsApp publicado es el número ecuatoriano. HECHO VERIFICADO ([Contacto](https://armorepps.com/contacto/)).
- ARMOR estuvo en **ExpoIndustrial 2026** (Colombia, stand 32) el 6–8/05/2026. HECHO VERIFICADO (texto de su anuncio
  en la [LinkedIn Ad Library](https://www.linkedin.com/ad-library/detail/1284598464)).

### 3.3 Perú: ya hay producto en el mercado

| Señal | Estado | Fuente |
| --- | --- | --- |
| Grupesac (Lima): página «Distribuidor ARMOR Perú» con máscara 602 y mención del filtro 793-C (imagen de 2022) | HECHO VERIFICADO | [grupesac.pe/marcas/armor](https://grupesac.pe/marcas/armor/) |
| Proepps (Lima): «Distribuidor Armor Perú», máscara 602 y filtro 793 (imágenes de 2025) | HECHO VERIFICADO | [proepps.com/marcas/armor](https://proepps.com/marcas/armor/) |
| Provinsur (Chorrillos, Lima): filtro ARMOR 793 y máscara 602 «sujeto a cotización» | HECHO VERIFICADO | [Provinsur 793](https://www.provinsur.com/filtro-armor-793-de-alta-eficiencia/) |
| Indecaucho exporta a compradores peruanos: PROSAC S.A. (último envío visible 16/07/2026), GULDA & CIA S.A.C. (01/06/2026), INDEJEBE S.A.C. (26/05/2023) | HECHO VERIFICADO (agregador, vista parcial; los productos visibles son guantes) | [ImportGenius: Indecaucho](https://www.importgenius.com/ecuador/exporters/indecaucho-cia-ltda) |
| ARMOR declara «presencia» en Perú en su sitio y LinkedIn; el sitio no tiene canal, correo ni WhatsApp para Perú | HECHO VERIFICADO | [Contacto](https://armorepps.com/contacto/) |
| Ofertas de empleo de ARMOR/Indecaucho en Perú; ferias peruanas con ARMOR | NO ENCONTRADO | Búsquedas 27/10 |

**INFERENCIA.** «Entrar a Perú en 2027» significa nombrar un distribuidor formal y ordenar un mercado donde ya
circulan referencias ARMOR (602, 793) por revendedores que se autodenominan distribuidores. Para el piloto esto
cambia dos cosas: (1) la «visibilidad pre-entrada» competiría con la búsqueda de marca que hoy capturan esos
revendedores; (2) antes de pautar en Perú hay que decidir a quién se deriva una consulta peruana (ARMOR directo,
el futuro distribuidor o los revendedores actuales), o la campaña genera conflicto de canal. PROSAC S.A., cliente
peruano activo de Indecaucho, es un candidato natural a distribuidor; es sólo una hipótesis.
Evento candidato para 2027: **PERUMIN 38** (Arequipa, Cerro Juli, previsto en septiembre de 2027; fecha exacta no
publicada). [IIMP](https://www.iimp.org.pe/eventos/perumin); [EventsEye](https://www.eventseye.com/ferias/f-perumin-convencion-minera-7689-3.html).

---

## 4. Presencia digital

### 4.1 Sitios y estructura

- `armorepps.com`: WordPress + Elementor Pro (tema Ruizarch), SEO con AIOSEO 4.9.2, sólo **español** (`lang="es"`,
  sin hreflang), sin versión `.ec` ni `.pe` (`armorepps.com.ec` no resuelve). 6 familias, 34 fichas con PDF de
  ficha técnica y, en la mayoría, certificado. Modelos 3D Spline en 602, 705, F680, AR410 y AR420. Blog vacío.
  Sin YouTube enlazado ni encontrado; la única red enlazada es LinkedIn (ARMOR y Dánamo). HECHO VERIFICADO.
- `robots.txt` y sitemap están accesibles (el 26/10 no se pudieron leer por HTTP 406). HECHO VERIFICADO
  ([robots.txt](https://armorepps.com/robots.txt), [sitemap](https://armorepps.com/sitemap.xml)).
- Política de privacidad genérica (plantilla sobre cookies, sin referencia a la LOPDP de Ecuador ni a leyes de
  Colombia o Perú) y **sin banner de consentimiento**; `indecaucho.ec` sí usa un gestor de cookies. HECHO VERIFICADO.

### 4.2 Etiquetas en el código fuente (45 URLs de ARMOR revisadas)

| Etiqueta | ARMOR | Detalle |
| --- | --- | --- |
| Google tag / GA4 | **Sí** | `GT-NGP9FL6D` vía Site Kit 1.160.1 → destino GA4 **`G-JQEMTBJ442`** (leído del contenedor gtag) |
| Google Tag Manager | No | — |
| Google Ads (`AW-`) | **No** | El grupo sí tiene uno en Fantape (`AW-11248743492`) |
| LinkedIn Insight Tag | **No** | — |
| Meta Pixel | No | (irrelevante para el piloto) |
| Clarity / Hotjar / CMP | No | — |
| Kommo / chat embebido | No | El contacto es un enlace a WhatsApp |

HECHO VERIFICADO. INFERENCIA: hoy no hay forma de atribuir una visita pagada a una conversación. Lo mínimo para el
piloto: Insight Tag y etiqueta de Google Ads (idealmente vía GTM), evento de clic a WhatsApp y a correo como
conversión, y UTMs en todos los anuncios.

### 4.3 Flujo de WhatsApp

- Botón del encabezado: `wa.link/99s51i` → `api.whatsapp.com/send?phone=593985540672`; botón de contacto:
  `wa.me/593985540672`. **Un solo número (Ecuador), sin texto precargado y sin parámetro de origen.** HECHO VERIFICADO.
- Contraste interno: el WhatsApp de **Master** en `indecaucho.ec` sí precarga «Hola, escribo desde la web de
  Productos Máster…». HECHO VERIFICADO ([Contáctenos Indecaucho](https://indecaucho.ec/contactenos/)).
  INFERENCIA: el grupo ya conoce la técnica; aplicarla a ARMOR por país, familia y campaña es un cambio barato que
  hace legible en Kommo de dónde viene cada conversación.
- El selector de país (Ecuador/Colombia, sin Perú) y la bifurcación ventas/posventa que menciona el encargo no están
  en el sitio. INFERENCIA: es un bot dentro de WhatsApp (posiblemente un salesbot de Kommo). No se probó.

### 4.4 Publicidad: activa e histórica

| Plataforma | Resultado | Estado |
| --- | --- | --- |
| **LinkedIn Ad Library**, anunciante «ARMOR – Equipos de Protección Personal» | **2 anuncios**, ambos «Pago: Indecaucho»: (a) **video de 25 s** invitando a ExpoIndustrial 2026 (Colombia, stand 32) y Expominas.ec (Ecuador, stand 160), 6–8/05/2026, con enlaces de inscripción; (b) **anuncio de documento de 7 páginas** de marca: «No todo lo que protege es una marca de protección… No somos un catálogo de terceros… Descubre ARMOR en armorepps.com». Sin fechas ni impresiones (la biblioteca sólo las muestra para la UE; conserva anuncios del último año) | HECHO VERIFICADO — [anuncio 1284598464](https://www.linkedin.com/ad-library/detail/1284598464), [anuncio 1518595854](https://www.linkedin.com/ad-library/detail/1518595854) |
| LinkedIn Ad Library, «Indecaucho» y «DANAMO COLOMBIA» como anunciantes | Sin resultados | HECHO VERIFICADO |
| **Google Ads Transparency Center**, dominios `armorepps.com`, `productosmaster.com`, `fantape.ec` | **0 anuncios** en cualquier fecha y región; búsqueda de anunciante «Indecaucho» sin coincidencias. Control: `3m.com` devuelve anuncios, el método funciona | HECHO VERIFICADO — [ARMOR en Transparency Center](https://adstransparency.google.com/?region=anywhere&domain=armorepps.com) |

**Corrección al encargo:** «LinkedIn 100 % orgánico» no es exacto; hubo al menos dos campañas pagadas en el
último año (una de ferias y una de marca). INFERENCIA: probablemente boosts o campañas puntuales sin seguimiento
de conversiones (no hay Insight Tag). Pedir en discovery: presupuesto, segmentación, resultados y quién las operó.

### 4.5 LinkedIn orgánico

- ARMOR: **1.554 seguidores** (27/10; 1.553 el 26/10). 10 publicaciones entre el 28/08 y el 21/10/2026 (≈1,3 por
  semana). «Me gusta» por publicación: 37, 17, 16, 15, 14, 10, 9, 8, 3, 2 (mediana 12; ≈0,8 % de los seguidores).
  Temas: lanzamiento AR410/AR420 (6 de 10), posventa, planificación «negocio industria 2027», educación
  respiratoria (ajuste de full face, tipos de partículas). Comentarios y compartidos no visibles sin sesión.
  HECHO VERIFICADO ([LinkedIn ARMOR](https://www.linkedin.com/company/armorepps)).
- Indecaucho: 4.314 seguidores; publicaciones corporativas (Empresa B, sostenibilidad, cultura) con más reacción
  (hasta 89). Dánamo: 294 seguidores. HECHO VERIFICADO.
- Señal del encargo: ~22 seguidores nuevos al mes y 4–5 leads al mes (dato de la coordinadora; no verificable desde fuera).
- INFERENCIA: el orgánico es constante pero pequeño. La base de 1.554 seguidores no alcanza para segmentar
  retargeting en LinkedIn; el piloto debe construir audiencia (visitantes del sitio con Insight Tag y
  espectadores de video) desde cero.

---

## 5. Señales recientes 2025–2026

| Fecha | Señal | Estado | Fuente |
| --- | --- | --- | --- |
| 06–08/05/2026 | ARMOR en Expominas (Quito, stand 160) y ExpoIndustrial 2026 (Colombia, stand 32), con promoción pagada | HECHO VERIFICADO | LinkedIn Ad Library; [Expominas 2026](https://eventosecuador.com/evento/expominas-2026) |
| 02/07/2026 | Certificados Intertek de AR410/AR420 | HECHO VERIFICADO | PDFs AR410/AR420 |
| 13/08 y 09/09/2026 | Indecaucho, Empresa B Certificada | HECHO VERIFICADO (autodeclaración) | LinkedIn Indecaucho |
| ~agosto 2026 | Indecaucho buscó **Jefe de Marketing** (postulación a correo `@amcecuador.com`) | HECHO VERIFICADO de forma indirecta (resultado de búsqueda que cita su LinkedIn; la publicación ya no es visible sin sesión) | Búsqueda web 27/10 |
| 18/09/2026 | Primera Memoria de Sostenibilidad | HECHO VERIFICADO | LinkedIn Indecaucho |
| 14/09–21/10/2026 | Lanzamiento AR410/AR420 | HECHO VERIFICADO | LinkedIn ARMOR |
| ~14/10/2026 | Planificación estratégica «equipo negocio industria» con mirada 2027 (republicada por Dánamo) | HECHO VERIFICADO | LinkedIn ARMOR/Dánamo |
| 2026 | Indecaucho cumple 40 años (1986–2026) | HECHO VERIFICADO | [Home Indecaucho](https://indecaucho.ec/) |
| 25/06–22/10/2026 | Vencen los certificados UE respiratorios publicados | HECHO VERIFICADO (fechas) | PDFs |
| — | Webinars, alianzas comerciales de ARMOR, notas de prensa de ARMOR | NO ENCONTRADO | Búsquedas 27/10 |

INFERENCIA: un Jefe de Marketing recién incorporado (o por incorporar) sería un actor nuevo en la evaluación de la
propuesta; confirmar con Vanessa si ya existe y si la decisión pasa por esa persona, por Miguel González o por ambos.

---

## 6. Implicancias para un piloto de performance B2B de 90 días

### 6.1 Activos que ya sirven para anuncios

| Activo | Uso en el piloto | Condición |
| --- | --- | --- |
| Fichas técnicas PDF de las 34 referencias | Anuncios de documento en LinkedIn (descarga con formulario nativo); contenido de landing | Revisión técnica de ARMOR; corregir errores detectados |
| Certificados AR410/AR420 (vigentes a 2031) y de guantes AR310–AR380 (vigentes a 2030) | Prueba en anuncios de manos | Respetar las restricciones de uso de la marca Intertek |
| Modelos 3D Spline (602, 705, F680, AR410, AR420) | Landing interactiva, capturas para creatividades | Probar en móvil |
| Video de 25 s de ferias y documento de marca de 7 páginas (LinkedIn) | Reutilizar formato; audiencia de video para retargeting | El de ferias está vencido como mensaje |
| Contenido educativo (ajuste de full face, tipos de contaminantes) | Anuncios de pensamiento técnico para SSO | Validación técnica |
| Inserto óptico para cara completa | Ángulo diferencial concreto para usuarios con lentes | Confirmar disponibilidad por país |
| Nomenclatura espejo de 3M | Keywords de reemplazo en Google Ads | Sin usar la marca 3M en el anuncio ni prometer compatibilidad |
| Ferias (Expominas, ExpoIndustrial; PERUMIN 38 en 2027) | Listas de asistentes y momentos de campaña | Confirmar participación 2027 |

### 6.2 Lo que falta (en orden de bloqueo)

1. **Certificados respiratorios vigentes publicados** (o retirar el enlace y el claim) antes de pautar full face y
   filtros. Es la condición que más puede cambiar el alcance del piloto.
2. **Medición**: Insight Tag, etiqueta de conversión de Google Ads, GTM, eventos de clic a WhatsApp y correo, UTMs.
3. **Captura de origen en WhatsApp**: texto precargado por país, familia y campaña (el sitio de Master ya lo hace) y
   etiquetado en Kommo; acordar quién marca la consulta como pertinente.
4. **Landings por audiencia y país**: Compras (disponibilidad, distribuidor, cotización) ≠ SSO (selección, norma,
   ajuste, factor de protección). Hoy las fichas son de catálogo, sin CTA específica ni contenido por país.
5. **Ruta Colombia**: no hay WhatsApp colombiano ni sitio de Dánamo; definir si las consultas van a Dánamo y cómo.
6. **Ruta Perú**: sin canal, sin contenido local y con revendedores activos; definir derivación antes de pautar.
7. **Consentimiento y privacidad**: banner y política alineados con la LOPDP de Ecuador y con las leyes de Colombia
   y Perú antes de activar remarketing (verificación legal fuera de este informe).
8. **Blog vacío y sin YouTube**: la demanda de búsqueda educativa no tiene destino propio.

### 6.3 Riesgos

| Riesgo | Por qué | Mitigación sugerida |
| --- | --- | --- |
| Claims respiratorios con certificados vencidos | Hecho verificado §2.2 | Bloqueo de lanzamiento; empezar por manos si no hay renovación |
| Ambigüedad de «armor» en Google | Colisión con otras marcas (§3.1, Milwaukee Armor, Armor International) | Keywords de marca en concordancia exacta o frase con «EPP», «máscara», «filtro»; negativas |
| Uso de la marca 3M | Política de marcas de Google y LinkedIn; la certificación no ampara compatibilidad | Keywords de categoría y reemplazo sin la marca en el texto; validación legal |
| Conflicto de canal | B2B sólo por distribuidores; revendedores en Perú; Dánamo en Colombia | Derivación acordada por país antes del lanzamiento; medir «consulta derivada», no «venta» |
| Volumen bajo | Mercados pequeños y audiencia de nicho (INFERENCIA; no se midió volumen) | Medir con Keyword Planner y el forecast de LinkedIn antes de fijar metas; presupuesto por país |
| Canibalización con Master Professional | Ambas venden guantes industriales | Separar keywords por familia o coordinar con el negocio |
| Desechables y traje como «fabricación propia» | Marca privada (§2.3) | Excluirlos de mensajes de origen |
| Actores nuevos en la decisión | Posible Jefe de Marketing nuevo; Gerente Negocio Industria | Mapear la decisión con Vanessa |

### 6.4 Preguntas para la siguiente conversación

1. ¿Están renovados los certificados UE de máscaras y filtros? ¿Cuándo se publicarán las versiones vigentes?
2. ¿Qué segmentación, presupuesto y resultados tuvieron los dos anuncios pagados de LinkedIn? ¿Quién los operó?
3. ¿Quién administra GA4 (`G-JQEMTBJ442`) y quién puede instalar etiquetas en `armorepps.com`?
4. ¿Cómo funciona hoy el bot de WhatsApp (país, ventas, posventa) y qué campos guarda en Kommo?
5. En Perú, ¿qué relación tienen con Grupesac, Proepps, Provinsur y PROSAC? ¿A quién se deriva una consulta peruana hoy?
6. En Colombia, ¿Dánamo atiende las consultas y tiene WhatsApp propio?
7. ¿Cuál es el precio relativo a 3M en filtros y cara completa, y se puede usar como argumento?
8. ¿Master Professional entra o queda fuera del piloto?

---

## Fuentes (consultadas el 27/10/2026)

ARMOR
- https://armorepps.com/ — home, contadores y etiquetas
- https://armorepps.com/robots.txt · https://armorepps.com/sitemap.xml · https://armorepps.com/page-sitemap.xml
- https://armorepps.com/contacto/ · https://armorepps.com/quienes-somos/ · https://armorepps.com/productos/ · https://armorepps.com/blog/
- https://armorepps.com/politica-de-privacidad-de-datos/
- https://armorepps.com/proteccion-respiratoria-reutilizable/ y sus 17 fichas (máscaras, filtros, accesorios)
- https://armorepps.com/proteccion-respiratoria-desechable/ y sus 3 fichas
- https://armorepps.com/proteccion-de-manos/ y sus 7 fichas; https://armorepps.com/proteccion-de-manos/armor-ar410/ · https://armorepps.com/proteccion-de-manos/armor-ar420/
- https://armorepps.com/proteccion-respiratoria-reutilizable/inserto-optico/
- PDFs: https://armorepps.com/wp-content/uploads/2025/06/CertificadoF680.pdf · https://armorepps.com/wp-content/uploads/2025/06/CERTIFICADO-MASCARA-AR705.pdf · https://armorepps.com/wp-content/uploads/2025/06/Certificado-602.pdf · https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-701.pdf · https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-703.pdf · https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-706.pdf · https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-793.pdf · https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-793C.pdf · https://armorepps.com/wp-content/uploads/2025/06/certificado-filtro-ARMOR-207-1.pdf · https://armorepps.com/wp-content/uploads/2025/06/ficha_1723844732_1723844733.pdf · https://armorepps.com/wp-content/uploads/2026/05/CE-AR-70923.pdf · https://armorepps.com/wp-content/uploads/2025/06/ficha_1723844694_1723844710.pdf · https://armorepps.com/wp-content/uploads/2025/06/ficha_1652100432_1652100441.pdf · https://armorepps.com/wp-content/uploads/2025/06/ficha_1652100281_1652100291.pdf · https://armorepps.com/wp-content/uploads/2025/06/FICHA-TECNICA-F680.pdf · https://armorepps.com/wp-content/uploads/2025/06/FICHA-TECNICA-AR705.pdf · https://armorepps.com/wp-content/uploads/2025/06/Ficha-Tecnica-mascara-602.pdf · https://armorepps.com/wp-content/uploads/2025/06/FICHA-TECNICA-FILTRO-701.pdf · https://armorepps.com/wp-content/uploads/2026/04/FICHA-TECNICA-INSERTO-OPTICO-FULL-FACE.pdf · https://armorepps.com/wp-content/uploads/2026/09/AR410.pdf · https://armorepps.com/wp-content/uploads/2026/09/AR420.pdf · certificados de guantes AR310, AR320, AR370, AR380 enlazados desde sus fichas
- https://www.googletagmanager.com/gtag/js?id=GT-NGP9FL6D — destino GA4
- https://wa.link/99s51i — redirección a WhatsApp

Grupo y marcas
- https://indecaucho.ec/ · https://indecaucho.ec/quienes-somos/ · https://indecaucho.ec/nuestras-marcas/ · https://indecaucho.ec/equipo-gerencial/ · https://indecaucho.ec/contactenos/ · https://indecaucho.ec/contactenos/unete-a-nuestro-equipo/ · https://indecaucho.ec/certificaciones/ · https://indecaucho.ec/page-sitemap.xml
- https://productosmaster.com/ · https://productosmasterprofessional.com/ · https://fantape.ec/
- https://amcecuador.com/ · https://amcecuador.com/categoria-producto/equipos-de-proteccion-personal/proteccion-respiratoria-reutilizable/
- http://www.danamocolombia.com/
- https://ecuadorpapers.org/ocr/17324%20INDECAUCHO%20C%20LTDA/economica/ — auditoría externa y nómina de accionistas 2019
- https://www.vistazo.com/portafolio/provincias/2024-07-24-pichincha-provincia-desarrolla-alternativas-productivas-GC8444899

LinkedIn
- https://www.linkedin.com/company/armorepps · https://www.linkedin.com/company/indecaucho-ecuador · https://www.linkedin.com/company/danamo-colombia-s-a-s
- https://www.linkedin.com/ad-library/search?accountOwner=ARMOR%20-%20Equipos%20de%20Protecci%C3%B3n%20Personal · https://www.linkedin.com/ad-library/detail/1284598464 · https://www.linkedin.com/ad-library/detail/1518595854
- Búsquedas en Ad Library por «Indecaucho» y «DANAMO COLOMBIA» (sin resultados)

Google Ads Transparency Center
- https://adstransparency.google.com/?region=anywhere&domain=armorepps.com · …&domain=productosmaster.com · …&domain=fantape.ec · …&domain=3m.com (control)

Comercio exterior
- https://www.importgenius.com/ecuador/exporters/indecaucho-cia-ltda · https://es.importgenius.com/ecuador/buyers/danamo-colombia-sas

Distribución y retail
- https://grupesac.pe/marcas/armor/ · https://proepps.com/marcas/armor/ · https://www.provinsur.com/filtro-armor-793-de-alta-eficiencia/
- https://protarindustrial.com.co/producto/mascara-armor-705-media-cara-de-silicon/
- https://www.pintulac.com.ec/filtro-793-alta-eficiencia-reutilizable-armor.html y búsquedas de catálogo «armor», «filtro 3m», «mascara 3m»
- https://www.ludepa.ec/productos/seguridad-industrial/mascarillas/mascara-armor-de-cara-completa-f-680/ · https://rochem.com.ec/producto/mascara-de-media-cara-armor-705/

Referencias de mercado y eventos
- https://3m.com/3M/en_US/p/c/ppe/respiratory-protection/reusable-respirators
- https://lsgindustrial.com/all-categories/safety-security/3m-6800-full-face-respirator-w-6003-cartridge-5n11-n95-particulate-filter-and-501-filter-retainer.html
- https://eventosecuador.com/evento/expominas-2026 · https://www.iimp.org.pe/eventos/perumin · https://www.eventseye.com/ferias/f-perumin-convencion-minera-7689-3.html

Intentos sin resultado útil (27/10): directorio de B Lab (HTTP 403); NIOSH CEL (la página no cargó el buscador);
rankings EKOS/Vistazo y SuperCías para ventas 2020–2025; YouTube de ARMOR; ofertas de empleo de ARMOR en Perú;
ferias peruanas con ARMOR.
