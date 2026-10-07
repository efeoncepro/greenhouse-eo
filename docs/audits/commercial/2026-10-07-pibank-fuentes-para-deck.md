# Pibank · Fuentes vigentes para el deck · 07-10-2026

Revisión documental v0.6.1; modelo/capturas v0.6. Preparación local autorizada por Julio con tres subagentes. Claude preparará el nuevo deck; sin envío, nuevo deck, commit, push, gasto de research ni aprobación económica en esta revisión.

## Correcciones y continuidad

- Expediente/minuta/README/Business Case/Sales Pod enlazan el [brief vigente](../../commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/BRIEF-PARA-DECK-VIGENTE.md). Cinco consultas/3.690 y 33.210 son historia; 19 representantes actuales incluyen seis directos/3.740 mensuales. Los cuatro carriles no son TAM ni visitas.
- Propuesta y resumen distinguen 760 aperturas → 38.000 visitas → 494 fondeadas de 760 fondeadas → ~1.170 aperturas → ~58.462 visitas. Tasas 2%/65% ilustrativas; USD38m es inferencia del operador. Unidad/período bancarios pendientes.
- Doce meses y PR siguen por instrucción posterior de Julio; seis meses de la reunión permanece en su contexto histórico. No atribuir aceptación al banco.
- Comparativos con marcas M4–M7 requieren aprobación específica de Producto/Cumplimiento de fuentes, fecha, método y claims; alternativa general sin marcas dentro de las 12 entregas. Es una condición propuesta, no aprobación obtenida.
- [CMS público](../../commercial/prospects/banco-pichincha-peru-seo-2026/research/CMS-PIBANK-2026-10-07.md): WordPress en home/producto; registro/app/accesos no inferidos.
- Render anterior `pr-deck-render/` identificado como histórico. Deck14 v0.6 archivado fuera de la carpeta actual cliente, hash histórico preservado. Propuesta/resumen v0.6 también preservados antes de reemplazar sus copias actuales.

## Artefactos y evidencia

[Manifest vigente](../../commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/delivery-manifest.json): dos PDFs v0.6.1 (11/2 páginas), Excel v0.6 e histórico independiente. Las 13 páginas finales fueron renderizadas desde PDF con pdftoppm, revisadas en conjunto y ampliadas en tablas/condiciones. QA: fuentes cargadas, cero desbordes e imágenes rotas. Copias finales coinciden por SHA256. PDF/UA no verificado.

Los nueve archivos del manifest económico v0.6 conservaron hashes, incluido XLSX. No se recalculó: 29 pruebas nativas, 1.303 fórmulas y cero errores de caché corresponden a la verificación del 06-10; la revisión actual comprueba integridad. Excel Desktop no verificado.

Paquete interno para Claude: `/Users/jreye/Documents/Banco Pichincha Peru — Prospect Case/02-Uso-interno/Pibank-Fuentes-para-Claude-2026-10-07.zip`. Contiene brief, fuentes de lectura, modelo y dos PDFs; manifest propio por archivo e integridad ZIP comprobada. Algunos enlaces de detalle remiten al repositorio completo. No es un adjunto cliente ni se envió a Claude.

## Trabajo de subagentes

`pibank_expediente`: diez documentos de contexto/estado; `metodo_caso_negocio`: brief único con cinco láminas sugeridas y matriz de hechos/decisiones/supuestos; `skills_caso_negocio`: auditoría de modelo/hashes/PDF y detección del render histórico, sin modificar skills. Los procedimientos vigentes ya distinguían requisitos de forecasts; no requerían cambios adicionales para esta corrección documental. Integración y QA final realizados por el agente principal.

## Pendientes reales

**Aporte esperado a aperturas del programa completo y contrafactual cuantificado de lanzamiento siguen pendientes.** La corrección de documentos no produce un forecast. También faltan definiciones/denominadores bancarios, continuidad autorizada web/registro, valoración neta, costos/roster/fee y aprobación de comparativos. El brief obliga a conservar estas etiquetas en el deck.

## Verificación final

[Readback final](2026-10-07-pibank-fuentes-para-deck-checks.json): 433 destinos Markdown válidos y 3 anchors del brief comprobados; 19 representantes y sumas por carril conciliados. Unidades/CMS/revisión comprobados en texto del PDF final. Cuatro hashes de entrega/histórico, nueve económicos y 25 archivos del ZIP coinciden.

`git diff --check` PASS preservando hard breaks Markdown intencionales; closure estricto acotado: cero warnings; `pnpm docs:context-check:strict`: cero errores/warnings. No se ejecutan pruebas runtime ni se trasladan las pruebas nativas históricas a una nueva certificación económica.

## Aclaración posterior: jerarquía del cálculo inverso

El operador preguntó si 762 era el cierre. Se verificaron resultados de meta-hacia-atras y XLSX nativo:
760 es sólo 5%; el 100% monetario provisional exige 15.200 fondeadas/~23.385 aperturas/~1.169.231 visitas.
El Excel inicia en 1%/Aperturas (152), no en 5%. Se corrigió la prioridad del brief y su lámina3: mostrar primero
la meta completa y después sensibilidades. Requisitos desde la meta sí existen; aporte esperado del programa
sigue pendiente. PDFs/modelo conservan sus hashes; no se recalculan ni se les atribuye forecast.

Paquete actualizado para Claude: `Pibank-Fuentes-para-Claude-2026-10-07-meta-completa.zip`; reemplaza la copia
anterior para preparar el deck. El brief gobierna su orden sobre las bandas parciales de los PDFs.
