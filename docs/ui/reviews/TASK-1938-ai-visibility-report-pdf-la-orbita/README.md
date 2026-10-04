# TASK-1938 — Revisión del PDF exportado

Refresh local del PDF existente con react-pdf. Prueba sintética, sin datos reales de cliente, envíos ni despliegue. El estado de rollout permanece pendiente.

## Archivos revisables

- [PDF ES prospecto](proofs/es-prospect.pdf) · [PDF ES cliente](proofs/es-client.pdf)
- [PDF EN prospecto](proofs/en-prospect.pdf) · [PDF EN cliente](proofs/en-client.pdf)
- [PDF PT-BR prospecto](proofs/pt-BR-prospect.pdf) · [PDF PT-BR cliente](proofs/pt-BR-client.pdf)
- [Sin datos](proofs/es-null.pdf) · [Puntaje cero](proofs/es-zero.pdf) · [Puntaje cien](proofs/es-optimal.pdf) · [Texto extenso](proofs/es-long.pdf)
- [24 comparaciones color y gris](comparison.html): abrir el HTML en un navegador. Referencia aprobada a la izquierda, PDF real a la derecha. Cada hoja permite desplegar la comparación en gris.
- [Baseline anterior](baseline.pdf), cuatro páginas y 82.463 bytes, con [procedencia](baseline.metadata.json).
- [Manifest de hashes, páginas, fuentes y enlaces](manifest.json) · [contraste medido](contrast.json).

El fixture congelado tiene valores diferentes de los ejemplos del canvas. Se conservan sus métricas; no se copian cifras ilustrativas de la referencia. La referencia del 29/09 precede a la aprobación del arco de recorrido que ahora exige AXIS.

## Resultado local observado

Las seis variantes normales tienen seis páginas A4. El fixture largo tiene siete: conserva el nombre completo en una portada y continúa las recomendaciones con encabezado y folio. Los estados sin dato y cero son distintos. Los diez PDFs contienen texto seleccionable y fuentes embebidas; textos y enlaces quedan dentro de cada MediaBox. Los PDF normales y largo respetan el margen interior, verificado también por un revisor independiente.

LinkedIn, Instagram, YouTube y Threads se ven y enlazan en el cierre de prospecto. Los recursos oficiales ya incluyen su círculo: se presentan completos a 40 px, sin una segunda reducción ni un contorno duplicado. Cliente conserva responsable y correo; sólo muestra fecha del próximo informe si se suministra una fecha válida. Un logo de cliente genérico usa placa clara; los activos para fondo oscuro conservan su transparencia.

Revisión independiente `final_pdf_review` (03/10): sin hallazgos materiales en ES/EN/PT-BR, cliente/prospecto y estrés. Corregidos durante QA: altura A4, bordes alpha, folios, RRSS, superposición de niveles PT-BR, ancho de recomendaciones, nombre largo y título huérfano. Advisory menor: una palabra del veredicto en cero/sin dato tiene sobrepaso óptico de 1,05 pt sobre el margen; permanece dentro de la hoja, sin corte ni colisión.

En gris, etiquetas de gravedad, unidades y valores conservan la lectura sin depender del color. Contraste de texto secundario: 5,47:1 sobre papel, 5,05:1 sobre superficie; texto claro 12,71:1 sobre Engine. Los colores de gravedad de portada superan 4,5:1.

## Correcciones de anotaciones del operador (03/10)

- El código interno `ai_visibility_score_v2` ya no se imprime: se muestra la versión pública `2`. La procedencia original permanece intacta en el modelo; identificadores desconocidos de puntaje o preguntas no se usan como fallback visible.
- Chip de período: contenedor independiente con borde y padding simétrico, texto centrado y line-height propio. Reexportadas las diez variantes.
- Pie confirmado contra el canvas y wireframe aprobados: organización/período, burbuja web oficial y folio. No llevaba el lockup de Insights; se conserva la identidad AI Visibility Report.
- Regresión de esta corrección: cuatro suites / 49 tests PASS, incluidos diez exports reales; ESLint focal y TypeScript PASS. `annotation-fixes-tests.log`. El build y la suite completa de la sección anterior corresponden al corte anterior a estas correcciones acotadas.

## Límites y continuidad

- El snapshot, scores, recomendaciones seleccionadas y política de disclosure son los mismos. El PDF aplica las etiquetas canónicas 40/70; no recalcula niveles ni cambia los otros adapters.
- La tendencia continúa excluida por el contrato `attachment`. No se inventa primera medición para un histórico oculto. El resolver AXIS se prueba para estados que expresa, sin usarlo para ampliar disclosure.
- El copy reconocido se localiza; un hallazgo histórico desconocido permanece literal para no reescribir evidencia congelada.
- El contexto comercial se verifica después de los gates originales. Una identidad contradictoria falla cerrado por el error path existente; un logo ilegible conserva nombre y audiencia. No hay nuevas consultas a modelos ni nuevos envíos.
- La extensión editorial proviene del productor AXIS local y queda sellada en `ai-visibility-layout.generated.json`; no es una publicación de AXIS. Los pins instalados se mantienen. Retirar esta proyección al adoptar una versión publicada equivalente.
- La task permanece `in-progress` hasta rollout autorizado y revisión del adjunto real en staging/producción. Web y print conservan su diseño anterior.

## Reproducción

```sh
pnpm exec tsx scripts/build-pdf-brand-assets.ts --ai-visibility-report
uv run --no-project --with fonttools==4.60.1 --no-python-downloads python scripts/pdf/build-ai-visibility-fonts.py --check
AI_VISIBILITY_PDF_QA=1 pnpm exec vitest run --project unit src/components/growth/ai-visibility/report-artifact/__tests__/report-pdf-export.qa.test.ts
python3 scripts/pdf/build-ai-visibility-review.py
```

El QA de exportación usa `pdftotext`, `pdffonts` y `pdftoppm` de Poppler. Guarda pruebas en `.captures/task-1938/after`; el compilador del dossier verifica los hashes antes de copiar. El baseline se capturó desde HEAD antes de sustituir el renderer. Los hashes del modelo se comparan antes y después de cada render.

Validación final de repositorio y limitaciones: ver `verification.md`.

Revisión independiente de las correcciones (03/10, exports 17:13): chip centrado y sin cortes en ES/EN/PT-BR; metodología sin identificadores técnicos; diez PDFs sin texto ni enlaces fuera de hoja. Pie aprobado conservado.

Build final previo al commit (03/10): PASS sobre las correcciones de anotaciones, dist `.next-local/build-20261003223513-37388`. La nota anterior de build previo queda sustituida por esta comprobación.
