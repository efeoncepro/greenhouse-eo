# Población cliente SEO — propuestas visuales

2026-10-04. Product Design + Greenhouse AI Design Studio. Estado: **propuestas, selección pendiente**.
No wireframe aprobado, UI ready, código, GVC ni evidencia del runtime actual.
[Discovery](../../../audits/seo/2026-10-04-task-1690-discovery.md).

## Fuentes y orden de selección

Modo: `source-led`, extendiendo el producto existente. Las referencias inspeccionadas
son las capturas históricas `docs/ui/evidence/task-1675/`; la imagen completa de navegación se
adjuntó realmente a las tres generaciones. Sus datos y labels antiguos no son contrato vigente.
Se solicitaron tres imágenes independientes a 1440×1024; archivos originales conservados.

El orden autoritativo es el de aparición de los resultados en el chat, ya comprobado:

| Selección | Archivo persistido | Tesis / estado mostrado |
| --- | --- | --- |
| 1 | [propuesta-1.png](propuesta-1.png) | Hoja ejecutiva de evidencia; onboarding GSC-only. Cifra → contexto/CTR → observaciones → fuentes. |
| 2 | [propuesta-2.png](propuesta-2.png) | Recorrido de cobertura; onboarding GSC-only. Explicación → fuentes → resultados medidos → observaciones. |
| 3 | [propuesta-3.png](propuesta-3.png) | Prioridad con evidencia contextual; fuentes pobladas/cola disponible. Contexto GSC → lista canónica → evidencia seleccionada. |

Integridad: [SHA256SUMS](SHA256SUMS). Las tres son mockups con datos sintéticos, no resultados
de una organización real. No se comparan cifras para elegir; se comparan jerarquía e interacción.

## Revisión por feedback del operador

El operador recuerda que **AEO ya existe y es robusto**. La ausencia AEO de los mockups1/2 era
un escenario sintético mal usado como presentación por defecto. No describe capacidad faltante.
La recomendación visual sigue siendo la1, revisada con GSC y AEO disponibles de forma independiente,
cada uno con su corte. Sólo el seguimiento de posiciones está pendiente en ese caso de ejemplo.
`no-aeo` queda como estado condicional por organización/período, nunca «Próximamente».
La revisión conserva los originales y no equivale a selección/aprobación ni a UI implementada.

Revisión visible en el chat: [propuesta1 con AEO disponible](propuesta-1-aeo-disponible.png).
Es la versión recomendada de la dirección1 después del feedback; no una cuarta alternativa.
Fue inspeccionada: AEO disponible, índice del análisis y corte propio, sin «Próximamente» ni
score SEO/AEO combinado. Antes de materializar: chart desde la serie determinista (normalizar
ticks/labels y cantidad de barras generados) y bloque AEO abierto, sin tarjeta anidada.

## Contrato común de composición

Destino: Resumen `/growth/seo`. Cliente contratado, mono-organización. Leer resultado, evidencia
y siguiente revisión; no producir contenidos, activar tracking ni iniciar capturas pagadas.

- Receta `analyticsReport`; `CompositionShell`; `WorkbenchHeader report` en `header`, fuera de
  las regiones. `SignalStrip integrated`, `OperationalSection open`, selección/estados canónicos.
- Geist para UI/números, Poppins sólo display. Core Blue primaria; Midnight shell; neutrales AXIS.
  Implementación con `theme.palette`, tipografía semántica, spacing/radius oficiales y motion
  canónico, sin copiar valores literales desde estas imágenes.
- Fuentes independientes, ventanas/asOf propios, medición frente a estimación visibles. Nunca
  ausencia=cero, delta contra período inexistente ni score combinado SEO/AEO.
- Una primaria: onboarding «Ver cobertura»; con cola válida «Revisar prioridad». Son lectura.
  Informe Insights sólo si existe edición/binding autorizado; no otro motor de informes.
- Mobile390 recompone título/período → conclusión → dato válido/razón → acción → evidencia.
  Sin lista de KPI cards ni chrome ocupando el primer viewport; selección contextual se apila o
  usa sidecar canónico si la dirección elegida lo requiere.
- Densidad moderada; separación por whitespace/tipo/divisores, no cards anidadas. Firma visual:
  evidencia con contexto, no un mosaico de widgets ni color como lenguaje principal de estado.

## Revisión de propuestas y correcciones antes de implementar

Las imágenes fueron miradas. Son exploración de composición; el contrato del discovery prevalece
sobre cualquier texto/geometría generados. No se emitió scorecard de aceptación.

- Propuesta1 original: «Próximamente» y AEO ausente quedan supersedidos por la revisión del operador.
  La versión revisada muestra análisis AEO disponible con índice/corte de ejemplo y acceso al tab
  existente; ningún número GSC/AEO se fusiona ni atribuye a la otra fuente.
- Propuesta2: acortar la explicación; no decir que todas las fuentes están conectadas cuando sólo
  GSC tiene evidencia. Normalizar ticks/observaciones con la serie determinista de diez días.
- Propuesta3: normalizar fechas de rank para que el último punto coincida con su propio corte;
  inversión del eje y semántica «menor posición es mejor» según primitive existente. Prioridad
  alta no es un error: usar banda neutral en vez de semáforo. Verificar copy contra el DTO cliente
  real; no tomar un provider ni una intención inferida de la imagen.
- Las leyendas «datos de ejemplo» y `example.org` se mantienen en mockups; fixtures nunca usan
  datos de clientes reales. Charts se materializan desde la data, no desde los píxeles de la imagen.
- Todas: comprobar contraste, foco, teclado, tabla alternativa, scrollWidth y viewport390 con GVC
  después de implementar. Ninguna captura generativa sustituye esas pruebas.

## Handoff pendiente

Dirección seleccionada: **pendiente**. Alternativas rechazadas: **pendiente**. Baseline de fidelidad,
wireframe/flow/copy/motion contract y consumer UI formal: pendientes de esa selección.
TASK-1690 conserva backend-data; el follow-up UI separado aún no tiene ID. Esta propuesta no
reabre TASK-1310 ni convierte1690 en una task híbrida por inferencia.
