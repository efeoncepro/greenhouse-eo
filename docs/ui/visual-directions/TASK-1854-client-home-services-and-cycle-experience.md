# TASK-1854 — Dirección visual: el servicio como una historia verificable

Versión de diseño: 2026-09-09. Visual direction mode: `repo-native-benchmark`.
Estado: dirección seleccionada para desarrollar el contrato; validación visual pendiente. UI ready: no.
No hay mockup renderizado, captura, aprobación visual del operador ni certificación de producción en este documento.

## Tesis de experiencia

El cliente entra para entender qué cambió, qué está haciendo su equipo y qué necesita de él.
El diseño debe responder esas tres preguntas sin convertirlo en analista ni pedirle reconstruir conversaciones.
Una hoja editorial de servicio reúne evidencia, avance y decisión; la profundidad aparece al pedirla.
El acabado premium proviene de la jerarquía, el contenido útil, la continuidad y la precisión de estados.

La misma gramática sirve a Berel SEO, Berel contenidos y Sky diseño. La organización determina los datos y
permisos; el servicio determina la composición de evidencia. No existen temas visuales ni condiciones por
nombre de cliente. Greenhouse mantiene su identidad; la marca cliente sólo identifica el contexto autorizado.

## Alternativas comparadas

| Dirección | Primer vistazo | Fortaleza | Coste y decisión |
|---|---|---|---|
| A. Tablero de métricas | Cuatro tarjetas equivalentes, gráficos debajo, módulos al final | Reconocimiento rápido para analistas frecuentes | Compite todo por atención; penaliza fuentes incompletas y vuelve invisibles los pendientes. Descartada como estructura principal |
| B. Bandeja operativa | Lista de pendientes y panel de detalle | Excelente para muchas revisiones consecutivas | Hace parecer que el servicio sólo existe cuando pide algo; pobre lectura ejecutiva y de resultados. Reutilizar su orden en pendientes, no como Inicio |
| C. Hoja editorial de servicio | Contexto compacto, evidencia dominante, próximo paso y trabajo del período | Explica valor y conduce una acción; funciona con uno o dos servicios y evidencia parcial | Requiere contrato semántico sólido y controlar longitud. Seleccionada |

Son composiciones comparadas conceptualmente contra el repo, no tres prototipos evaluados con usuarios.
La selección C queda sometida al primer fold implementado y su crítica premium.

## Referencias locales y transferencia concreta

| Fuente inspeccionada | Qué se toma | Qué no se replica |
|---|---|---|
| `src/app/(dashboard)/home/page.tsx` y HomeShellV2 | Entrada existente, preferencias y guards | Un segundo Home ni cambio de la experiencia interna |
| `src/components/greenhouse/primitives/surface-system/SurfaceRecipe.tsx` | Header independiente y un plano de lectura | Envolver cada bloque en otra card |
| `surface-system-controller.ts` del mismo directorio | `analyticsReport → single`, `settingsFlow → focused` | Inventar slots o composiciones que no existen |
| `docs/architecture/ui-platform/PRIMITIVES.md` | SignalStrip integrada, secciones abiertas, selección accesible | Reproducir variantes operativas oscuras por defecto |
| `src/views/greenhouse/GreenhouseReviewQueue.tsx` | Revisión como destino especializado | Resolver aprobaciones dentro de Inicio |
| TASK-1849 | Biblioteca/edición Efeonce Insights como destino autorizado | Enlazar `/nexa/insights` como sustituto del producto de informes |

## Composición y primer fold

- Recipe: `SurfaceRecipe kind='analyticsReport'`; `header` contiene `WorkbenchHeader kind='report'`.
- Dos superficies sostenidas al inicio: header editorial y hoja de servicio. Un aviso excepcional puede
  añadir una tercera; nunca una tarjeta por métrica, pendiente o fragmento de copy.
- La tesis de lectura ocupa el mayor peso: nombre del servicio, período y una observación comprobable.
  La cifra principal sólo domina cuando existe dato interpretable; no reservar un enorme guion sin fuente.
- Las señales secundarias se integran horizontalmente en escritorio y se apilan de forma legible en móvil.
- El próximo paso es una fila de decisión clara dentro de la hoja, con un único CTA principal.
- La tabla/lista empieza antes de que toda la primera pantalla se consuma en una cabecera decorativa.
- El primer fold se evalúa en 1440×900 y 390×844; los tamaños son objetivos de captura, no alturas rígidas.
  Con zoom o copy largo se permite crecimiento vertical. Nunca recortar para cumplir el fold.

## Firma visual

La relación **resultado → evidencia → próxima acción** se reconoce por tres niveles tipográficos, un
ritmo de divisores y el alineamiento del dato con su explicación. Una cifra relevante puede convivir con
una pequeña serie real; una pieza en revisión puede aportar su miniatura autorizada. No se suman ambas
como decoración. La información, no una ilustración genérica, constituye el momento visual dominante.

SEO: un hallazgo observado con procedencia y enlace al detalle. Contenidos: progreso editorial y piezas
con estado verificable. Diseño: entregables y una evidencia visual de trabajo autorizado. Cuando no hay
miniatura, una fila tipográfica conserva dignidad y densidad, sin grandes placeholders de imágenes.

## Material, color y tipografía

- Canvas `palette.background.default`; plano `palette.background.paper`; divisores `palette.divider`.
- Acción primaria `palette.primary`; énfasis funcional por tokens del componente. El color de estado se
  limita a icono/chip/texto permitido y jamás sustituye su etiqueta. Sin fondos verdes/rojos de sección.
- `surfaceHeroTitle` sólo para el título de página; `h5` para secciones, `body1` para la tesis,
  `body2` para filas/explicaciones, `caption` para fuente y corte, `kpiValue` para un valor protagonista,
  `monoId` para referencias. Mapeo verificado en `TYPOGRAPHY_VARIANT_BRIDGE`.
- Geist para lectura y cifras; Poppins de la variante de título. No se fija font-family por consumer.
- Espaciado del theme; ritmo mayor entre secciones que entre label y valor. Radius y elevación pertenecen
  al recipe. No introducir bordes internos para simular jerarquía ausente.
- Iconos Tabler semánticos del sistema: estado, documento, calendario, enlace. Sin emoji como señal de salud,
  sin avatars de stock ni logotipos repetidos en cada fila.

## Densidad y responsive

| Clase | Composición | Señal que debe sobrevivir |
|---|---|---|
| Expanded | Header compacto, hoja dominante; métricas integradas y lista con columnas | Resultado, corte, acción, objeto y estado |
| Medium | Controles reordenados por ancho del contenedor; menos columnas simultáneas | Fecha comprometida y siguiente responsable |
| Compact / 390 | Alcance en filas completas; síntesis breve, pendiente y lista semántica | Servicio/período legibles, CTA completo, origen accesible |
| Zoom 200 % / texto largo | Reflow del contenido sin altura fija | Ningún contenido sólo por tooltip o hover |

`density='auto'` se usa donde la primitive lo admite; no inventar esa prop en componentes que no la tienen.
Las preferencias de Home no se pierden. La representación compacta cambia columnas por pares label/valor.

## Motion como continuidad

El movimiento explica selección, disclosure y reacomodo de la composición; nunca vende una mejora numérica.
El documento [motion](../motion/TASK-1854-client-home-services-and-cycle-experience-motion.md) fija disparadores,
propiedad del layout, interrupción y versión reducida. La navegación y el contenido no esperan una animación.

## Anti-patrones específicos

- Un saludo grande y sin contenido útil ocupando el primer fold.
- Tres servicios visuales para Sky porque hay tres módulos técnicos asignados.
- Tarjeta “Cupo restante” calculada contando tareas, o “Publicado” deducido de una aprobación editorial.
- Mismo delta porcentual para señales medidas y estimaciones SEO; flecha verde sin comparabilidad.
- CTA “Aprobar” cuando el destino sólo permite ver una pieza.
- Un módulo con spinner permanente cuando no está contratado; un error 403 que imprime el título ajeno.
- Poner Efeonce Insights como banner publicitario o convertir su ausencia en un gráfico vacío.
- Ocultar fuente/cobertura/fecha para que la pantalla se vea más limpia.
- Entradas a informes/solicitudes que todavía no resuelven una ruta habilitada.

## Decisiones y condiciones de aceptación

D54-01: mantener Inicio y añadir detalle bajo su jerarquía, sin nuevo menú principal.
D54-02: hoja única y evidencia por servicio; no dashboard universal de indicadores.
D54-03: fuentes parciales degradan sólo su sección, conservando decisiones autorizadas independientes.
D54-04: Insights es una edición congelada; las métricas operativas mantienen su propio corte.
D54-05: promedio visual ≥4.5/5, ninguna dimensión <4; jerarquía, economía de superficies, impacto visual,
fidelidad y resistencia a plantilla ≥4.5. Evaluar las 14 dimensiones del estándar vigente.

La dirección se reabre si el DTO no sostiene su tesis, el CTA queda bajo contenido prescindible en móvil,
la composición supera tres planos simultáneos sin razón o la revisión visual no cumple esos umbrales.
No reducir el umbral ni rellenar evidencia para conservar el diseño.
