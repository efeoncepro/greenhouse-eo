# CMP-001 · Handoff vigente para producción y pauta

22/09/2026. Canon: [registro CMP](../EFEONCE_CAMPAIGN_REGISTRY_V1.md) y [manifiesto/MCP](../EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md).

## Entrada para personas y agentes

OneDrive local, bajo `Alineación/5. Contenidos/15. Paid Media/`:
- `03. Finales/CMP-001 - Lo que la IA dice de ti/ABRIR CATALOGO.html`: elegir por imagen/titular y copiar texto externo.
- En la misma carpeta: `CONTROL-DE-PAUTA.csv`, `GUIA-DE-PAUTA.md` y **`PAUTA-PARA-AGENTES-MCP.md`** completo.
- `01. Recursos/CMP-001 - Produccion y editables/MANIFIESTO-PAUTA.json`: fuente del plan paid; `actualizar-catalogo.py` regenera vistas.
- Recetas originales conservadas en Recursos; `MAPA-DE-RUTAS.json` resuelve las ubicaciones anteriores. Finales separa imágenes/videos y ratios, sin nombres de agentes.

28 exports existentes: 25 PNG y 3 MP4. 48 perfiles de copy y 72 alternativas de archivo/canal/placement/variante; no activar todas. JSON/CSV/MD contrastados: IDs, caracteres, UTMs, copy literal y configuraciones completos. Los archivos bajo demanda/hash pendiente están declarados. El video 4:5 y su portada se cargaron para el lanzamiento orgánico descrito abajo. No se activó pauta.

## Decisiones y estado

- **Programación orgánica CMP-001 + CMP-002:** las 28 publicaciones quedaron programadas y verificadas en Metricool el 24/09/2026 para LinkedIn e Instagram de Efeonce y LinkedIn personal de Julio Reyes. La secuencia, los estados y el readback por post están en el [registro de programación](2026-09-24-cmp001-cmp002-organic-programming.md). `PENDING` no significa publicado.

- [CDR-001](../../campaigns/decisions/CDR-001-cmp001-always-on-q4-2026.md) Accepted: Q4/renovación Q1 y derechos de criaturas declarados por operador; no reabrir permisos.
- [CDR-006](../../campaigns/decisions/CDR-006-cmp001-manifiesto-copy-y-pauta.md) Proposed: CL/CO/MX/PE confirmados; US$4.000/mes base sugeridos, diciembre US$3.000; Q4 US$11.000. Presupuesto sin aprobación.
- [CDR-005](../../campaigns/decisions/CDR-005-cmp001-embudo-momento-y-accion.md) Proposed: propuesta posterior del embudo. No resolver su dirección contra CDR-002 por fecha solamente. Este manifiesto cubre artes existentes de diagnóstico; nuevos MOFU/BOFU no producidos ni activados.
- Destino del plan paid general: landing AEO; el lanzamiento orgánico usa el grader gratuito. Lectura pública confirma oferta; formulario, CRM y atribución no probados en este corte.
- Calificación del operador: contacto `opportunity` en HubSpot; reserva/asistencia y deal se observan por separado.
- MCP: descubrir herramientas/cuentas reales y leer estado persistido; el handoff no acredita capacidad paid ni autorización de gasto. Las tres programaciones orgánicas se detallan abajo.

## Continuidad

Estrategia/copy viven en `Alineación/2. Campañas/CMP-001_la-ia-dice-de-ti/`, con BRIEF y `medicion/COPY-Y-CONFIGURACION-DE-ANUNCIOS.md` apuntando al manifiesto. Para ejecutar, leer primero el Markdown MCP, no los LEEME históricos de paquetes técnicos. La historia anterior queda en git y `decisiones/historico-handoff-repo-pre-manifiesto.md` de la campaña.

Pendientes de lanzamiento paid: inversión autorizada, cuenta/pagador/moneda/horarios/owners, audiencia disponible, conversión y persistencia de UTMs verificadas, preview real por placement. No se implementó TASK-1885 ni se alteraron artes.

## Lanzamiento orgánico del grader — programación verificada 22/09/2026

El operador aprobó los tres textos BeX y solicitó programar por Metricool mencionando Efeonce.
Destino literal aprobado: https://think.efeoncepro.com/brand-visibility (sin UTM en estos posts).
Gratuidad y primer lanzamiento al mercado declarados por el operador. No extender esa aprobación a gasto paid.

| Cuenta | Fecha local (America/Santiago, UTC−03:00) | UTC | ID Metricool | Estado leído |
|---|---|---|---|---|
| LinkedIn Efeonce · 3961547 | 22/09/2026 13:00 | 22/09 16:00Z | 380118279 | PENDING |
| LinkedIn Julio · 5105024 | 23/09/2026 11:00 | 23/09 14:00Z | 380118468 | PENDING |
| Instagram Efeonce · 3961547 | 23/09/2026 14:00 | 23/09 17:00Z | 380118345 | PENDING |

Video `CMP001-01-video-4x5`, Codex en el atril: 1080×1350, 15,104 s, H.264/AAC;
SHA-256 `a016e72f152583ec44b6f3aca6ea4fb01493f50b00547967d2542b4168ec977f`.
Portada: PNG final del mismo concepto. Instagram REEL con showReelOnFeed e isAiGenerated;
se conserva el 4:5 pedido, no se presenta como adaptación 9:16. LinkedIn POST con previewIncluded=false.
Readback por los tres IDs: copy literal, fecha, MP4, portada, autoPublish=true, draft=false y PENDING.
La mención LinkedIn persiste como `@[urn:li:organization:20503593|Efeonce]`; Instagram como `@efeoncepro`.
La resolución pública de las menciones y la publicación efectiva requieren evidencia posterior.

Fuentes operativas en OneDrive, dentro de las carpetas ya existentes:
- Recursos: `LANZAMIENTO-GRADER.json` (copy de lanzamiento), `PROGRAMACION-GRADER-APROBADA.json` (IDs/readback saneado).
- Finales: `PROGRAMACION-GRADER.md` y `COPYS-LANZAMIENTO-GRADER.md` (textos y enlaces al planner).

Los horarios cruzan mejores horas de Metricool con la cola; Instagram evita el post ya previsto el 22/09 a las 16 h.
El upload se verificó por HTTP 200 y MIME; CLI y ADC se renovaron con el runner canónico sin modificar IAM.
No recrear estos posts ni publicar el borrador anterior de LinkedIn. No se cambió la bio de Instagram:
el URL del caption se entrega como texto. No afirmar atribución individual por UTM ni monitoreo recurrente.
