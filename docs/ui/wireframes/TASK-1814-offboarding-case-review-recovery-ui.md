# TASK-1814 — Revisión de caso de offboarding

Estado: propuesta 2026-09-03; UI ready no, sin implementación. Fuente verificable: HrOffboardingView y auditoría UI del 03/09.
Visual direction mode: repo-native-benchmark. Se conserva la cola e inspector existentes; la captura defectuosa
sirve para ubicar el flujo, nunca como referencia de los estados “Listo” o fechas implícitas.

## Experience and Visual Direction

Dirección: revisión contextual y trazable. Una persona/caso a la vez, sin nuevo menú ni wizard.
Desktop 1440px: lista permanece junto al inspector. Mobile 390px: inspector ocupa ancho disponible y
mantiene identidad y acción legibles; no comprimir dos columnas. Jerarquía: identidad → estado real →
decisión y fechas → efecto sobre nómina → revisión/guardado. Tokens tipográficos, espaciales y colores
proceden del tema Vuexy/Greenhouse; sin medidas o colores ad hoc.

## Wireframe

```text
Cola de salidas                Inspector del caso seleccionado
Filtros / filas               Nombre + identificador + estado del caso
                              Origen de señal / relación afectada
                              Decisión contractual / fechas / requisitos
                              Estado de nómina y conciliación
                              [Revisar caso]

Modo revisión (mismo inspector)
Decisión: solo acceso / terminó relación
Relación + causal respaldada + fechas explícitas + motivo
Errores junto a campos; unknown visible
Resumen del efecto servido por backend
[Cancelar] [Guardar revisión]
```

## States and Content

Fechas ausentes se muestran sin fecha. No se propone “hoy”. Confirmación de guardado requiere readback.
Blocked explica motivo y ofrece corrección según permisos. Unknown no cuenta como completo.
Felipe, como aceptación operativa: salida 02/06/2026, todo pagado y cero deuda; no usar su fila como fixture.
Copy final vive en src/lib/copy/workforce.ts y queda pendiente de revisión UX al completar UI ready.

## Implementation Mapping

HrOffboardingView y editor local por caseId; extender inspector, reutilizar OperationalPanel,
DataTableShell, campos y alertas existentes. Consumir DTO y review/correct TASK-1349.
Confirmar adapter sidecar vigente, tokens y contrato final antes de JSX; DB/stores quedan fuera del browser.

## GVC Scenario Plan

Crear escenario focal según helper canónico en Discovery: desktop 1440px/mobile 390px, qualityProfile premium.
Capturar pending sin fechas, revisión, error, unknown, blocked, permiso lectura, éxito después de recarga.
Comprobar contaminación entre formularios, teclado/Escape dirty/focus restore y reduced-motion.
Medir scrollWidth <= clientWidth. Dossier y scorecard al implementar; baseline corregida después de review.

## Design Decision Log

Extend/reuse conserva contexto; otro wizard/ruta duplica decisiones y se descarta.
Ninguna lane ni porcentaje se deriva en cliente. Un solo formulario activo con borrador por caso.
Sin motion nuevo: heredar primitives con reduced-motion. UI ready sigue no por mapping/copy/escenario final pendientes.
