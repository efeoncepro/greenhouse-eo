# AXIS Shared Product UI Platform Decision V1

## Status

`Accepted — foundation published; consumer rollout gated`

## Context

Efeonce ya tiene una base UI valiosa en Greenhouse: AXIS, tokens, primitives, recipes,
Composition Shell, motion, accesibilidad y un Design System Lab interno. Globe y los
productos futuros necesitan reutilizar ese conocimiento sin copiar código ni heredar por
accidente la implementación MUI/Vuexy de Greenhouse.

La decisión anterior de Globe (`EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1`) hacía
que Globe tuviera un Design System independiente y rechazaba compartir un package UI
cross-repo. Esa frontera deja de ser suficiente para una cartera de productos múltiples.

## Decision

Efeonce adopta una plataforma UI compartida y federada con cuatro responsabilidades:

| Capa | Dueño | Responsabilidad |
| --- | --- | --- |
| Gobierno | Greenhouse | ADRs, registry, lifecycle, ownership, QA, evidence y promoción |
| Contratos | Package compartido | tokens, estados, anatomía, accesibilidad, motion y APIs estables |
| Implementación | Cada producto | adapter compatible con su runtime y composición de producto |
| Lab | Aplicación independiente | catálogo, fixtures, pruebas visuales, keyboard y reduced-motion |

El Design System no será una dependencia monolítica de Greenhouse. Greenhouse seguirá
siendo el control plane y conservará su implementación MUI/Vuexy; Globe podrá usar un
adapter Tailwind; otros productos podrán usar otros adapters sin duplicar el contrato.

## Target topology

```text
Greenhouse control plane
  ├─ docs/architecture + registry metadata + decisions + gates
  └─ /design-system (catálogo interno y handoff)

axis-design-system package repository
  ├─ @efeoncepro/axis-tokens
  ├─ @efeoncepro/axis-ui-contracts
  ├─ @efeoncepro/axis-ui-primitives
  ├─ @efeoncepro/axis-ui-greenhouse
  ├─ @efeoncepro/axis-ui-globe
  └─ @efeoncepro/axis-design-system-lab

Consumers
  ├─ Greenhouse: MUI/Vuexy adapter
  ├─ Globe: React + Tailwind adapter
  └─ futuros productos: adapter explícito
```

El package repository es el source de código portable. La publicación está versionada en el
registry privado de GitHub Packages. El Lab se
desplegará como proyecto Vercel independiente, inicialmente en modo internal-only. No se
crea un runtime Cloud Run para el Lab mientras no exista una necesidad de backend,
persistencia o jobs.

## Estado verificable de distribución y autenticación — 2026-07-28

- Los paquetes privados publicados en GitHub Packages son `@efeoncepro/axis-tokens`,
  `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry`, versión `0.1.2`.
- Los repositorios `efeoncepro/greenhouse-eo` y `efeoncepro/efeonce-globe` tienen acceso
  `Read` configurado en GitHub Actions para los tres paquetes.
- El proyecto Vercel independiente `axis-design-system-lab` tiene `NPM_RC` configurado
  como variable sensible para `Production` y `Preview`, con el registry de GitHub Packages
  para el scope `@efeoncepro`. Esto habilita la instalación del Lab; no demuestra todavía
  consumo runtime en Greenhouse ni Globe.
- En GCP, proyecto `efeonce-globe`, existe el secreto de Secret Manager
  `axis-packages-read-token`. El service account de Cloud Build
  `818083690953-compute@developer.gserviceaccount.com` tiene
  `roles/secretmanager.secretAccessor` sobre ese secreto.
- La distribución y los permisos de lectura están preparados; los consumers runtime aún no
  importan AXIS ni tienen adapters conectados. Esa integración sigue pendiente en `TASK-1591`.
- El token de GitHub usado para esta preparación es operator-owned y tiene expiración
  `2026-08-27`. Antes de rollout externo o para una operación durable debe reemplazarse por
  una identidad de máquina dedicada; el valor del token no forma parte de esta documentación.

## Rules

1. Un token compartido se declara una sola vez y conserva provenance, rol semántico y
   evidencia de contraste.
2. Un contrato compartido no obliga a compartir el motor de estilos.
3. Un componente MUI/Vuexy actual no se vuelve portable por renombrarlo; primero se separan
   contrato, comportamiento y adapter.
4. Un producto decide `reuse | extend | new` mediante el registry.
5. `candidate -> trial -> stable -> deprecated -> retired` exige owner, versión,
   consumers, fixtures y evidencia proporcional.
6. Un componente sin consumer real permanece local; no se construye una biblioteca
   exhaustiva por anticipado.
7. Ningún agente puede introducir un literal visual fuera del token/adapter contract ni
   crear un segundo componente equivalente sin resolver el registry.
8. La convivencia MUI/Tailwind se permite entre adapters o superficies, nunca mezclando
   dos motores dentro de la misma superficie sin una decisión explícita.

## Supersession

Esta decisión supersede parcialmente `EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1`:
Greenhouse sigue gobernando Globe y Globe conserva autonomía de runtime, pero tokens,
contratos y primitives elegibles pueden ser compartidos mediante packages versionados.
Globe no hereda automáticamente la UI de Greenhouse ni importa MUI/Vuexy por esta decisión.

`TASK-1485` pasa a ser un consumer/piloto de la plataforma compartida y debe actualizarse
antes de promover el registry como estable.

## Migration slices

1. Registrar la decisión, ownership y contracts; no tocar runtimes existentes.
2. Inventariar primitives Greenhouse en `portable`, `greenhouse-only` y `product-local`.
3. Extraer tokens y contratos sin mover todavía componentes MUI complejos.
4. Crear package foundation y un Lab mínimo con fixtures.
5. Portar una primitive simple y una primitive compleja con adapter Greenhouse y Globe.
6. Publicar versiones privadas y conectar consumers por una versión fijada.
7. Extraer el resto del Lab y retirar duplicación sólo después de evidencia.

## Quality scenarios

- Un agente nuevo encuentra una primitive existente en menos de una búsqueda de registry y
  no crea un duplicado equivalente.
- Un cambio de token genera diff en los consumers declarados y no altera un producto que
  no actualizó su versión.
- Globe puede consumir el contrato compartido sin importar MUI/Vuexy.
- Greenhouse conserva accesibilidad y comportamiento MUI mientras cambia el package
  portable.
- El Lab verifica desktop, 390 px, teclado, reduced motion, estados de error y overflow.

## Risks and revisit triggers

- **API común demasiado abstracta:** mantener adapters pequeños y promover sólo con dos
  consumers reales.
- **Acoplamiento a MUI:** bloquear imports desde packages portables y ejecutar dependency
  gates.
- **Package sin release operativo:** no marcar `stable` sin publish reproducible y rollback.
- **Lab duplicado durante la transición:** mantener `/design-system` como catálogo de
  Greenhouse y enlazar al Lab independiente hasta que exista paridad.
- **Cambio de hosting o registry:** reabrir ADR si aparecen secretos, persistencia,
  colaboración, jobs o necesidades de runtime server-side.
