# SKY · Primer lote de recuperación orgánica

La [matriz de cobertura](COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md) mantiene abiertos siete frentes
del diagnóstico integral. Este documento concreta el lote de implementación; ambos avances se registran
por separado, sin convertir un lote preparado en una auditoría integral cerrada.

Estado al 15-10-2026: preparado para revisión e implementación coordinada. El sitio no fue modificado.
El plan conserva el alcance del servicio; la aprobación de contenido y las capacidades de WordPress/infra
se comprueban antes de ejecutar. Julio autorizó profundizar y preparar el lote.

## Decisión y selección

Dos frentes coordinados: reparar fallos actuales comprobados y optimizar contenido existente útil para
viajeros. El Excel contiene 20 URLs: diez del primer lote y diez de revisión posterior. El primer lote
reúne nueve artículos existentes y una URL histórica 404; la URL rota y la guía actual de cambios de vuelo
son una decisión coordinada, no dos artículos nuevos.

| Orden | URL del blog | Acción propuesta |
| --- | --- | --- |
| 1 | /como-cambiar-un-vuelo-en-sky-pasos-y-condiciones/ | Resolver el 404 histórico; acreditar equivalencia antes de consolidar o recuperar contenido. |
| 2 | /equipaje-de-cabina/ | Respuesta práctica, condiciones oficiales, metadatos y carga móvil. |
| 3 | /tipos-de-equipaje/ | Comparar categorías sin duplicar la intención de cabina. |
| 4 | /sky-plus/ | Cuenta, puntos y canjes verificados con las condiciones del programa. |
| 5 | /cambiar-vuelo-sky/ | Pasos y reglas oficiales; coordinar la decisión sobre la URL larga rota. |
| 6 | /lugares-turisticos-chile/ | Reparar CTA literal y ordenar por zonas, tiempo y ciudad base. |
| 7 | /destinos-de-verano/ | Intención y snippet, clima por destino y selección por perfil. |
| 8 | /panoramas-para-ninos-en-santiago/ | Comprobar disponibilidad y organizar por edad, clima y tiempo. |
| 9 | /viajar-con-perros/ | Disponibilidad SKY y requisitos por origen/destino; validación sensible. |
| 10 | /trujillo-peru/ | Piloto Perú doméstico por prioridad de negocio, sin presentarlo como la mayor pérdida. |

Las fichas incluyen intención, sinopsis, evidencia, títulos y metadatos propuestos cuando corresponde,
estructura, consultas visibles con país, fuentes por comprobar y aceptación. Son propuestas para aprobar
antes de desarrollar los textos completos. Conservar los slugs. El
[playbook vivo](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e) y la
[voz de SKY](https://app.notion.com/p/a7339c2fefe782b99e22013d9a5f0647) gobiernan la producción.

## Evidencia nueva de GSC

Host actual, búsqueda web, datos finales. Los cortes independientes de página y de país del blog completo reconcilian exactamente con
sus controles sin consulta. Normalizar por día cuando difiere la duración; no atribuir causalidad.

| Fase | Días | Clics | Impresiones | Clics/día |
| --- | ---: | ---: | ---: | ---: |
| Noviembre–diciembre 2025 | 61 | 94.896 | 6.510.718 | 1.555,67 |
| Enero–febrero 2026 | 59 | 138.879 | 11.768.235 | 2.353,88 |
| Marzo–abril 2026 | 61 | 83.720 | 7.849.611 | 1.372,46 |
| Agosto–septiembre 2026 | 61 | 60.015 | 4.482.554 | 983,85 |

Agosto–septiembre: Chile 32.910 clics y Perú 17.676, en el control por país del blog completo.
Las consultas cruzadas con página y país suman 11.784 clics frente a 32.800 del control de las veinte
URLs (35,93%). Las 21.996 filas visibles no reconstruyen consultas ocultas. El cruce página×país filtrado
da los mismos 11.784; sin filtro también queda por debajo del control global. Ambos se etiquetan parciales;
no describen la distribución completa de países de cada artículo. Ausencia de fila no equivale a demanda cero.

Piura y Huacachina tienen filas GSC de noviembre–diciembre de 2025 aunque su fecha actual del CMS sea de
2026. No inferir que una pieza es nueva sólo por su fecha publicada actual. SKY Plus se compara desde su
primer dato visible, sin fabricar una caída de 2025.

## Secuencia y responsables propuestos

1. **Habilitación y baseline:** Leandro/SKY confirma usuario nominal, capacidades WordPress, backup,
   staging y dueño de infraestructura/GTM. Efeonce congela T−28..T−1 al ejecutar; septiembre no sustituye
   automáticamente el período anterior a una publicación futura.
2. **Correcciones técnicas:** revisar los 21 destinos 404; implementar sólo enlaces con destino aprobado;
   excluir 14 layouts del sitemap/indexación con el método apropiado; reparar CTA después de validar su
   destino. El dueño de Azure valida origen y dependencias antes de cambiarlo.
3. **Refresh aprobado:** Natalia/SKY revisa títulos y sinopsis. Efeonce desarrolla las piezas aprobadas,
   verifica políticas y rutas oficiales, publica según acceso/calendario y comprueba cada URL final.
4. **Seguimiento:** registrar actor, versión, fecha efectiva y lectura posterior. Revisiones a 28 y 56 días
   y cierre mensual hasta enero. El Excel calcula fechas cuando se registra una intervención real.

La ventana noviembre–enero es de trabajo y evaluación, no garantía de recuperación. No se crearon
automatizaciones ni citas. Los roles son propuestos y las asignaciones efectivas se confirman en kickoff.

## Aceptación de los cambios

- Redirect: equivalencia acreditada, cadena prevista sin bucle, destino 200 y canonical correcto.
  Ningún 301 se activa por parecido de slug ni se envían URLs sin equivalente a home.
- CTA/enlace: componente visible y destino útil aprobado. La landing histórica del CTA 4955 devuelve
  404; requiere un destino recuperado o nuevo antes de reponer el botón. No reactivar un plugin antiguo
  sólo para interpretar shortcodes.
- Contenido: intención y datos revisados, aprobación registrada, metadatos coherentes y URL final
  verificada en desktop/móvil. Actualizar el estado real en Notion cuando se ejecute.
- Plantilla: metas únicas y schema derivado de autoría/fechas reales. GTM y consentimiento tienen
  validación propia; no alterar eventos como parte de una edición de texto.
- Resultados: comparar clics/impresiones por día, CTR y posición con cohortes y estacionalidad. Las
  sesiones GA4 por página no se suman para inferir sesiones únicas. Ventas y ROI requieren atribución probada.

## Entrega y estado real

Carpeta: outputs/sky-seo-recovery-2026-10-15/. Plan PDF y HTML editable, Excel operativo, fichas Markdown/JSON,
metadatos CSV y manifiestos técnicos. Fuentes y scripts: .captures/sky-organic-audit-2026-10-15/recovery-plan/.
Los archivos anteriores se conservan.

Fuentes: readers canónicos GA4/GSC, WordPress/HTML público, archivo histórico, recibos DataForSEO existentes
y normas de Notion consultadas el 15/10. Sin gasto adicional DataForSEO ni cambios en el sitio, Azure o GTM.
Acceso WordPress autenticado, dueño técnico efectivo y aprobación del lote pendientes de comprobar.
Estos pendientes limitan la implementación; la preparación analítica y editorial está realizada.

Ver [auditoría y evidencia](../../audits/growth/2026-10-15-sky-organic-channel-audit.md) y
[marco del servicio](README.md).
