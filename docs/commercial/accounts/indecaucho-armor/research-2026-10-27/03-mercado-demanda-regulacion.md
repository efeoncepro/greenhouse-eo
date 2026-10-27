# ARMOR / Indecaucho: mercado, demanda de búsqueda, regulación y audiencias (EC · PE · CO)

| Campo | Valor |
|---|---|
| Corte | 27/10/2026. Todas las fuentes se consultaron ese día, salvo que se indique otra fecha. |
| Preparado para | Caso de negocio del piloto de 90 días de LinkedIn Ads + Google Ads (Compras y SSO/HSE) |
| Método | Semrush MCP (`phrase_these`, bases `pe`, `co`, `ec`, volumen mensual promedio y CPC en USD); UN Comtrade (API pública *preview*, HS 902000, importaciones declaradas); lectura directa de textos legales en PDF/HTML oficiales cuando fue posible (DS 024-2016-EM, Ley 29783, DS 005-2012-TR, DE 255 de Ecuador, Decreto 1072 de 2015, notificación OTC G/TBT/N/ECU/540); DataReportal Digital 2026 para LinkedIn; prensa e informes oficiales citados por medios para empleo sectorial. |
| Cobertura | Mercado e importaciones, industrias usuarias, marco regulatorio de EPP respiratorio, proceso de compra, demanda de búsqueda en Google y tamaño de LinkedIn por país. |
| Límites | No hay acceso a Google Keyword Planner, LinkedIn Campaign Manager, Kommo, GA4 ni datos de ventas de ARMOR. No hay un estudio público y creíble del tamaño del mercado de protección respiratoria por país. Varios artículos legales (Res. 0312/2019 y NTC 3852 en Colombia; normas INEN vigentes en Ecuador) solo se pudieron verificar con fuentes secundarias. El texto del DS 024-2016-EM leído es la publicación original de 2016; el reglamento tiene modificaciones posteriores (2017 y 2023) que no se revisaron artículo por artículo. |
| Convención | **HECHO**: dato leído en la fuente citada. **INFERENCIA**: interpretación nuestra. **ESTIMACIÓN**: cálculo nuestro con el método explícito. Una cifra sin etiqueta proviene de la fuente que aparece en la misma fila o párrafo. |

## Resumen para dimensionar el piloto

1. **La demanda de búsqueda está en Perú y Colombia; Ecuador aporta poco.** El núcleo genérico de protección respiratoria industrial (media cara, full face, filtros, cartuchos, P100, vapores orgánicos, “protección respiratoria”) suma unas **3.600 búsquedas al mes en Perú, 2.400 en Colombia y unas 500 en Ecuador** (Semrush). Los términos con marca 3M suman **~4.300 (PE), ~3.900 (CO) y ~800 (EC)**. En Ecuador, Semrush reporta muchos términos en el piso de 20, que indica poca muestra, no demanda medida con precisión.
2. **El CPC estimado es bajo**: USD 0,0 a 0,5 en casi todo el núcleo. Con presupuestos modestos, el factor que limita es **el volumen y la calidad de la intención**, no el costo por clic. ESTIMACIÓN: Google alcanza para captar demanda existente; no alcanza para generar demanda en Ecuador.
3. **Las búsquedas de 3M son la mayor bolsa de intención concreta** (modelos 6200, 7502, 6800 y filtros 6003, 2097, 60926). INFERENCIA: es la oportunidad de “compatibilidad/alternativa”. Pujar por marcas de terceros y mencionarlas en anuncios tiene límites legales y de política que deben revisarse antes de lanzar.
4. **LinkedIn tiene escala por país**: 12,0 M de miembros en Perú, 18,0 M en Colombia y 5,8 M en Ecuador (DataReportal, datos de octubre de 2025). No existe una cifra pública de profesionales de SSO/HSE ni de Compras; el tamaño de la audiencia objetivo debe medirse en el pronosticador de Campaign Manager, que es gratuito y no requiere invertir. Detalle en §5.
5. **Los tres disparadores regulatorios más útiles para el mensaje** son: (a) la obligación de reponer el EPP según su vida útil y sin costo para el trabajador, que sostiene la recompra de filtros; (b) la obligación de que el respirador sea adecuado al contaminante y a la persona (talla y medidas antropométricas en Perú); y (c) la exigencia de especificaciones técnicas y certificados de calidad, que en minería peruana condiciona incluso el ingreso a la operación. Detalle en §2.

---

## 1. Mercado, importaciones e industrias usuarias

### 1.1 Tamaño del mercado

- **HECHO (negativo):** en esta corrida no se encontró una fuente pública y creíble sobre el tamaño del mercado de protección respiratoria industrial en Ecuador, Perú o Colombia. Lo que aparece son informes pagados de consultoras, sin metodología visible. Uno de ellos atribuye a Colombia un mercado total de EPP de ~USD 237 M para el horizonte 2023–2028, sin desglose de protección respiratoria. Otros mezclan EPP hospitalario o equipos médicos respiratorios, como ventiladores. **No se recomienda citar esas cifras en el caso de negocio.**
- **Mejor aproximación disponible: importaciones (ver 1.2).** INFERENCIA: Ecuador, Perú y Colombia dependen en gran medida de importaciones para las máscaras reutilizables y sus partes. Por eso las importaciones dan un orden de magnitud del valor CIF del segmento de máscaras con filtro, aunque no representan el mercado completo.

### 1.2 Importaciones: HS 9020.00 (“Los demás aparatos respiratorios y máscaras antigás, excepto las máscaras de protección sin mecanismo ni elemento filtrante amovible”)

Valor CIF en USD declarado por el país importador. Fuente: UN Comtrade (API pública), consultada el 27/10/2026.

| País | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---:|---:|---:|---:|---:|
| Perú | 16,3 M | 20,6 M | 20,8 M | **26,6 M** | sin datos aún |
| Colombia | 17,1 M | 19,4 M | 15,6 M | 16,1 M | **14,1 M** |
| Ecuador | 3,9 M | 2,6 M | 5,7 M | 4,6 M | **6,1 M** |

Principales orígenes en 2024, como porcentaje del valor importado (HECHO, Comtrade):
- **Perú:** EE. UU. 46,1 %, Reino Unido 10,4 %, China 10,0 %, Singapur 9,3 %, Canadá 9,1 %, Polonia 6,8 %.
- **Colombia:** EE. UU. 34,9 %, Reino Unido 18,2 %, Polonia 16,6 %, Canadá 11,3 %, China 5,8 %, Alemania 5,1 %.
- **Ecuador:** EE. UU. 69,1 %, China 16,2 %, Letonia 7,5 %, España 2,9 %.

Advertencias:
- La partida 9020 incluye equipos autónomos (SCBA), equipos de escape y otros aparatos respiratorios, no solo máscaras de media cara o full face. **Excluye los respiradores desechables** sin válvula ni filtro reemplazable, que normalmente se clasifican en otras partidas (la notificación de Ecuador a la OMC menciona la 6307.90 y la 3926.90). No se verificó en qué partida declara cada país los cartuchos y filtros de recambio.
- El peso neto de Ecuador en 2023 (90 kg) es inconsistente con el valor declarado. Hay que tratar el dato como posible error de registro.
- El país de origen no indica la marca.
- INFERENCIA: Perú es el mercado importador más grande y el que más creció entre 2021 y 2024 (+63 %). Esto coincide con el máximo de empleo minero (1.3). Colombia muestra una tendencia plana o a la baja en esta partida.
- Para afinar: consultar SUNAT (Perú), SENAE (Ecuador) y DIAN (Colombia) a nivel de subpartida nacional e importador. Esas fuentes permiten ver qué distribuidores importan, pero quedan fuera del alcance de esta corrida.

### 1.3 Industrias usuarias: dimensión aproximada

| País | Industria | Dato | Tipo | Fuente |
|---|---|---|---|---|
| Perú | Minería | Empleo directo promedio de **264 mil** en 2025; máximo de **280.674** en octubre de 2025; **72,1 %** en contratistas (agosto de 2025) | HECHO (cifras MINEM publicadas por medios) | El Peruano; ProActivo; Energiminas |
| Perú | Minería | Límite de polvo respirable de **3 mg/m³** (8 h) y monitoreo periódico obligatorio de agentes químicos | HECHO | DS 024-2016-EM, arts. 110–111 |
| Ecuador | Minas y canteras | **32.393** empleos registrados en el IESS en diciembre de 2025 (+11,1 % anual) | HECHO (Primicias, con base en IESS) | Primicias |
| Ecuador | Petróleo | Sin cifra de empleo verificada en esta corrida. INFERENCIA: la sección CIIU B, “minas y canteras”, suele incluir la extracción de petróleo, por lo que podría estar incluida en la cifra del IESS; está por confirmar | — | — |
| Ecuador | Manufactura | ~**9,2 %** del empleo, con predominio de alimentos procesados (año de referencia no indicado por la fuente) | HECHO, baja precisión | El Diario |
| Colombia | Manufactura | **2,609 M** de ocupados en 2025, 11,0 % del total nacional | HECHO (UPRA con datos de la GEIH del DANE) | UPRA |
| Colombia | Riesgos laborales | **13,51 M** de trabajadores afiliados a ARL en 2025 | HECHO (boletín basado en Fasecolda) | CCS |
| Las tres | Agroindustria, química, construcción | No se dimensionaron con fuentes verificadas en esta corrida | — | — |

INFERENCIA de priorización: en **Perú**, el cliente con exigencia más alta y uso más intensivo es la minería y sus contratistas (polvo, sílice, gases, soldadura). En **Ecuador**, el valor está en petróleo, minería emergente, agroindustria y química. En **Colombia**, la base es manufactura y servicios, una demanda más dispersa con rotación de proveedores por homologación.

---

## 2. Marco regulatorio que crea la demanda

### 2.1 Perú

| Norma | Qué obliga (HECHO, texto leído) | Implicación comercial (INFERENCIA) |
|---|---|---|
| **Ley 29783**, art. 60 | El empleador entrega EPP “adecuados, según el tipo de trabajo y riesgos específicos” cuando no puede eliminar el riesgo en su origen, y “verifica el uso efectivo”. Art. 61: actúa si el EPP genera riesgos. | Hay obligación de compra y de supervisión del uso. Funcionan los mensajes de comodidad y aceptación del usuario. |
| **DS 005-2012-TR**, art. 97 | Además de lo dispuesto en el art. 60 de la Ley, los EPP “deben atender a las medidas antropométricas del trabajador que los utilizará”. Art. 33: registro obligatorio de “equipos de seguridad o emergencia”. | Ofrecer tallas y prueba de ajuste es un argumento con base legal. El asesor técnico aporta valor real. |
| **DS 024-2016-EM** (minería), art. 81 | Prohíbe ingresar y trabajar con riesgo sin EPP “que cuenten con sus especificaciones técnicas y certificados de calidad”; el EPP es la última medida de control. | La documentación (ficha técnica y certificado) es condición de entrada. Es el núcleo del mensaje para Compras y SSO en minería. |
| DS 024-2016-EM, arts. 84, 86, 88, 93 | Exige respirador para soldadura contra vapores, humos y polvos metálicos (84); “respiradores de tipo conveniente… en número suficiente” y “del tipo adecuado” ante mezcla de gases (86); uso permanente durante la labor (88); respirador al operar esmeril (93). | La selección por contaminante y la cobertura de toda la cuadrilla justifican mensajes por aplicación (soldadura, polvo, gases). |
| DS 024-2016-EM, arts. 110–111 | Monitoreo periódico de agentes químicos según los límites del Anexo 15 y del DS 015-2005-SA; límite de 3 mg/m³ de polvo respirable; paralización si se supera en mina subterránea. | Un resultado de monitoreo por encima del límite puede activar una compra o un cambio de equipo. |
| Modificaciones | El reglamento fue modificado, entre otros, por normas de 2017 y por el DS 034-2023-EM (según SINIA y lpderecho). **No se verificó si cambiaron los artículos citados.** | Revisar el texto consolidado antes de usarlo en piezas públicas. |
| **NTP 329.201:2020** (INACAL) | Respirador filtrante contra partículas: requisitos y métodos de ensayo (HECHO según nota de la SNI; norma no leída). | Aplica sobre todo a los desechables. No se encontró una NTP para cartuchos químicos en esta corrida. |
| Prueba de ajuste | No se encontró una exigencia explícita en los textos legales leídos. Estándares corporativos mineros, como el E-COR-SIB-11.02 de Buenaventura, definen pruebas de ajuste cualitativas y cuantitativas. | INFERENCIA: en Perú, la prueba de ajuste la exige el **estándar del titular minero**, que la impone a sus contratistas, no la ley general. Un mensaje sobre el servicio de prueba de ajuste apunta a la gran minería. |

### 2.2 Ecuador

| Norma | Qué obliga (HECHO, texto leído) | Implicación comercial (INFERENCIA) |
|---|---|---|
| **Decreto Ejecutivo 255** (2/5/2024, Reglamento de Seguridad y Salud en el Trabajo; reemplaza el reglamento de 1986 reformado en 2003) | **Art. 56:** si las medidas colectivas no bastan, el empleador entrega “sin costo alguno” los EPP necesarios, que “cumplirán con las especificaciones técnicas de uso, mantenimiento y reposición”. | La reposición es una obligación. Respalda la recompra de filtros y el mensaje “programa de recambio”. |
| DE 255, art. 18 | Obliga a designar un monitor o técnico de seguridad e higiene según tamaño y riesgo. Las empresas de 50 a 199 trabajadores tienen un técnico; las de 200 o más, un técnico y uno adicional por cada 200 trabajadores (riesgo bajo o medio) o por cada 100 (riesgo alto). | La figura de SSO es obligatoria en las empresas medianas y grandes, que son el público de LinkedIn. |
| DE 255, art. 59 num. 7 | Califica como trabajo penoso el que exige usar protección respiratoria al menos 4 horas de la jornada. | La comodidad en jornadas largas es un argumento técnico (peso, silicona, válvula). |
| **RTE INEN 181 “Equipos de protección respiratoria”** | En junio de 2024 Ecuador notificó a la OMC (G/TBT/N/ECU/540) el proyecto de la tercera revisión. Cubre máscaras completas, medias máscaras, filtros de partículas, filtros de gases y filtros combinados, nacionales o importados, con referencias a EN 136/140/143/14387/149 y 42 CFR 84 (NIOSH). | El reglamento técnico existe; **no se verificó si la 3.ª revisión fue publicada ni su fecha de vigencia**. Cumplirlo es una barrera para competidores importados y un argumento para una marca local que lo cumpla. |
| Ley Orgánica de Salud, art. 118 | Obligación de dotar equipos de protección (citado por fuente secundaria). | Complementa el marco. |

### 2.3 Colombia

| Norma | Qué obliga | Implicación comercial (INFERENCIA) |
|---|---|---|
| **Decreto 1072 de 2015**, art. 2.2.4.6.24 num. 5 y parágrafo 1 (HECHO, texto oficial de Función Pública) | Exige EPP “que cumplan con las disposiciones legales vigentes”, siempre como medida complementaria. El empleador los entrega “sin ningún costo”, se asegura de que los trabajadores conozcan su uso correcto y de que el mantenimiento o reemplazo garantice el “recambio según vida útil”. | Es el disparador más claro de **recompra de filtros**, con capacitación incluida. |
| **Resolución 0312 de 2019** (estándares mínimos del SG-SST) | Fuentes secundarias indican que exige entregar EPP y capacitar en su uso adecuado (empresas de más de 50 trabajadores, y de menos si son de riesgo IV o V). **No se leyó el texto oficial** porque las réplicas oficiales devolvieron error. | La auditoría de estándares mínimos genera evidencia documental: actas de entrega y capacitación. Las fichas técnicas y la formación del asesor la facilitan. |
| **Resolución 2400 de 1979**, art. 176 (texto oficial en el sitio de MinSalud, según la cita de la búsqueda) | Los empleadores suministran equipos de protección adecuados. Para el sistema respiratorio enumera máscaras para gases y vapores, respiradores contra polvos (sílice, asbesto), humos y neblinas, y máscaras con suministro de aire. Fuentes secundarias citan los arts. 182–184 (adecuación al medio, límite de cartuchos con menos de 16 % de O₂, capacitación). | Selección por contaminante. Los arts. 182–184 no se verificaron en el texto oficial. |
| **NTC 3852** | Medias máscaras filtrantes contra partículas (según una guía de USAID/ANSI; no leída). | Aplica sobre todo a los desechables. |
| Homologación | Las ARL capacitan a las empresas en “homologación de elementos de protección personal” (presentaciones de Positiva/Posipedia, 2024–2025). | INFERENCIA: el proveedor nuevo debe entrar a una lista homologada. El proceso de compra es más largo, pero luego se repite. |

### 2.4 Lo que esto implica para el mensaje (INFERENCIA)

| Disparador | Base | Mensaje candidato | Público |
|---|---|---|---|
| **1. Reposición y recambio por vida útil** | CO: Dec. 1072, par. 1; EC: DE 255, art. 56; PE: Ley 29783, art. 60 (uso efectivo) | “Arma tu programa de recambio de filtros: cuándo cambiar, cuántos comprar, con ficha y registro.” | SSO + Compras (recompra) |
| **2. Adecuado al contaminante y a la persona** | PE: DS 005, art. 97 (antropometría); DS 024, art. 86; CO: Res. 2400, art. 176 | “Selección por contaminante y talla, con asesor técnico y prueba de ajuste.” | SSO/HSE |
| **3. Certificado y especificación como condición de compra** | PE: DS 024, art. 81; EC: RTE INEN 181; CO: “disposiciones legales vigentes” | “Documentación lista para homologación: ficha técnica, certificado y norma de referencia.” | Compras + SSO (minería y petróleo) |

Complementos: el monitoreo de agentes químicos con resultado sobre el límite (PE, arts. 110–111) es un **momento de compra**, y la jornada de 4 horas o más con respirador (EC, art. 59) sostiene el argumento de comodidad.

---

## 3. Proceso de compra B2B de EPP respiratorio

Esta sección es **INFERENCIA** basada en la normativa citada y en la práctica sectorial. Hay que validarla con ARMOR (asesores y Kommo) antes de usarla como supuesto del piloto.

| Rol | Qué decide | Qué necesita ver | Canal más probable |
|---|---|---|---|
| **SSO/HSE (técnico o jefe de seguridad e higiene, prevencionista, SSOMA)** | La especificación: tipo de respirador, filtro por contaminante, tallas y prueba de ajuste. Evalúa y homologa. | Ficha técnica, certificado y norma (NIOSH/EN/INEN), tabla de compatibilidad de filtros, capacitación. | LinkedIn (contenido técnico, eventos), búsqueda genérica por aplicación |
| **Compras / abastecimiento** | El proveedor, el precio, el plazo y la continuidad de stock. Repite órdenes de consumibles. | Precio por kit o filtro, disponibilidad, distribuidor cercano, equivalencias, condiciones. | Google (proveedor, venta, “filtro 3M 6003” para reponer), LinkedIn para estar en la lista de proveedores |
| **Operaciones / jefe de planta o de turno** | Influye por uso y quejas de comodidad. | Comodidad, duración y facilidad de recambio. | Indirecto |
| **Distribuidor** | Atiende la compra transaccional y local. | Margen, rotación, material de venta, soporte técnico. | Canal comercial de ARMOR |
| **Titular minero o petrolero (para contratistas)** | Fija estándares que el contratista debe cumplir. | Cumplimiento de su estándar corporativo. | Fuera del alcance de los medios pagados |

- **Criterios (INFERENCIA, ordenados por peso probable):** certificación o cumplimiento normativo → compatibilidad y disponibilidad de filtros → precio total del programa (máscara + filtros anuales) → asesoría y capacitación → plazo de entrega.
- **Ciclo:** la primera adopción o homologación es lenta (semanas a meses en minería y petróleo; ciclos de licitación o calificación de proveedores). La **recompra de filtros es recurrente y transaccional**. INFERENCIA: un piloto de 90 días puede registrar oportunidades y algunas ventas de reposición, pero difícilmente cierra homologaciones grandes. La métrica de éxito debe incluir oportunidades calificadas en Kommo, no solo ventas cerradas.
- **Licitaciones y homologación:** la gran minería peruana y el petróleo ecuatoriano compran por calificación de proveedores y estándares corporativos (ver el estándar de Buenaventura). En Colombia, las ARL promueven la homologación de EPP. No se verificaron plataformas de registro de proveedores específicas por empresa.
- **Sustitución de 3M:** el volumen de búsquedas por modelo 3M (§4) muestra que el comprador busca por número de parte. INFERENCIA: la recompra de filtros está anclada al sistema de máscara instalado. Por eso la propuesta de valor de ARMOR debe aclarar si sus filtros son compatibles con máscaras de terceros o si conviene migrar el sistema completo. Es una pregunta para ARMOR; no se debe afirmar compatibilidad sin validación técnica.

---

## 4. Demanda de búsqueda (Google) por país

Fuente: Semrush, bases `pe`, `co` y `ec`, consultadas el 27/10/2026. **Volumen** = búsquedas mensuales promedio estimadas. **CPC** en USD. **Comp.** = densidad competitiva de anunciantes (0–1). “—” = Semrush no devolvió datos (volumen insuficiente). Un valor de **20 suele ser el piso** de Semrush para términos de baja muestra; en Ecuador aparece con mucha frecuencia y debe leerse como “bajo / no medible”.

### 4.1 Tabla de keywords

| Keyword | Perú vol. | PE CPC | PE comp. | Colombia vol. | CO CPC | CO comp. | Ecuador vol. | EC CPC | EC comp. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Genérico respiratorio industrial** | | | | | | | | | |
| respirador media cara | 880 | 0,10 | 0,69 | 390 | 0,10 | 0,61 | 20 | 0,00 | 0,33 |
| respirador con filtro | 720 | 0,19 | 0,67 | 170 | 0,05 | 0,63 | 30 | 0,00 | 0,55 |
| filtro p100 / filtros p100 | 590 | 0,00 | 0,37 | 320 | 0,11 | 0,74 | 20 | 0,00 | 0,03 |
| protección respiratoria | 390 | 0,23 | 0,31 | 140 | 0,26 | 0,16 | 110 | 0,00 | 0,10 |
| mascarilla media cara | 210 | 0,00 | 0,67 | 390 | 0,11 | 0,80 | 140 | 0,00 | 0,22 |
| máscara full face | 170 | 0,20 | 0,83 | 480 | 0,15 | 0,75 | 110 | 0,18 | 0,33 |
| respirador full face | 170 | 0,37 | 0,54 | 50 | 0,11 | 0,86 | — | — | — |
| filtros para respirador | 170 | 0,00 | 0,81 | 20 | 0,00 | 0,84 | — | — | — |
| respirador para polvo | 140 | 0,11 | 0,76 | 20 | 0,00 | 0,17 | 20 | 0,00 | 0,21 |
| máscara con filtro | 90 | 0,12 | 0,85 | — | — | — | — | — | — |
| cartuchos para gases y vapores | 30 | 0,00 | 1,00 | 30 | 0,00 | 0,90 | — | — | — |
| respirador para vapores orgánicos | 30 | 0,16 | 0,82 | 10 | 0,00 | 0,00 | 30 | 0,00 | 0,50 |
| filtro vapores orgánicos | 20 | 0,00 | 0,74 | 20 | 0,00 | 0,86 | — | — | — |
| careta full face | 20 | 0,00 | 0,53 | 260 | 0,11 | 0,98 | — | — | — |
| mascarilla / careta / tapabocas para gases | — | — | — | 40 / 20 / 30 | 0,00 | ~1,0 | 20 / — / — | 0,00 | 0,41 |
| **Marca 3M (compatibilidad o sustitución)** | | | | | | | | | |
| respirador 3m | 1.900 | 0,08 | 0,95 | 720 | 0,08 | 0,96 | 20 | 0,18 | 0,68 |
| respirador media cara 3m | 480 | 0,16 | 0,85 | 170 | 0,11 | 0,89 | 20 | 0,00 | 1,00 |
| filtros 3m | 480 | 0,18 | 1,00 | 390 | 0,11 | 0,93 | 50 | 0,14 | 0,29 |
| filtro 3m 2097 | 260 | 0,25 | 0,63 | 170 | 0,11 | 0,61 | 20 | 0,00 | 0,11 |
| filtros 3m 6003 | 170 | 0,19 | 0,69 | 140 | 0,12 | 0,84 | 20 | 0,00 | 0,08 |
| respirador 3m 6200 (+ “3m 6200”) | 170 + 40 | 0,18 | 0,71 | 110 + 30 | 0,12 | 0,86 | 30 + 30 | 0,00 | 0,38 |
| respirador 3m 7502 (+ “3m 7502”) | 170 + 30 | 0,19 | 0,60 | 20 + 30 | 0,10 | 0,78 | 20 + 20 | 0,00 | 0,05 |
| respirador 3m 6800 (+ “3m 6800”) | 20 + 20 | 0,00 | 0,45 | 20 + 30 | 0,10 | 0,63 | 20 + 20 | 0,00 | 1,00 |
| máscara 3m | 170 | 0,06 | 1,00 | 480 | 0,09 | 1,00 | 20 | 0,18 | 1,00 |
| mascarilla 3m | — | — | — | 880 | 0,08 | 0,98 | 390 | 0,18 | 0,83 |
| filtros para máscara 3m | 140 | 0,00 | 0,91 | 210 | 0,05 | 0,98 | 20 | 0,09 | 0,81 |
| cartuchos 3m | 110 | 0,00 | 0,76 | 90 | 0,00 | 0,51 | 20 | 0,00 | 0,29 |
| máscara full face 3m | 50 | 0,08 | 0,82 | 320 | 0,08 | 0,93 | 30 | 0,18 | 0,92 |
| **EPP comercial (proveedor)** | | | | | | | | | |
| venta de epp | 480 | 0,32 | 0,53 | 260 | 0,54 | 0,23 | 20 | 0,26 | 0,81 |
| proveedor de epp | 110 | 0,48 | 0,82 | 20 | 0,63 | 0,94 | 20 | 0,31 | 0,67 |
| tienda de epp | 110 | 0,25 | 0,31 | — | — | — | — | — | — |
| equipos de seguridad industrial | 90 | 0,30 | 0,81 | 70 | 0,49 | 0,36 | 140 | 0,27 | 0,25 |
| dotación industrial | — | — | — | 390 | 0,33 | 0,29 | — | — | — |
| elementos de protección personal bogotá | — | — | — | 110 | 0,36 | 0,40 | — | — | — |
| epp minería / epp lima | 40 / 30 | 0,23–0,26 | — | — | — | — | — | — | — |
| epp industrial | 20 | 0,23 | 0,30 | 20 | 0,16 | 0,08 | 20 | 0,00 | 0,11 |
| **EPP amplio (mayormente informativo)** | | | | | | | | | |
| epp | 12.100 | 0,35 | 0,03 | 12.100 | 0,43 | 0,05 | 2.900 | 0,41 | 0,01 |
| equipos de protección personal | 2.400 | 0,28 | 0,13 | 880 | 0,37 | 0,09 | 1.300 | 0,32 | 0,04 |
| elementos de protección personal | — | — | — | 4.400 | 0,43 | 0,05 | — | — | — |
| **Ambiguo / consumo (excluir o negativizar)** | | | | | | | | | |
| respirador / respiradores | 12.100 | 0,34 | 0,11 | 14.800 | 0,26 | 0,05 | 2.400 | 0,00 | 0,33 |
| mascarilla con filtro | 1.000 | 0,00 | 0,80 | — | — | — | — | — | — |
| máscara de gas | 880 | 0,21 | 0,39 | 320 | 0,08 | 0,78 | 320 | 0,00 | 0,10 |
| respirador n95 | 720 | 0,00 | 0,62 | 390 | 0,00 | 0,35 | 110 | 0,00 | 0,04 |
| máscara antigás | 480 | 0,05 | 0,61 | 210 | 0,08 | 0,79 | 140 | 0,00 | 0,06 |
| máscara para pintar | 320 | 0,11 | 0,81 | 260 | 0,05 | 0,95 | 140 | 0,00 | 0,57 |
| **Guantes (otra línea ARMOR)** | | | | | | | | | |
| guantes anticorte | 2.900 | 0,18 | 0,74 | 1.900 | 0,14 | 0,75 | 390 | 0,10 | 0,47 |
| guantes de seguridad | 2.400 | 0,15 | 0,81 | 1.000 | 0,16 | 0,56 | 260 | 0,00 | 0,16 |
| guantes de nitrilo industrial | 30 | 0,00 | 0,98 | 320 | 0,20 | 0,93 | 30 | 0,15 | 0,53 |
| **Marca y competidores** | | | | | | | | | |
| steelpro | 880 | 0,23 | 0,15 | 880 | 0,21 | 0,27 | 20 | 0,00 | 0,33 |
| indecaucho | 10 | 0,00 | 0,33 | — | — | — | 390 | 0,00 | 0,33 |
| armor epp / armor epps | — | — | — | — | — | — | — | — | — |
| fit test | 20 | 0,00 | 0,33 | 110 | 0,00 | 0,01 | 20 | 0,00 | 0,01 |

Notas sobre los datos:
- “respirador” mezcla el ventilador médico, la respiración y el EPP. Al consultar coincidencias amplias, Semrush devuelve sobre todo consultas sobre respiración (“dificultad para respirar”, “ejercicios de respiración”). No sirve como volumen de EPP. Usarlo solo en concordancia de frase dentro de combinaciones.
- “epp” y “equipos/elementos de protección personal” tienen intención mayormente informativa: estudiantes, cursos y normativa. INFERENCIA: sirven para remarketing o contenido; como palabra clave de compra serían caros en relación con su calidad.
- Las búsquedas con marca ARMOR no tienen volumen medible. “indecaucho” (390 en Ecuador) se refiere a la empresa, no a la línea industrial.
- Steelpro (880 en Perú y Colombia) es un competidor regional con búsqueda de marca propia. INFERENCIA: es la referencia para el “share of search” de una marca de EPP de la región.

### 4.2 Totales por grupo (ESTIMACIÓN: suma simple de las filas anteriores, búsquedas al mes)

| Grupo | Perú | Colombia | Ecuador |
|---|---:|---:|---:|
| Genérico respiratorio industrial (núcleo) | ~3.630 | ~2.400 | ~500 (con muchos valores en el piso) |
| Marca 3M (modelos, filtros, máscaras) | ~4.280 | ~3.870 | ~770 |
| EPP comercial (proveedor, venta, dotación) | ~880 | ~870 | ~310 |
| Guantes de seguridad y anticorte | ~5.330 | ~3.220 | ~680 |
| EPP amplio informativo (excluido del núcleo) | ~14.500 | ~17.380 | ~4.200 |
| Ambiguo o de consumo (excluir) | ~15.500 | ~15.980 | ~3.250 |

Método y límites: suma de volúmenes de Semrush por grupo. Puede haber solapamiento entre variantes de una misma consulta. No incluye la cola larga ni otras variantes regionales (por ejemplo, “tapabocas” en Colombia). El total no es el número de compradores: incluye usuarios finales, talleres, personas que pintan y estudiantes. **Validar con Google Keyword Planner** (rangos por país y pronóstico de clics con presupuesto) antes de fijar metas.

### 4.3 Lectura para el piloto (INFERENCIA)

- **Perú y Colombia justifican Search** con un núcleo de 6.000 a 8.000 búsquedas al mes cada uno si se incluyen los términos 3M. **Ecuador no** alcanza volumen: allí Search conviene como captación mínima (marca, “equipos de seguridad industrial” más ciudad, filtros) y el peso debe ir a LinkedIn y al canal.
- **Perú es el mercado de entrada en 2027 y ya tiene la demanda de búsqueda más alta.** Una campaña de visibilidad en Perú antes de entrar captaría consultas que hoy no tienen a quién derivarse. **Antes de activar, hay que definir el destino comercial en Perú** (distribuidor o asesor) para no generar leads huérfanos en Kommo.
- **Los CPC estimados son bajos (≤ USD 0,5)**, aunque Semrush subestima los CPC de B2B con poca muestra. INFERENCIA: el riesgo de presupuesto en Google es menor que el de calidad del lead. Requiere listas negativas fuertes (N95, pintar, antigás de consumo, cosplay, médico) y formularios o WhatsApp con preguntas de calificación (empresa, RUC/NIT, número de usuarios, contaminante).
- **Términos 3M:** son la mayor bolsa con número de parte. Antes de usarlos en anuncios hay que validar con legal y con las políticas de marcas de Google, y confirmar la compatibilidad técnica real.

---

## 5. Audiencia en LinkedIn

### 5.1 Miembros de LinkedIn por país (HECHO: DataReportal Digital 2026, datos de octubre de 2025; LinkedIn reporta miembros registrados, no usuarios activos)

| País | Miembros (alcance publicitario) | % de la población 18+ | Variación anual | Población |
|---|---:|---:|---:|---:|
| Colombia | 18,0 M | 44,4 % | +3,0 M (+20 %) | 53,6 M |
| Perú | 12,0 M | 48,5 % | +2,0 M (+20 %) | 34,7 M |
| Ecuador | 5,8 M | 44,7 % | +0,8 M (+16 %) | 18,3 M |

### 5.2 Profesionales de SSO/HSE y Compras: lo que se puede y no se puede afirmar

- **HECHO (negativo):** no hay una cifra pública de miembros de LinkedIn por función “SSO/HSE” o “Compras” en estos países. Las cifras que circulan en blogs no tienen método.
- **Colombia, referencia de universo (HECHO, fuente secundaria):** entre 2013 y junio de 2022 se expidieron **171.571 licencias en SST** (96,7 % a personas naturales), según datos de MinSalud citados por Safetya. Es un universo acumulado de personas habilitadas, con duplicados por cambio de título posibles, y no indica si están activas.
  - **ESTIMACIÓN aritmética (techo, no pronóstico):** 171.571 × 44 % de penetración adulta de LinkedIn ≈ **75 mil** personas con licencia SST que podrían estar en LinkedIn. El número real alcanzable con segmentación por cargo o habilidad será menor, porque no todas actualizan su perfil ni trabajan en industria.
- **Ecuador, referencia de universo (HECHO normativo):** el DE 255 obliga a designar un técnico de SST en toda empresa de 50 o más trabajadores y a sumar técnicos adicionales según dotación (§2.2). INFERENCIA: el universo de técnicos de SST se acerca al número de empresas medianas y grandes más los técnicos adicionales. No se obtuvo el conteo de empresas por tamaño en esta corrida (fuente sugerida: directorio de empresas del INEC).
- **Perú, referencia de universo (HECHO):** la minería emplea ~264 mil personas directas (promedio de 2025), el 72 % en contratistas. INFERENCIA: cada titular y cada contratista minero mantiene un área SSOMA, pero no hay un ratio público de personal SSOMA por trabajador.
- **Compras:** sin cifra pública. La segmentación deberá combinar la función “Compras” con industrias (minería, petróleo y gas, química, manufactura, construcción, agroindustria) y tamaño de empresa.

### 5.3 Cómo medirlo antes del caso de negocio (recomendado, sin costo)

1. En **LinkedIn Campaign Manager**, crear un borrador de campaña (sin publicar) por país y consultar el **pronóstico de audiencia** con dos segmentos:
   - **SSO/HSE:** cargos (seguridad industrial, SST/SSO, HSE/HSEQ, SSOMA, prevención de riesgos, higiene industrial) o habilidades (“Seguridad y salud en el trabajo”, “Seguridad industrial”, “HSE”) × industrias objetivo × empresas de 51 o más empleados.
   - **Compras:** función “Compras” × mismas industrias y tamaños.
2. Registrar en el caso de negocio el tamaño pronosticado, la fecha y la configuración exacta (marcada como dato de plataforma).
3. Repetir para Perú con el mismo segmento para dimensionar la campaña de visibilidad previa a 2027.

INFERENCIA de expectativa: con 5,8 M de miembros en Ecuador, la audiencia SSO/HSE en industrias objetivo será pequeña (probablemente miles, no decenas de miles). Eso favorece frecuencia controlada, formatos de documento o contenido técnico y Lead Gen Forms. **Esta expectativa no es una cifra y debe reemplazarse por el pronóstico de Campaign Manager.**

---

## 6. Qué falta y siguiente paso

| Brecha | Por qué importa | Cómo cerrarla |
|---|---|---|
| Tamaño real de audiencias LinkedIn SSO/Compras | Define presupuesto, frecuencia y CPL esperado | Pronóstico de Campaign Manager (§5.3) |
| Volúmenes de Google con datos propios de Google | Semrush subestima Ecuador y el B2B de cola larga | Keyword Planner por país, con rangos y pronóstico |
| Texto oficial de la Res. 0312/2019, Res. 2400 arts. 182–184, NTC 3852, vigencia del RTE INEN 181 (3R) y texto consolidado del DS 024 | Evita citar normas mal en piezas públicas | Revisión legal o técnica con ARMOR; textos oficiales en Diario Oficial, Registro Oficial, El Peruano e INEN |
| Compatibilidad de filtros ARMOR con máscaras de terceros | Decide si se pujan términos 3M y cómo | Validación técnica de ARMOR |
| Importadores por subpartida | Mapa de competidores y distribuidores | SUNAT, SENAE y DIAN (consulta por importador) |
| Destino comercial en Perú | Evita leads sin atención | Decisión comercial de ARMOR antes de activar Perú |

---

## Fuentes (todas consultadas el 27/10/2026)

**Demanda de búsqueda**
- Semrush, Keyword Overview, base Perú: https://www.semrush.com/analytics/keywordoverview/?db=pe
- Semrush, Keyword Overview, base Colombia: https://www.semrush.com/analytics/keywordoverview/?db=co
- Semrush, Keyword Overview, base Ecuador: https://www.semrush.com/analytics/keywordoverview/?db=ec
- Semrush, Keyword Magic “respirador” (PE/CO), usado para comprobar la ambigüedad del término: https://www.semrush.com/analytics/keywordmagic/?db=pe&q=respirador

**Importaciones**
- UN Comtrade, API pública preview, HS 902000, importaciones, reporters 604 (PE), 170 (CO) y 218 (EC), 2021–2025: https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=604&period=2024&partnerCode=0&cmdCode=902000&flowCode=M (misma consulta con los otros reporters y años) · portal: https://comtradeplus.un.org/

**Mercado e industrias**
- Bonafide Research, Colombia PPE (resumen de un informe pagado; no se recomienda citarlo): https://dri.co.jp/auto/report/bonafide/230430-colombia-personal-protection-equipment.html
- El Peruano, empleo minero récord (MINEM): https://elperuano.pe/noticia/290007-minem-actividad-minera-alcanzo-cifra-record-historica-en-generacion-de-empleo-directo
- ProActivo, empleo minero de octubre de 2025: https://proactivo.com.pe/empleo-minero-supera-los-280-mil-puestos-y-marca-record-a-octubre-de-2025/
- Energiminas, empleo minero de junio de 2025: https://energiminas.com/2025/08/20/minem-mas-de-256-mil-puestos-de-trabajo-directos-genero-actividad-minera-en-junio/
- Primicias, empleo IESS 2025 (minas y canteras): https://www.primicias.ec/revistagestion/analisis/empleo-domestico-afiliacion-seguro-social-ecuatoriano-118036/
- El Diario (Ecuador), PEA por sectores: https://www.eldiario.ec/negocios/en-estos-sectores-economicos-se-concentra-la-poblacion-economicamente-activa-en-ecuador-20082025/
- UPRA, empleo diciembre de 2025 (GEIH DANE): https://upra.gov.co/sites/default/files/2026-02/Empleo%20diciembre%20de%202025.pdf
- CCS / boletín Fasecolda, afiliados ARL 2025: https://ccs.org.co/observatorio/assets/boletin_fasecolda/6997727873dbe.pdf

**Regulación: Perú**
- Ley 29783 (texto en gob.pe): https://cdn.www.gob.pe/uploads/document/file/311120/Ley_de_Seguridad_y_Salud_en_el_Trabajo_-_Ley_29783.htm.pdf
- DS 005-2012-TR (texto en gob.pe): https://cdn.www.gob.pe/uploads/document/file/571763/Decreto_Supremo_N__005-2012-TR.pdf
- DS 024-2016-EM (texto en gob.pe, publicación original de 2016): https://cdn.www.gob.pe/uploads/document/file/901782/DS-024-2016-EM.pdf
- SINIA, ficha del DS 024-2016-EM (vigencia y modificatorias): https://sinia.minam.gob.pe/normas/aprueban-reglamento-seguridad-salud-ocupacional-mineria
- lpderecho, DS 024-2016-EM actualizado (referencia de modificatorias; acceso 403 al texto): https://lpderecho.pe/reglamento-de-seguridad-y-salud-ocupacional-en-mineria-ds-024-2016-em-actualizada-2026/
- SNI, aprobación de la NTP 329.201:2020: https://sni.org.pe/aprueban-normas-tecnicas-peruanas-sobre-dispositivos-de-proteccion-respiratoria-guantes-de-proteccion-contra-los-productos-quimicos-y-los-microorganismos-peligrosos-y-materiales-medicos/
- Buenaventura, estándar E-COR-SIB-11.02 Protección Respiratoria: https://buenaventura.com/assets/uploads/e_cor_sib/2018/E-COR-SIB-11.02%20Protecci%C3%B3n%20Respiratoria%202018.pdf

**Regulación: Ecuador**
- Decreto Ejecutivo 255 (copia institucional del texto): https://www.emapasr.gob.ec/htm/archivos/LOTAIP_2025/mayo/transparencia_activa/link/25.-%20Decreto%20Ejecutivo%20N%C2%B0%20255%20-%202024.pdf
- Ministerio del Trabajo, página del reglamento: https://www.trabajo.gob.ec/reglamento-de-seguridad-y-salud-en-el-trabajo/
- El Universo, nota sobre el reglamento: https://eluniverso.com/noticias/economia/reglamento-seguridad-salud-trabajo-nota/
- OMC/ALADI, notificación G/TBT/N/ECU/540 (PRTE INEN 181, 3R, “Equipos de protección respiratoria”, 20/06/2024): https://www2.aladi.org/nsfaladi/normasTecnicas.nsf/ccc11adff39a6a9403257cf600683dc4/c9ac95034636637d03258ad10053407d/$FILE/ECU_540.pdf

**Regulación: Colombia**
- Decreto 1072 de 2015 (Gestor Normativo, Función Pública): https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=72173
- Resolución 2400 de 1979 (MinSalud, PDF): https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/INEC/IGUB/mintrabajo-resolucion-2400-de-1979.pdf · SISJUR: https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=53565
- Resolución 0312 de 2019 (réplica oficial no recuperable; resumen secundario): https://consultorsalud.com/salud-en-el-trabajo-estandares-minimos-resolucion-0312-de-2019-mintrabajo/ · documento de compra pública que cita la obligación de entrega y capacitación de EPP: https://operaciones.colombiacompra.gov.co/sites/cce_public/files/documentos_adicionales_oc/documentos_precontractuales_46.pdf
- Posipedia (Positiva ARL), homologación de EPP: https://posipedia.com.co/wp-content/uploads/2025/05/Sesion-3-Homologacion-de-elementos-de-proteccion-personal-en-la-empresa.pdf
- Guía EPP ANSI/USAID (referencia de la NTC 3852): https://share.ansi.org/Shared%20Documents/Standards%20Activities/International%20Standardization/Standards%20Alliance/PPE%20Guide_Final_Spanish.pdf
- Safetya, licencias SST expedidas 2013–2022 (con datos de MinSalud): https://safetya.co/cuantas-licencias-de-salud-ocupacional-hay-en-colombia/

**LinkedIn**
- DataReportal, Digital 2026 Peru: https://datareportal.com/reports/digital-2026-peru
- DataReportal, Digital 2026 Colombia: https://datareportal.com/reports/digital-2026-colombia
- DataReportal, Digital 2026 Ecuador: https://datareportal.com/reports/digital-2026-ecuador
