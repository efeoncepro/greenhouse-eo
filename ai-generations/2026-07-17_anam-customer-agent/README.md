# ANAM Customer Agent — producción visual

Run local determinístico para los cuatro conceptos editoriales del artículo Customer Agent de ANAM.

- `ANAM-CA-V01`: portada y Open Graph.
- `ANAM-CA-V02`: anatomía de una conversación mixta y handoff con memoria, desktop/móvil × light/dark.
- `ANAM-CA-V03`: transformación de 23 fuentes en un contrato gobernado de respuesta, desktop/móvil × light/dark.
- `ANAM-CA-V04`: cadena de evidencia, interrupción administrativa y prueba runtime pendiente, desktop/móvil × light/dark.

El source de verdad de cada composición es el SVG generado por `build-assets.mjs`. Los PNG master incorporan el
wordmark oficial de Efeonce mediante composición determinística. Los WebP/JPEG se derivan siempre desde esos
masters. Los diagramas de cuerpo conservan alpha real en PNG/WebP para integrarse con el fondo del tema; las
variantes dark se componen deliberadamente y no mediante filtros CSS. El hero/OG permanece opaco. Ningún activo
representa una interfaz real ni demuestra que el agente esté operativo.

## Reproducir

```bash
node ai-generations/2026-07-17_anam-customer-agent/build-assets.mjs
```

La generación es local. No sube media, no escribe en WordPress y no publica el artículo.

Los activos de cuerpo vigentes son `v2`. La versión `v1` se conserva como antecedente y no debe reintegrarse al
artículo: repetía tablas o clasificaciones ya explicadas por el texto. En `v2`, cada pieza debe superar tres gates:

1. responde una pregunta editorial que el párrafo no resuelve con la misma claridad;
2. muestra una relación causal, un cambio de responsabilidad o una frontera de evidencia;
3. sigue siendo verdadera sin asumir que el Customer Agent está activo en runtime.
