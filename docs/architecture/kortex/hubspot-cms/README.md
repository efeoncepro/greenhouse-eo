# Kortex HubSpot CMS / Content Hub

> **Tipo:** Architecture notes / operator research
> **Creado:** 2026-07-02
> **Scope:** Kortex OAuth + HubSpot Content Hub/CMS operations for connected portals
> **Boundary:** no reemplaza el HubSpot Greenhouse write bridge ni el public-site WordPress control plane.

## Que es esto

Esta carpeta documenta como Kortex puede operar capacidades de HubSpot CMS / Content Hub en portales conectados por OAuth, empezando por ANAM (`19893546`).

El objetivo es dejar una ruta segura para investigar, disenar y eventualmente crear landing pages, modulos, themes o assets CMS sin tocar contenido publicado ni confundir sistemas.

La operación integral del portal cliente, RevOps y Customer Agent vive en [`../hubspot-as-a-service/README.md`](../hubspot-as-a-service/README.md). Esta carpeta conserva ownership exclusivo sobre CMS, landing, themes, modules y su acceso.

## Subcarpetas / documentos

- [`developer-platform-research.md`](developer-platform-research.md): investigacion de la Developer Platform de HubSpot para landing pages, CMS React, modulos, templates y CLI.
- [`landing-page-runbook.md`](landing-page-runbook.md): carril seguro para crear landing pages como `DRAFT`, publicar solo con aprobacion y separar API vs CLI.
- [`anam-portal-access.md`](anam-portal-access.md): estado de acceso OAuth del portal ANAM y capacidades observadas.
- [`anam-chat-landing.md`](anam-chat-landing.md): landing de contacto ANAM en CMS React, builds, copy, diseno, comandos CLI, verificacion y guardrails.

## Decision operativa

Hay dos carriles distintos:

1. **Pages API / landing page draft**
   - Usa OAuth portal-scoped de Kortex.
   - Sirve para crear/listar/actualizar landing pages por API.
   - El primer write debe ser siempre `state: DRAFT`.

2. **CMS assets / themes / modules / CMS React**
   - Usa HubSpot CLI o Developer Projects.
   - Requiere autenticar el CLI contra el portal destino con Personal Access Key.
   - No depende automaticamente del OAuth runtime de Kortex.
   - Para ANAM, usar el perfil adicional `anam` / cuenta `19893546` sin reemplazar el default Kortex/Efeonce.

## Regla de seguridad

No publicar, programar publicacion, archivar, borrar ni reemplazar templates en un portal cliente sin:

- brief aprobado;
- payload revisado;
- prueba en `DRAFT`;
- URL/preview verificada;
- confirmacion humana explicita.
