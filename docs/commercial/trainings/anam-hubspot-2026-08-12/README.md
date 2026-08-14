# Capacitación HubSpot® para ANAM · 12 de agosto de 2026

Entregable local compuesto desde Artifact Composer para una sesión de 09:00 a 13:00. El deck sigue la estructura ampliada recibida por Outlook y contiene 26 láminas —incluida la contraportada canónica—, mockups conceptuales, el modelo canónico de ANAM, estados de madurez y ejercicios acumulados.

## Entregables

- [Plan auditable del deck](deck-plan.json)
- [Guion del facilitador](facilitator-runbook.md)
- [Hoja de ejercicios](handout-operativo.md)
- [Fuentes y estado de assets](asset-sources.md)
- [Preview de una lámina](deck-plan-preview.json) — evidencia de exploración inicial, no el entregable final.

El PDF y los PNG se generan en `.captures/anam-hubspot-training-full/` con:

```bash
pnpm deck:compose docs/commercial/trainings/anam-hubspot-2026-08-12/deck-plan.json --out .captures/anam-hubspot-training-full
```

## Estado de marca y evidencia

La portada usa `CoverFull`, la plantilla aprobada de los decks: Efeonce + ANAM + `Capacitación HubSpot` sobre el degradado institucional. La lámina 26 usa `BackCoverFull`, la contraportada canónica de cierre, con el badge naranja de HubSpot Solutions Partner como credencial secundaria en la esquina superior derecha. HubSpot® queda como plataforma, no como marca dominante. Los mockups son interfaces conceptuales, no capturas del portal de ANAM; todos los valores son ilustrativos. El paquete queda `proof-only` hasta validar autorización para distribución externa y estado live de las funciones.

HubSpot® y sus logotipos son marcas de HubSpot, Inc. Este material es independiente de HubSpot, Inc. y no está autorizado, patrocinado ni aprobado por dicha compañía. Las capacidades se clasifican como operativo/documentado, piloto, validación live o no publicado; ningún mockup sustituye la verificación del portal.
