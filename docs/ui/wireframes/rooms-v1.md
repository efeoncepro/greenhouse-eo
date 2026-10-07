# Rooms — wireframes estructurales V1

Fecha: 2026-10-07. **Proposed; esquemas de contenido, no diseños finales.** [Dirección](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).

## Contrato visual transversal

Estos wireframes son estructura dentro de **La órbita**: títulos y capítulos en Bricolage; cuerpo, navegación, controles y notas en Poppins; superficies papel/navy y componentes de marca del catálogo AXIS. La [dirección visual](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md) gobierna el mapeo; no usar los esquemas para volver al theme histórico de Greenhouse. La gráfica importada conserva su tipografía. No imponer preguntas/respuestas al relato.

## Entrada desktop

```text
┌ Efeonce · Rooms ───────── Cliente / propuesta ───── PDF · Acceso ┐
│                                                              │
│ Reto / contexto breve        ┌─────────────────────────────┐  │
│ Concepto de la propuesta     │                             │  │
│ Una promesa comprensible     │       PIEZA DOMINANTE        │  │
│                             │       ratio preservado      │  │
│ [Explorar propuesta]         │                             │  │
│ Mapa · Preparar*             └─────────────────────────────┘  │
│ Edición y contexto; siguiente capítulo reconocible            │
└──────────────────────────────────────────────────────────────┘
* Preparar solo si el grant lo permite.
```

La pieza está visible en el primer viewport; dimensiones exactas se resuelven con assets reales. La entrada no fuerza reproducción ni consume pantalla con un splash.

## Explorar una pieza

```text
┌ ← Volver al relato ───── Concepto / nombre ───── Mapa · PDF ───┐
│                                             │               │
│                ESCENARIO                    │ Fundamento*   │
│         imagen / video / audio              │ Evidencia     │
│          controles por material             │ Preguntar     │
│                                             │               │
│ [Vista limpia] [En contexto] [Detalle]       │               │
├ Adaptaciones reales: 9:16 · 4:5 · 1,91:1 · 16:9 ─────────────┤
└─────────────────────────────────────────────────────────────┘
* Panel cerrado por defecto; su apertura conserva contexto.
```

Comparar abre dos marcos con nombres y ratios propios. Cerrar detalle devuelve foco al control origen y restaura scroll/escala. No apilar modal dentro de modal para ir de pieza a método.

## Móvil

```text
┌ Cliente · propuesta ─ Mapa ┐
│ Concepto breve            │
│ ┌───────────────────────┐ │
│ │  Pieza a ratio real   │ │
│ └───────────────────────┘ │
│ [Explorar / reproducir]   │
│ Adaptaciones accesibles   │
│ Fundamento · PDF          │
│ Relato / siguiente        │
└──────────────────────────┘
```

No exigir que todas las proporciones entren completas junto con todo el chrome. Un video vertical puede abrir escenario dedicado; la entrada mantiene una preview significativa y navegación visible.

## Consola y audiencia

```text
CONSOLA PRIVADA                       AUDIENCIA COMPARTIDA
┌ Edición · tour · estado ─────┐       ┌────────────────────────┐
│ Actual          │ Siguiente  │       │                        │
│ preview mudo    │ preview    │       │    PIEZA / ESCENA      │
├ Notas autorizadas ──────────┤       │      sin notas         │
│ Argumento / recordatorio    │       │                        │
├ Mapa · Volver · Avanzar ────┤       └────────────────────────┘
│ Tiempo · audio · conexión   │
└────────────────────────────┘
```

El estado informa lo aplicado por audiencia, no solo lo solicitado. Una ventana ofrece fallback limpio; las notas no se incrustan ocultas en su HTML.

## Autoría

```text
┌ Sala · borrador/revisión ───────── Preview por rol · Publicar ┐
│ Inventario       │ Escenario compartido     │ Propiedades    │
│ Capítulos        │ con experiencia buyer    │ del elemento   │
│ Piezas/variantes │                          │ Fundamento     │
│ Tours            │                          │ Evidencias     │
├ Cobertura: incluidos / pendientes / excluidos con razón ─────┤
└─────────────────────────────────────────────────────────────┘
```

La revisión de cobertura abre una lista legible, no solo un porcentaje. Publish permanece sujeto a permisos y validación; preview nunca se confunde con edición entregada.
