# Auditoría de la CLI de composición de ads con CTA · 2026-09-24

> **Tipo:** auditoría técnica, funcional y de documentación del repositorio local.
> **Objeto:** `pnpm foto:componer:cta` + `pnpm foto:cta:gate`, no el catálogo HTML de campañas.
> **Fuentes vigentes:** [contrato técnico](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md),
> [funcional](../../documentation/creative/compositor-piezas-cta.md),
> [manual](../../manual-de-uso/creative/compositor-piezas-cta.md),
> [regla Tres voces + acción](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md).

## Alcance y criterio

Tres revisiones independientes leyeron el código, el flujo de oficio y la evidencia de pruebas. Se contrastaron las
afirmaciones de docs y skills con el árbol actual, los tests, el reporte conservado y el registro de piezas anteriores.
No se regeneraron finales aprobados, no se alteraron los plates ni se publicó o pautó una campaña. La lectura de
OneDrive del servidor y los previews de plataforma no forman parte de esta auditoría local.

**Estado correcto:** el sistema puede devolver código 0 para una pieza concreta; su certificación adversarial global
quedó inconclusa. La novena auditoría no entregó informes, P10 fue intermitente en 2 de 9 ejecuciones observadas
y el catálogo de 175 entradas (173 mutantes y 2 canarios) se interrumpió después de 81 detecciones registradas, sin
puntuación final. Los pases de una suite previa no convierten ese corte en certificación completa.

## Arquitectura ejecutable

| Límite | Implementación | Evidencia y riesgo |
|---|---|---|
| Contrato de entrada | `scripts/foto/cta-esquema.mjs` + preflight en `componer-cta.mjs` | JSON por pieza, glifos, IDs, plate raster opaco, enums y rangos. Un campo desconocido dentro de un objeto propio aborta. |
| Composición | `componer-cta.mjs`, `cta-variantes.mjs`, `cta-invariantes.mjs` | Tipografía, CTA, selección, segmentación cacheada por SHA, crecimiento y cajas medidos. La semántica de `auto` necesita `prominencia` explícita del autor. |
| Escritura y procedencia | `cta-integridad.mjs` | Lock de carpeta, escritura atómica por pieza y QA por plan con huellas de plan, plate, comando, paquetes y salida. Una pieza que aborta no deja su nueva salida; el QA completo se reinicia y el parcial fusiona. |
| Certificación rápida | `componer-cta.gate.mjs` | Recalcula huellas, geometría, contraste, accesibilidad, zona, firma y jerarquía a partir del QA. 0 = pieza certificada; 1 = falla; 2 = mal uso; 3 = no certificable. El 0 rápido confía en mediciones del compositor. |
| Reproducción | `foto:cta:gate <plan> --reproducir` | Recompone con máscara fresca y compara PNG, layout, alternativo y fila QA. Preview y SVG auxiliares se revisan aparte. |
| Excepciones | `cta-esquema.mjs`, gate y `aprobadores.json` | Regla y razón concretas, aprobador versionado, SHA del plate y `hasta` para medidas numéricas. El registro de canon anterior preserva aprobadas por huella. |

## Hallazgos y resolución

| Prioridad | Hallazgo verificable | Estado al cierre |
|---|---|---|
| P2 | `final` admitía 1 % de diferencia de ratio y Sharp podía recortar 10 px de una story 1080×1920 entregada como 1080×1910. | **Corregido:** se limita a 1 px de redondeo medido en el plate. Se conservan los redondeos menores a 0,889 px de los planes existentes revisados. El formato distinto requiere otro plate. |
| P2 | El esquema permite `variant: "auto"` sin `prominencia`; el compositor toma `delimitada` y favorece el contorno. | **Abierto y visible:** manual, skill y contrato exigen declararla en la práctica. La validación aún no la obliga en el código; cambiarla requiere una regla hacia adelante y revisión de compatibilidad. |
| P2 | La firma externa reserva 20 % fijo; el gate exige 25 % para un horizontal nuevo (`width > 1.2 × height`). | **Limitación documentada:** usar firma dibujada de tamaño adecuado o excepción específica. No se promete que el firmador externo pase el gate nuevo. |
| P2 documental | Operación, manual y referencias de skills aún decían «25 % pendiente / 20 % vigente», «margen 7 % en pieza nueva» o que un concepto sin entrada/cierre pasaba el gate. | **Corregido:** 25 % horizontal nuevo, 20 % vertical/cuadrado, AXIS por defecto, y concepto completo bloqueante salvo aprobación. |
| P2 documental | Funcional decía que la novena auditoría y los mutantes seguían en curso. | **Corregido:** se distingue el corte inconcluso de los códigos del gate por pieza. |
| P3 histórico | La guía fotográfica aún enviaba ads con CTA a `foto:componer` o al script de «Nivel de búsqueda» y trataba todo gráfico como no aprobado. | **Corregido:** `foto:componer:cta` + gate para CTA; `foto:componer` para pieza sin CTA. El prototipo rechazado de septiembre 19 es histórico; el sistema Tres voces + acción se aprobó septiembre 22. |
| P3 histórico | v07 aparecía con firma al 90 % o por corregir. | **Corregido en docs:** cuatro stories finales se recompusieron a 0,8565 dentro de AXIS. Siguen fuera de la guarda conservadora de Reels y no certifican con el gate actual sin el snapshot congelado. |

## Verificación ejecutada

| Comprobación | Resultado y límite |
|---|---|
| `node --test scripts/foto/*.test.mjs` | **52/52**; incluye caso nuevo de ratio exacto, redondeo subpíxel y recorte real. |
| `pnpm foto:componer:cta:pruebas --solo P02` | **1/1**; 132/132 iguales a HEAD: 114 componen, 18 abortan. 68 piezas con CTA sin plate local no se verificaron. No se ejecutó P01–P10 completo hoy. |
| `pnpm skills:mirrors` | Pasa para skills espejadas; se actualizaron las rutas Claude y Codex correspondientes. |
| `pnpm docs:context-check:strict` y `pnpm docs:closure-check` | Pasan. El segundo inspecciona también WIP ajeno del checkout; su verde no certifica assets de campañas. |
| `pnpm qa:gates --changed --agent codex --docs` | Diagnóstico sin bloqueo automático; identifica documentación y tooling. |
| `git diff --check` y `node --check` de los módulos tocados | Pasan. |

## Trabajo que sigue abierto

1. La regla de `auto` sin intención declarada permanece permisiva en el esquema. Para un cambio futuro, decidir
   cómo hacerla obligatoria sólo para piezas nuevas sin romper las huellas de las aprobadas y añadir un caso de gate.
2. El firmador externo produce 20 % fijo y no satisface un horizontal nuevo de 25 % sin excepción; resolver la vía
   externa si vuelve a ser necesaria para piezas nuevas.
3. La reserva fotográfica 16:9 de `foto:prompt` sigue en 42 % del ancho, mientras el texto con piso de legibilidad
   necesita cerca de 57 % en el caso medido. Falta decisión de receta, no se cambia la tabla por inferencia.
4. Los alternativos y el snapshot de v07 son históricos. Sus textos anteriores no cumplen automáticamente la
   redacción actual del CTA; revisar el paquete por canal antes de usarlo de nuevo. El placement de Reels sigue
   necesitando preview.
5. El ciclo adversarial global permanece sin cierre: no hay informe de novena ronda ni puntuación completa de
   mutantes, y P10 requiere diagnóstico de su intermitencia si se reabre el trabajo. El usuario había cerrado
   nuevas rondas; este informe no las reabre.

**Límite de entrega:** ningún documento ni prueba de esta auditoría aprueba una pieza concreta, los derechos de
imagen, la campaña, su programación o la pauta.
