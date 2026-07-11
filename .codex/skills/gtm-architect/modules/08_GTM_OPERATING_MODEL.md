# 08 · GTM Operating Model

La estrategia GTM sin **operating model** es un PDF que nadie ejecuta. Este módulo convierte el plan en una **máquina que corre**: roles, alineación cross-funcional, cadencia y el GTM plan como artefacto vivo. El GTM 2026 es **disciplina de revenue cross-funcional** — el desalineo entre marketing/ventas/CS es el costo #1.

## El GTM plan (el artefacto vivo)
Un GTM plan operable declara, en una página o deck:
- **Objetivo + horizonte** (qué revenue/pipeline/adopción, para cuándo).
- **ICP + segmento + beachhead** (`01`).
- **Positioning + messaging house** (`02`).
- **Oferta + pricing** (`03`).
- **Motion primaria + secundarias + canales** (`04`).
- **Estrategia de demanda + bow-tie** (`05`).
- **Métricas + targets** (`07`).
- **Owners por workstream + cadencia** (abajo).
Plantilla: `templates/gtm-plan.md`. **No es un documento muerto** — se revisa en la cadencia y se ajusta con la señal.

## Roles del GTM (RACI, aunque el equipo sea chico)
Aun en equipos pequeños, los roles existen (una persona lleva varios):

| Rol | Responsabilidad |
|---|---|
| **GTM owner / líder de revenue** | Dueño del GTM plan, alineación cross-funcional, la meta |
| **Marketing / demand** | Demand creation + capture (`digital-marketing`, `content-marketing-studio`, `seo-aeo`) |
| **Growth** | Conversión, loops, PLG, activación/retención (`growth-marketing-cro`) |
| **Ventas / comercial** | Ejecución del deal, pipeline, cierre (`commercial-expert`) |
| **CS / expansión** | Onboarding, adopción, NRR, advocacy (bow-tie derecho) |
| **RevOps / data** | Datos, atribución, pipeline hygiene, tooling (`gtm-ga4`, HubSpot) |
| **Producto** | El wedge/producto que aterriza (PLG) |

## Alineación cross-funcional (el trabajo central)
- **Un ICP, un mensaje, un bow-tie** — todos apuntan al mismo target y definición de "buen cliente".
- **Definiciones compartidas:** qué es una **señal accionable** (marketing→ventas), qué es un **buen handoff** (ventas→CS), qué es un **cliente en riesgo** (`is_at_risk` bow-tie).
- **SLAs entre motores** (tiempo de respuesta a una señal, calidad del handoff).
- El desalineo (marketing genera lo que ventas no quiere; ventas cierra lo que CS no puede retener) es el costo #1 — el operating model existe para eliminarlo.

## Cadencia (el ritmo que mantiene la máquina)
- **Pipeline council / weekly** — estado del pipeline, señales, blockers.
- **Mensual** — métricas GTM (`07`), qué funciona/qué no, reasignar.
- **QBR (trimestral)** — revisar el GTM plan completo, targets, motion, segmentos. Ajustar estrategia con evidencia.
- **Loop de aprendizaje:** win-loss (`commercial-expert`) + señales de mercado (`research-benchmark`) retroalimentan el GTM plan.

## RevOps: la plomería que lo hace real
- **Pipeline hygiene** (etapas limpias, datos confiables) — sin esto, las métricas mienten.
- **Atribución + tracking** (`gtm-ga4` + HubSpot) — para medir pipeline contribution.
- **Tooling alineado** (CRM = HubSpot 48713323 para Efeonce; motion properties del bow-tie).
- **La IA en GTM (2026):** agentes que investigan cuentas, personalizan, priorizan señales — pero con gobernanza (no autonomía sin control). Diseña dónde la IA acelera, no dónde decide sola.

## Escalar el operating model (Efeonce)
- Alinea con la doctrina: `client_kind` (Active/Self-Serve/Project) tiene **motion, owner, cadencia y north-star distintos** (`commercial-expert`) — no los trates uniforme.
- El **bow-tie** es el SSOT del modelo comercial (`docs/context/11` + `GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`) — si una decisión GTM no alinea, primero se actualiza el bow-tie, luego se ejecuta.

## Checklist de salida
- [ ] **GTM plan** como artefacto (segmento→positioning→offer→motion→demanda→métricas→owners→cadencia).
- [ ] **Roles/RACI** asignados (aunque una persona lleve varios).
- [ ] **Alineación** cross-funcional: un ICP/mensaje/bow-tie + definiciones + SLAs.
- [ ] **Cadencia** viva (pipeline council / mensual / QBR) con loop de aprendizaje.
- [ ] RevOps: pipeline hygiene + atribución + tooling (HubSpot/gtm-ga4).
- [ ] Alineado con `client_kind` + bow-tie (doctrina vinculante).

## Cross-links
- Todo el plan → `01`–`07`; economía → `07`; venta → `commercial-expert`; medición/RevOps → `gtm-ga4`/HubSpot; win-loss/mercado → `commercial-expert`/`research-benchmark-operator`; bow-tie/client_kind → `efeonce-agency` + `docs/context/11`.
- Artefacto → `templates/gtm-plan.md`.
