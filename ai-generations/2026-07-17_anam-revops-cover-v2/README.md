# Portada ANAM RevOps V2

Portada editorial del caso ANAM generada con `gpt-image-2` mediante el cliente canónico `pnpm ai:image` y cuatro referencias ordenadas.

## Dirección seleccionada

El informe se presenta como producto operativo: una superficie central en perspectiva, apoyada sobre capas de datos y control. El sistema mantiene fondo blanco y estructura azul Efeonce, incorpora verde sólo como validación y suma naranja/coral con vinotinto para evocar el entorno HubSpot sin convertir la pieza en una copia de su identidad.

## Pipeline

1. Se duplicaron y sanearon dos capturas reales de informes; la evidencia canónica no se modificó.
2. Se usaron cuatro referencias: composición, KPI, barras y sistema editorial Efeonce.
3. `pnpm ai:image` envió las referencias como `image[]` en el orden documentado por `manifest.json`.
4. GPT Image 2 produjo el master base en `2048×1152`, `quality=high`.
5. El wordmark oficial `public/branding/logo-full.svg` se compuso después de forma determinística.
6. Se exportaron featured WebP, Open Graph JPEG y una prueba del recorte central 1:1.

## Entregables

- Master: `source/anam-revops-cover-master-v2.png`.
- Featured: `delivery/anam-dashboard-confiable-portada-web-1600-v2.webp`.
- Open Graph: `delivery/anam-dashboard-confiable-portada-og-1440x757-v2.jpg`.
- Prueba 1:1: `review/anam-dashboard-confiable-portada-square-crop-v2.png`.
- Copias de consumo editorial: `docs/assets/public-site/anam-revops/*-v2.*`.

## Estado

Seleccionada y entregada localmente. No se publicó el artículo ni se reemplazó todavía la media remota V1 del post privado `251397`.
