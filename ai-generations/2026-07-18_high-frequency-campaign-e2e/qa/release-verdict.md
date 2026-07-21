# Release verdict

## Veredicto

**PASS para creative release V3.** El set es coherente, técnicamente correcto, trazable y
reproducible sin volver a ejecutar modelos para composición o QA.

**No equivale a launch approval.** La activación de medios queda bloqueada hasta cerrar audiencia,
offer, landing, UTMs, evento de conversión, presupuesto, trafficking, legal y diseño experimental.

## Riesgo y alcance auditado

- Riesgo creativo: medio; una imagen generativa puede introducir deriva, anatomía deficiente o
  composición frágil. Se mitigó con anchor aprobado, topología estrella, scorecard y revisión humana.
- Riesgo de integración: medio; hubo nueve llamadas generativas en el release (7 still + 2 clean motion)
  y una llamada adicional para el probe técnico excluido. Seedance quedó como fallback explícito pero no se
  invocó; se guardaron request/model/usage/costo sin persistir secretos.
- Riesgo de release: bajo; el artefacto es un ZIP local, sin deploy ni write externo. Los assets se
  pueden regenerar desde masters y manifests.
- Riesgo de performance: no evaluado; aún no existe exposición a una audiencia ni spend.

## Evidencia

- 3 territorios Lite, 1 anchor Pro y 3 plates GPT Image 2;
- 18/18 stills exactos y dentro de su contrato de canal; 6/6 entregables motion verificados;
- 2 heroes de 15 s compuestos desde el clean shot y stills aprobados, sin nueva inferencia;
- loudness/peak medidos en 6/6 MP4; heroes `-16.3/-16.4 LUFS`, masters `-20.4/-30.7 LUFS` y
  bumpers `-19.0/-30.6 LUFS`; sólo los heroes están normalizados al target compartido;
- EDL 15/10/6 s y format wall 4:5 + 9:16 + 16:9 verificados; los heroes agregan USD 0 de inferencia;
- copy/logo/URL determinísticos; no dependen de texto generado dentro de la imagen;
- identidad consistente: todos los formatos derivan directamente del mismo anchor;
- safe zones 9:16 verificadas después de corregir la primera composición;
- scorecard visual `47.4/50` y QA de campaña ejecutable en PASS;
- package V3 SHA-256 `13a84dbbffd9be389c2304fbc5360c3410cd5d91b2a45e5b14ae372e2322d24b`;
- costo generativo del release `USD 2.9650`; experimento completo con probe `USD 3.3550`.
- fallback Seedance planificado por fidelidad de set/identidad, no invocado porque ambos masters Omni pasaron;
  probe técnico de `3.008 s`/USD `0.390` excluido del release.

## Gates del repositorio

- `05-qa-campaign.mjs`: PASS;
- composición still y post motion determinísticos: PASS;
- parse de manifests JSON: PASS;
- `git diff --check` focal: PASS;
- `pnpm qa:gates --changed --agent codex --integration --docs`: PASS/advisory;
- `pnpm docs:closure-check`: PASS, cero warnings;
- `pnpm ops:lint --changed`: PASS;
- `pnpm secrets:audit`: no aplicable al run aislado y falló porque el shell no cargó los ocho
  secretos generales del portal. No revela un fallo de las credenciales de campaña: la identidad
  activa `julio.reyes@efeonce.org`, el proyecto `efeonce-group`, ambos secret refs canónicos y las
  siete llamadas proveedor quedaron verificados sin imprimir payloads.

## Decisiones de cierre

- No requiere GVC: no cambió UI ni runtime del portal; la evidencia visual es el contact sheet.
- No requiere ADR: es una corrida reversible que instancia el contrato híbrido ya documentado, no
  introduce una nueva arquitectura o source of truth.
- No hay media activation, deploy, IAM change, bucket público ni rotación de secretos.
- Antes de activación pagada falta escucha humana de audio en audífonos y teléfono, normalización por canal
  de masters/bumpers si se trafican, además de los gates de audience/offer/landing/tracking/legal declarados arriba.
- La siguiente graduación exige un piloto con resultados por asset ID, presupuesto acotado y
  comparación contra una segunda ruta visual para medir fatiga y performance.
