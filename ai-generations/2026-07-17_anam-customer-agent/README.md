# ANAM Customer Agent — producción visual

Run local determinístico para los cuatro conceptos editoriales del artículo Customer Agent de ANAM.

- `ANAM-CA-V01`: portada y Open Graph.
- `ANAM-CA-V02`: frontera de autonomía conversacional, desktop/móvil × light/dark.
- `ANAM-CA-V03`: arquitectura gobernada de 23 fuentes, desktop/móvil × light/dark.
- `ANAM-CA-V04`: escalera de evidencia operativa, desktop/móvil × light/dark.

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
