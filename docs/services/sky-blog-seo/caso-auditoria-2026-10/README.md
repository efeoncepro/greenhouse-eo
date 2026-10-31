# Caso SKY · Auditoría SEO del blog y entrega a SKY (octubre 2026)

Expediente del encargo de Julio del 23-10-2026: auditar el Blog SKY a partir de las reuniones con SKY, revisar
lo que se había avanzado el 15-10, armar el informe de entrega con el renderer A4 premium y preparar los correos.
Estado al 31-10-2026: **informe enviado el 23-10 a Pilar y Natalia; accesos entregados; los 9 artículos de Perú
restaurados; kickoff el 02-11.** Insumos del deck: [KICKOFF_2026-11-02_INSUMOS.md](KICKOFF_2026-11-02_INSUMOS.md).

## Qué pidió SKY (reuniones)

Fuentes: Notion «Reuniones» del 27-07, 10-09, 28-09 (dos) y 15-10-2026; coinciden con las reuniones de HubSpot
de la empresa Sky Airlines (`30825221458`).

- **Pilar Romero (pilar.romero@skyairline.com):** por qué el tráfico cayó de ~80k a ~40k tras la migración
  «obligatoria por seguridad», cuánto tarda recuperarlo (espera una recuperación importante en tres meses desde
  noviembre) y el indicador de cuánto costaría ese tráfico en Ads. Creía que «Google los penalizó».
- **Natalia Ortiz (natalia.ortiz@skyairline.com):** contenido de rutas domésticas de Perú, refresh de rutas
  internacionales, «qué hacer alrededor» del aeropuerto de llegada y refresh de artículos que funcionaban; sin
  duplicar. Datos operativos desde el Centro de Ayuda de SKY.
- **Nicolá Lamiaux (nicola.lamiaux@skyairline.com), Gerente de Marketing:** destinatario del informe de entrega.
- Compromiso de Julio (15-10): auditoría «antes del martes» 20-10. Kickoff operativo: 02-11-2026 10:00.

## Resultado

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Hechos verificados (fuente única de cifras) | [HECHOS.md](HECHOS.md) | Vigente al corte 21/23-10 |
| Auditoría consolidada interna | [docs/audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md](../../../audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md) | Commit `ac2372eed` |
| Informe A4 para SKY (23 páginas) | `outputs/sky-blog-seo-audit-2026-10-23/informe/Efeonce - Auditoria SEO Blog SKY (23-10-2026).pdf` (sha256 `f9ee0e01…87e18`) | Generado y revisado página por página; no enviado |
| Copia para adjuntar | OneDrive › Alineación › 1. Clientes (Interno) › Sky - SEO-AEO › Auditoría SEO 2026-10 | Misma huella; carpeta interna (no la compartida con SKY) |
| Plan del informe y generador | `outputs/.../informe/sky-blog-audit.plan.json` · [`scripts/seo/sky-blog-audit-report.ts`](../../../../scripts/seo/sky-blog-audit-report.ts) | Regenerable: `pnpm exec tsx scripts/seo/sky-blog-audit-report.ts` + `pnpm report:compose … --asset org-logo:sky=…/sky-official.svg` |
| Tablas de apoyo | `outputs/sky-blog-seo-audit-2026-10-23/` (clasificación de 1.697 posts, backlog editorial, canibalización, cobertura de rutas, redirecciones) | Commit `ac2372eed` |
| Correo a Natalia (artículos de Perú) | [correos/01-natalia-articulos-peru.md](correos/01-natalia-articulos-peru.md) | Borrador; puede omitirse si sale el correo formal |
| Correo formal a Nicolá, Pilar y Natalia | [correos/02-entrega-auditoria.md](correos/02-entrega-auditoria.md) | Borrador con el PDF adjunto |
| Perú: demanda e intención por destino | [PERU_PRIMER_LOTE.md](PERU_PRIMER_LOTE.md) | Base del lote (Semrush PE) |
| Lote inicial: 15 nuevos + 25 optimizaciones | [LOTE_INICIAL_PARA_APROBACION.md](LOTE_INICIAL_PARA_APROBACION.md) | Propuesta para aprobar con Natalia; reemplaza a `PERU_TITULOS_PARA_APROBACION.md` |
| Insumos del kickoff 02-11 (estado al 31-10, expectativa a corregir, decisiones) | [KICKOFF_2026-11-02_INSUMOS.md](KICKOFF_2026-11-02_INSUMOS.md) | Para la sesión que arma el deck |
| Página ejecutiva (borrador previo) | Artifact privado «Auditoría Blog SKY» | Superada por el PDF |

## Decisiones tomadas en el caso

- **Diagnóstico corregido respecto del 15-10:** no hay penalización; la caída tiene tres etapas; la causa
  técnica nombrada es la pérdida del plugin SEO (All in One SEO) en la migración; se agregan las hipótesis de
  subdominio, AI Overviews y volumen/duplicación. Detalle en la auditoría consolidada, §6.
- **Medición:** la recuperación se mide contra el mismo mes del año anterior, nunca contra septiembre.
- **Valor publicitario:** se presenta como rango (US$ 6–16 mil/mes hoy; 28–45 mil antes de migrar) con la
  cobertura medida como nota de método, no como cifra única de 13 % de cobertura.
- **Logo de SKY:** el logo adjunto a la organización en Greenhouse es una imagen generada por IA (manifiesto C2PA y
  la «K» mal dibujada). El informe usa el SVG oficial negativo (`ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`)
  sobre la portada navy. Pendiente reemplazar el logo de la organización.
- **OneDrive:** la carpeta «Sky - Efeonce - General» parece compartida con SKY; el PDF se dejó en la carpeta interna
  para no exponerlo antes del envío.
- **Corrección posterior al envío (31-10):** el cierre de la lámina de tendencia del PDF entregado dice «antes de migrar
  el blog ya había perdido dos tercios de sus visitas». Compara enero (pico) contra septiembre, un error de
  estacionalidad. El generador y el plan ya dicen «−48 % en agosto de 2025 contra el año anterior». El PDF enviado
  no se re-renderizó ni se reenvió: corregirlo de palabra en el kickoff, y en el deck en la lámina 6.
- **Renderer:** el informe obligó a sumar capacidades al catálogo A4 premium (hallazgos, escenarios, etiqueta de
  producto, etapas en tendencia, guarda del pie). Commit `001683d83` y `BASELINE_DELTAS.md` (ab).

## Pendientes

| Pendiente | Dueño | Condición de cierre |
| --- | --- | --- |
| ~~Revisar y enviar el correo formal con el PDF~~ | Julio | Enviado el 23-10 a Pilar y Natalia (Nicolá no iba) |
| Saber quién retiró los 9 artículos de Perú (restaurados al 31-10: 8 en 200, `viajar-a-peru` → `/viajar-a-peru-2/`) | Natalia / SKY | Respuesta registrada |
| Exportar el Search Console de `www.skyairline.com` (historia previa; vence nov-2026 a ene-2027) | SKY (acceso) + Efeonce | Export guardado en el expediente |
| Revisar acciones manuales y problemas de seguridad en GSC | Efeonce | Captura fechada en la auditoría |
| Comprobar el acceso de administrador a WordPress (entregado el 27-10 a Julio, Valentina y `mkt@`; cambiar las claves enviadas por correo) | Efeonce | Ingreso comprobado y claves cambiadas |
| Reemplazar el logo de SKY de la organización en Greenhouse por el oficial | Efeonce | Logo oficial adjunto |
| Copiar el PDF a «04 Entregables» del canal compartido | Julio | Sólo después del envío |
| Validar con SKY los escenarios nov–ene | Julio en el kickoff 02-11 | Acuerdo registrado en Notion |
