---
name: efeonce-creative-workbench
description: Operar y mantener Creative Workbench, el harness multimarcas del equipo Efeonce; producir KV y adaptaciones SKY con sus componentes nativos, fotografía admitida, paquetes privados y corridas gobernadas, y conservar sus decisiones y continuidad. Aplicar a creative-workbench; no sustituye las skills de identidad Efeonce ni de contenidos Berel.
---

# Efeonce Creative Workbench

Guía operativa viva del harness compartido. Su implementación pertenece al repo privado
`efeoncepro/creative-workbench`; esta skill pertenece a Greenhouse y documenta cómo operarlo.
SKY es el primer cliente habilitado, no el alcance completo del espacio. Todo el equipo puede
trabajar para todas las marcas; cada ejecución tiene una sola identidad visual explícita.

## Corte integrado y recorrido recomendado — 2026-10-01

Workbench `main` integra componentes autónomos e identidad Git por PR15 (`2392758`) y
el Lab premium por PR16 (`c3e85b6`). Greenhouse incorporó la base documental mediante PR246
sobre `develop`; no es una promoción de Greenhouse a producción. La implementación modular
ya permite componer mediante agentes; IA, acceso definitivo y distribución tienen gates aparte.
Leer primero [flujo de agentes](references/agent-production.md), luego la referencia del paso.
[Estado y pendientes](references/state-continuity.md) distingue código, evidencias y runtime.

## Arranque y fuentes

1. Localizar el checkout de Workbench sin crear otro ni cambiar ramas ajenas. En la máquina
   del operador está en `/Users/jreye/Documents/creative-workbench`; esa ruta no es portable.
2. Leer allí `AGENTS.md`, `README.md`, `clients/brands.json`, el pack del cliente y su brief.
   Revisar rama, HEAD y cambios antes de editar. Ejecutar producción sólo desde Workbench.
3. Cargar [arquitectura](references/architecture.md) y la referencia de la operación elegida.
   Para retomar esta sesión, leer también [estado y continuidad](references/state-continuity.md).
4. Contrastar instrucciones con código y contratos actuales. Una observación fechada no
   prueba acceso, despliegue, habilitación de generación o publicación actuales.

La decisión Greenhouse `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
explica el aislamiento. Sus documentos foundation y el sync antiguo son antecedentes;
el harness nativo y los contratos verificados de Workbench gobiernan su operación actual.
No ejecutar un `creative:sync` total para restaurar comandos retirados.

## Elegir la referencia

| Pedido | Leer |
| --- | --- |
| Comprender motores, autoridad, packs, locks y límites entre repos | [architecture.md](references/architecture.md) |
| Preparar una producción a escala, repartir jobs, ejecutar y cerrar con evidencia | [agent-production.md](references/agent-production.md) |
| Crear una campaña SKY, cambiar imagen/copy, obtener todos los formatos | [sky-production.md](references/sky-production.md) |
| Producir o evaluar fotografía SKY, blur, cielo, color y reservas de texto | [sky-photography.md](references/sky-photography.md) y skill original admitida de SKY |
| Componer por módulos, corregir logo/flecha/CTA/texto/máscara/círculos | [components.md](references/components.md) |
| Inspeccionar cada capa, tokens/bindings, descomponer, extraer o reconstruir SKY por receta | [autonomous-components.md](references/autonomous-components.md) |
| Identificar una composición nombrada, leer su receta y producir adaptaciones por lotes de agentes | [recipes.md](references/recipes.md) |
| Usar, mantener o presentar el Lab premium Astro/TS/Tailwind, Efeonce + cliente | [lab.md](references/lab.md) |
| Configurar/verificar identidad Git de cada persona, hooks y evitar rechazo de autor en Vercel | [operations-distribution.md](references/operations-distribution.md), sección de identidad Git |
| Instalar canon, consumir/publicar paquetes, broker, archivo y Vercel | [operations-distribution.md](references/operations-distribution.md) |
| Identidad Google↔GitHub, App mínima, transporte sin bearer GitHub y gate de rollout | [architecture.md](references/architecture.md), [operations-distribution.md](references/operations-distribution.md) y [state-continuity.md](references/state-continuity.md) |
| Comparar las 126 piezas SKY contra Figma y mantener recetas nativas | [components.md](references/components.md) y arquitectura Workbench `workbench-sky-reference-comparison.md` |
| Diagnosticar un fallo o evitar repetir propuestas rechazadas | [lessons.md](references/lessons.md) |
| Presupuesto persona/organización, aumentos del operador, CAS y recuperación sin pago | [budget.md](references/budget.md) |
| Resolver comentarios del PR, gobierno, identidades, presupuesto y errores posreserva | [review-remediation.md](references/review-remediation.md) |
| Retomar, registrar progreso o actualizar esta skill | [state-continuity.md](references/state-continuity.md) |

## Invariantes de operación

- Resolver cliente → `brandId` → pack/version/SHA → operación/IDs. Sin marca por defecto;
  no arrastrar fuentes, prompts, skills, fotos o componentes de la pieza anterior.
- Compartir motores neutrales no comparte identidad visual. AXIS no es un default de SKY.
  Un pack gated o recurso ausente falla cerrado; no alterar hashes/cache/policy para aprobarlo.
- Mantener CLIs de Greenhouse intactas. Producción y ports autorizados se hacen en Workbench.
  Crear/actualizar esta skill en Greenhouse no autoriza tocar sus motores locales.
- Los jobs seleccionan recursos admitidos y contenido explícito; no transportan geometría,
  fonts, colores, módulos, código, credenciales ni rutas arbitrarias de salida.
- La atribución declarada no autentica. Las entradas productivas verifican GitHub vivo;
  acceso GitHub no prueba acceso al broker privado, a GCP, Packages o Vercel.
- La candidata de identidad usa Google firmado en ambos headers y un binding server-owned;
  no enviar token general de gh como fallback. Policies draft deniegan; endpoint admitido y
  readback real preceden el merge/distribución de la CLI que lo requiere.
- El adapter real llama una sola vez al guard de pago server-owned tras secreto/body; ledger
  durable → reauth viva → ticket exacto comprobado síncronamente. No consumirlo antes del adapter.
  Ver [budget.md](references/budget.md); fixtures no habilitan IA ni admiten cotizaciones.
- Costo IA: conservar una intención y su UUID. Ante respuesta incierta consultar el mismo
  UUID; no crear otro como retry, lote o alternativa pagada. Respetar la autorización vigente.
- Corridas nuevas y separadas; snapshots/outcome históricos inmutables. Revisión posterior
  ligada a run/SHA, fuera del outcome. Fuentes licenciadas y resultados binarios fuera de Git.
- Inspeccionar el PNG final, su encuadre y texto. Tests, prompt, PNG decodificable y controles
  de procedencia no aprueban diseño, contraste, derechos ni oferta comercial.
- Separar preparado, validado, ejecutado, revisado, aprobado, archivado, publicado y entregado.
  No anunciar el harness completo por cerrar una unidad de componentes.

## Mantener la memoria operativa

Después de un avance relevante: registrar el contrato en su dueño de Workbench, el resultado
fechado en `docs/operations/HARNESS_STATUS.md` y evaluación/auditoría con evidencia; actualizar
la referencia correspondiente y el corte de esta skill. No copiar assets ni secretos aquí.
Conservar rechazos con su razón. Espejar todo el bundle byte a byte en `.claude/skills/` y
comprobar contenido y referencias. El registro de continuidad indica qué cambiar y qué preservar.

Desde Greenhouse, `python3 .codex/skills/efeonce-creative-workbench/scripts/validate.py` comprueba
ambos bundles, links internos y registro del router sin modificar archivos ni llamar providers.
Este chequeo específico cubre la skill nueva; no atribuir su cobertura al allowlist histórico
de `pnpm skills:mirrors` mientras no se haya registrado allí.

La base integrada contiene 126 adaptaciones y comparación técnica independiente completa.
La escena productiva usa componentes, tokens de propiedades y recetas; los agentes pueden
componer campañas con copy/foto explícitos y revisar cada resultado. Esta disponibilidad de
código no aprueba campañas nuevas, habilita pagos ni certifica acceso de cada integrante.
Refrescar estado, rama y runtime antes de atribuir un rollout o una aprobación actuales.
