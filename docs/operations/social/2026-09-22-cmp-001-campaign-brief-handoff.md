# CMP-001 · Handoff vigente para producción y pauta

22/09/2026. Canon: [registro CMP](../EFEONCE_CAMPAIGN_REGISTRY_V1.md) y [manifiesto/MCP](../EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md).

## Entrada para personas y agentes

OneDrive local, bajo `Alineación/5. Contenidos/15. Paid Media/`:
- `03. Finales/CMP-001 - Lo que la IA dice de ti/ABRIR CATALOGO.html`: elegir por imagen/titular y copiar texto externo.
- En la misma carpeta: `CONTROL-DE-PAUTA.csv`, `GUIA-DE-PAUTA.md` y **`PAUTA-PARA-AGENTES-MCP.md`** completo.
- `01. Recursos/CMP-001 - Produccion y editables/MANIFIESTO-PAUTA.json`: única fuente operativa; `actualizar-catalogo.py` regenera vistas.
- Recetas originales conservadas en Recursos; `MAPA-DE-RUTAS.json` resuelve las ubicaciones anteriores. Finales separa imágenes/videos y ratios, sin nombres de agentes.

28 exports existentes: 25 PNG y 3 MP4. 48 perfiles de copy y 72 alternativas de archivo/canal/placement/variante; no activar todas. JSON/CSV/MD contrastados: IDs, caracteres, UTMs, copy literal y configuraciones completos. Los archivos bajo demanda/hash pendiente están declarados. No se ejecutó QA visual nuevo, upload ni pauta.

## Decisiones y estado

- [CDR-001](../../campaigns/decisions/CDR-001-cmp001-always-on-q4-2026.md) Accepted: Q4/renovación Q1 y derechos de criaturas declarados por operador; no reabrir permisos.
- [CDR-006](../../campaigns/decisions/CDR-006-cmp001-manifiesto-copy-y-pauta.md) Proposed: CL/CO/MX/PE confirmados; US$4.000/mes base sugeridos, diciembre US$3.000; Q4 US$11.000. Presupuesto sin aprobación.
- [CDR-005](../../campaigns/decisions/CDR-005-cmp001-embudo-momento-y-accion.md) Proposed: propuesta posterior del embudo. No resolver su dirección contra CDR-002 por fecha solamente. Este manifiesto cubre artes existentes de diagnóstico; nuevos MOFU/BOFU no producidos ni activados.
- Destino seleccionado: landing AEO. Lectura pública confirma oferta; formulario, CRM y atribución no probados en este corte.
- Calificación del operador: contacto `opportunity` en HubSpot; reserva/asistencia y deal se observan por separado.
- MCP: descubrir herramientas/cuentas reales y leer estado persistido; el handoff no acredita capacidad paid ni autorización de gasto. No hay operaciones externas ejecutadas.

## Continuidad

Estrategia/copy viven en `Alineación/2. Campañas/CMP-001_la-ia-dice-de-ti/`, con BRIEF y `medicion/COPY-Y-CONFIGURACION-DE-ANUNCIOS.md` apuntando al manifiesto. Para ejecutar, leer primero el Markdown MCP, no los LEEME históricos de paquetes técnicos. La historia anterior queda en git y `decisiones/historico-handoff-repo-pre-manifiesto.md` de la campaña.

Pendientes de lanzamiento: inversión autorizada, cuenta/pagador/moneda/horarios/owners, audiencia disponible, conversión y persistencia de UTMs verificadas, preview real por placement. No se implementó TASK-1885 ni se alteraron artes.
