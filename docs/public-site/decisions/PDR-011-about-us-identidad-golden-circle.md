# PDR-011 — About Us: página de identidad (E-E-A-T) estructurada como Golden Circle

> **Tipo:** Product Decision Record (posicionamiento + IA de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento + IA + arco de copy) — sesión con el operador, 2026-07-08. **Ejecución `UI ready: no`** (bloqueada por dependencias abajo).
> **Ejecución:** [`TASK-1369`](././tasks/to-do/TASK-1369-about-us-identidad.md) + wireframe. Epic: `EPIC-019`.
> **Depende de / refina:** [PDR-010](PDR-010-home-es-el-pitch-agencia-se-pliega.md) (la Home es el pitch; el About Us es el gap real). El **Why** que estructura esta página es SSOT de `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce.
> **No-duplicación:** cita el context pack (`01`, `05`, `09`, `10`) y PDR-008/010; no recopia su sustrato.

## Contexto

[PDR-010](PDR-010-home-es-el-pitch-agencia-se-pliega.md) resolvió que **la Home es el pitch** de la agencia y que el **About Us es el gap real** — el lugar donde vive la identidad (las 4 unidades como capabilities, el método, el ecosistema de producto) que no debe estar en el pitch. Ya existe una página `/about-us-efeonce/` (page_id 249770) con la semilla *"El crecimiento real no se compra por partes. Se orquesta."* + eyebrow *"Agencia de crecimiento integrada"*, pero hace de nodo de confianza básico; falta reconstruirla como **página de identidad / E-E-A-T de primer nivel**.

En paralelo, la sesión articuló el **Why de marca** (Golden Circle, Sinek): *no te entregamos crecimiento, lo construimos contigo —y te dejamos más capaz de sostenerlo* (co-creación · educación · integralidad). El About Us es la superficie natural para expresarlo **a fondo**.

## Decisión

Reconstruir `/about-us-efeonce/` como **página de identidad estructurada como Golden Circle (Why → How → What)**, comunicación inside-out. Es identidad/E-E-A-T, **no un pitch** (el pitch es la Home, PDR-010).

### 1. Trabajo y encuadre

- **Job:** confianza + E-E-A-T + entidad. Responde *quiénes son · por qué les creo · cómo trabajan por dentro*. NO convierte tráfico de categoría (eso es la Home).
- **Profundidad "a fondo"** (decisión del operador): cuenta el sistema completo —4 capacidades, método (Loop + ICO), software propio (Greenhouse/Kortex/Verk)— pero **como identidad, no como catálogo de producto ni como pitch**.
- **Una página rica + sección de equipo** (no un cluster de URLs; se separa solo si crece).

### 2. Estructura Golden Circle (el arco)

Inside-out: la creencia abre, el mecanismo la prueba, lo tangible cierra como consecuencia.

- **WHY (la creencia):** Manifiesto (lidera el Why, no "se orquesta") → Por qué existimos (la molestia fundacional) → Las 7 creencias contrarias → Los 3 pilares del Why (co-creación · educación · integralidad).
- **HOW (el mecanismo que lo prueba):** Cuatro capacidades / un solo cerebro → El método (Loop + ICO) → Lo ves en vivo / software propio → Medición honesta.
- **WHAT (lo tangible, la consecuencia):** La prueba (casos con dato) → El equipo (bios reales = E-E-A-T) → Cierre + CTA.

El copy final vive en el wireframe `docs/ui/wireframes/TASK-1369-about-us-identidad.md` (SSOT del copy de esta página).

### 3. Reglas de marca (heredadas)

- **Capabilities, no sub-marcas** (PDR-008 + skill `efeonce-agency`): NUNCA nombrar Globe/Reach/Wave como marcas/proveedores al cliente. Se describen por función. Los *"Empower your Brand/Growth/Voice/Engine"* son la voz que Efeonce adopta al operar cada capability, no taglines de sub-marca. *En una página de identidad* sí se puede explicar la operación interna, pero la marca que lidera es **Efeonce**.
- **Nunca el Why sin su mecanismo** (regla anti-humo del Golden Circle, `09`): "co-creación/integralidad/partner" van siempre encadenados a su prueba (el login, el grader, el número, el ciclo).
- **Solo casos citables** (Sky/Bresler/Berel).
- **es-LATAM neutro**, tuteo, sin voseo. `hreflang`-ready.
- **Voz** validada con `greenhouse-ux-writing`; copy no expone marca del portal interno.

### 4. CTA y CRO

- CTA primario suave (es identidad): **"Agenda una reunión"** (mismo mecanismo transversal, PDR-009); secundario **"Únete al equipo"** (careers).
- El grader puede enlazarse como diagnóstico, no se reconstruye (nodo compartido, PDR-002/003).

## Arquitectura de información

- **About Us ≠ Home:** la Home vende (pitch, categoría SEO); el About Us da identidad/confianza (intención marca/navegacional). No compiten (PDR-010).
- **Slug:** hoy `/about-us-efeonce/` (249770). Sugerencia: `/nosotros` (consistencia es-LATAM) con 301 del viejo. Decisión menor, se confirma en la task.
- Registrar en el [route-ownership matrix](././operations/public-site-route-ownership-matrix-20260616.md) + SEO preflight (JSON-LD `Organization` + `Person` para liderazgo = entidad citable) antes de indexar.

## Dependencias duras (por qué `UI ready: no`)

1. **Bios reales del equipo** — nombres, roles, fotos, bios del liderazgo/equipo. E-E-A-T no admite inventarlos; es entidad de autor. **Bloqueante.**
2. **Dirección de arte del hero + Product Design direction** — el copy/IA/estructura están decididos, pero el arte del hero y el sistema visual no. La task queda `UI ready: no` hasta tener la dirección aprobada + GVC (misma disciplina que PDR-004/008).

## Consecuencias

- Cierra el gap que abrió PDR-010: la identidad/ecosistema sale del pitch (Home) y encuentra su hogar correcto.
- El Why (Golden Circle) obtiene su superficie pública de máxima profundidad.
- E-E-A-T real (entidad de marca + entidades de autor) para SEO/AEO.

## Reglas duras

- **NUNCA** convertir el About Us en un segundo pitch (duplica la Home). Es identidad/confianza.
- **NUNCA** nombrar las unidades como sub-marcas/proveedores; capabilities descriptivas, Efeonce lidera.
- **NUNCA** el Why sin su mecanismo (anti-humo)
- **NUNCA** marcar `UI ready: yes` sin bios reales + dirección de arte aprobada + GVC desktop/mobile.
- **SIEMPRE** ejecutar vía `efeonce-public-site-wordpress`, validar copy con `greenhouse-ux-writing`, y estructurar el copy como Golden Circle (Why→How→What).

## Enlaces

- SSOT del Why: `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce.
- PDR hermanos: [PDR-010](PDR-010-home-es-el-pitch-agencia-se-pliega.md), [PDR-008](PDR-008-landing-agencia-marketing-digital-posicionamiento.md), [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md).
- Ejecución: [`TASK-1369`](././tasks/to-do/TASK-1369-about-us-identidad.md) + wireframe `docs/ui/wireframes/TASK-1369-about-us-identidad.md`.
- Contexto: `docs/context/01_quienes-somos.md`, `05_voz-tono-estilo.md`, `09_marca-agencia.md`, `10_experiencia-cliente.md`.
