# 14 · Modelo de Negocio — ASaaS

> **Para qué sirve este archivo.** Explica **cómo Greenhouse genera y captura valor** y, por tanto, **por qué el switching cost es el North Star** (`00`). Es el "por qué económico" detrás de las decisiones de producto. Fuentes: ASaaS Strategy (mar-2026) **+ su Addendum de Recalibración**, que es la verdad vigente y corrige el timeline original.

## Qué es ASaaS

**Agency Service as a Software** invierte la lógica del SaaS. Un SaaS empaqueta software como servicio; el ASaaS empaqueta **el servicio de agencia como si fuera un producto de software**. El cliente no contrata horas ni entregables: **accede a un sistema** —login, dashboards, datos en tiempo real, aprendizaje, red, valor acumulativo— donde el servicio humano opera por debajo como motor, no como interfaz. La premisa: la agencia del futuro compite más contra herramientas de software que contra otras agencias.

Como posicionamiento de escala, ASaaS convierte a Efeonce en un **Growth Operating System**: estrategia, creatividad, medios, datos y software propio trabajando como una sola operación. Esto es **global-ready** por diseño: el sistema puede localizar idioma, mercado, regulación y canales sin cambiar la tesis central. LATAM es el primer campo de prueba, no el límite del modelo.

### Las 6 características del modelo (cada una es una directriz de producto)

| Característica | Qué significa | Implicación de producto |
|---|---|---|
| **Acceso permanente** | Login 24/7, no esperar reportes | El portal es la relación, no un add-on |
| **Datos en tiempo real** | Métricas vivas, no informes mensuales | Webhooks > sync diario (gap declarado) |
| **Experiencia estandarizada** | Misma calidad sin importar el equipo asignado | Multi-tenant uniforme; ICO Engine automatizado |
| **Valor acumulativo** | El sistema vale más con el uso; cada ciclo alimenta el siguiente | **El historial es feature** (`greenhouse_serving`, Account 360) |
| **Switching cost creciente** | Cuanto más se usa, más caro e ilógico cambiarse | **Es el North Star.** Cada dato acumulado lo refuerza |
| **Monetización recurrente** | Fee mensual predecible, lógica de suscripción | Habilita el tier pricing (abajo) |

> **El switching cost se gana haciendo al cliente más capaz, no más dependiente.** La agencia tradicional retiene por **opacidad** (no te enseño, no ves, cuesta irte). Efeonce retiene por **capacidad + memoria**: te educamos (co-creas mejor, das mejores briefs → mejor trabajo, cadena ICO) y tu historial acumulado en las plataformas te ata **por valor, no como rehén**. Educar al cliente y subir el switching cost **no se contradicen: se refuerzan.** Este insight es parte del **Why** de Efeonce — SSOT en `09_marca-agencia.md` → §El Golden Circle (Reconciliación con el modelo ASaaS).

---

## Estado real (recalibrado) — esto es lo que cambió

El doc ASaaS original asumía que Greenhouse era un MVP temprano por construir. **El addendum de recalibración (post análisis técnico) corrige esa premisa: Greenhouse ya tiene capacidades de Fase 2, 3 y parcialmente 4 funcionando.** Madurez ASaaS real **~77%** (no el ~63% estimado).

| Dimensión ASaaS | Nivel real | Gap residual |
|---|---|---|
| Plataforma con login | **95%** | Entorno demo para prospectos |
| Datos en tiempo real | **85%** | Webhooks real-time (diseñados, no implementados) |
| Experiencia estandarizada | **90%** | Desplegar las 8 fases del journey en clientes activos |
| Valor acumulativo | **90%** | Hacer **visible al cliente** la inteligencia ya acumulada |
| **Self-service del cliente** | **55%** | **Acciones desde el portal (aprobar, solicitar, briefs) ← gap real más grande** |
| **Monetización recurrente** | **60%** | **Tier pricing (Basic/Pro/Enterprise)** |
| Onboarding automatizado | **65%** | Provisioning end-to-end + template de tenant |

> **El hallazgo que el agente no puede olvidar:** *el gap más grande NO es tecnología — es self-service del cliente y monetización por tiers.* La tecnología base ya existe. Lo que falta es **exponer** al cliente lo construido y **habilitarlo para actuar**.

---

## Hoja de ruta recalibrada (exponer y adoptar, no construir)

> Las fases describen **orden y foco**, no calendario duro. La fase vigente y cualquier fecha se verifican contra `project_context.md` (no fijar quarters aquí, que envejecen).

| Fase | Original | **Recalibrada (vigente)** |
|---|---|---|
| **Fase 1 · Exposición al cliente** | "Transparencia — completar el MVP" | El MVP ya está. Foco: dominio + **tenant demo con datos simulados realistas**, onboarding de clientes (Sky, ANAM), integrar demo en el pitch BDR, test coverage en finance/payroll/identity. |
| **Fase 2 · Operación como producto** | Operación como producto | **Es el gap real.** Self-service: aprobar piezas, solicitar variantes, briefs desde el portal, webhooks real-time. |
| **Fase 3 · Exponer inteligencia** | "Construir AI agents + inteligencia" | **Exponer, no construir.** La inteligencia financiera (revenue/margen por cliente) y los AI tools ya existen internos. Falta la **vista cliente** filtrada + recomendaciones en dashboard + "Tu año con Efeonce" automático. |
| **Fase 4 · Plataforma como producto** | Plataforma como producto | Tier pricing, API abierta, white-label, marketplace de AI agents. |

---

## Modelo comercial

> El business model completo de cada oferta vive en `docs/business-models/`. Este context pack conserva sólo
> la doctrina ASaaS y el mapa necesario para orientar producto; no es un tarifario ni el source of truth de
> unit economics.

### Taxonomía comercial vigente

La relación no cabe en un solo enum. Se separa en tres preguntas:

| Eje | Opciones | Pregunta que responde |
|---|---|---|
| **Modelo de delivery** | **Managed Squad** · **Staff Augmentation** · **Studio Access** · híbrido por lanes | ¿Quién dirige, qué capacidad se compra y quién responde por el outcome? |
| **Forma de engagement** | **On-Going** · **On-Demand** · **Sample Sprint** | ¿Qué duración y forma contractual toma la relación? |
| **Modo operativo Creative Studio** | `efeonce-managed` · `co-operated` · `client-operated` | ¿Quién opera y aprueba un run/lane específico? |

**Managed Squad no es Staff Augmentation.** En Managed Squad Efeonce arma, dirige y gobierna la operación;
puede responder por OTD/FTR del scope que controla. En Staff Augmentation el cliente dirige perfiles integrados
vía Deel; Efeonce no vende silenciosamente dirección creativa ni outcome SLA. Si una cuenta combina ambas,
cada lane tiene owner, precio y accountability separados.

On-Going, On-Demand y Sample Sprint no compiten con esos modelos: son formas de engagement. Un Sample Sprint
puede validar un Managed Squad, Studio Access o una configuración co-operated; no es una cuarta forma de
delivery ni un descuento.

### Evolución: modelo híbrido por tiers
No se abandona el fee de servicio — se **agrega una capa de producto** que justifica pricing premium y genera stickiness.

| | **Greenhouse Basic** | **Greenhouse Pro** | **Greenhouse Enterprise** |
|---|---|---|---|
| **Portal** | Dashboard + KPIs | + acciones | + AI + API |
| **Métricas** | OTD%, RpA | + Revenue Enabled | + benchmarks industria |
| **AI Agents** | Brand governance | + recomendaciones | + agents custom |
| **Acciones** | Solo visualización | Aprobar + solicitar | + integraciones |
| **Comunidad / aprendizaje** | Newsletter + contenido/tools | + networking + webinars | + advisory board + benchmarks |
| **Reporting** | Mensual | Quincenal + portal | Real-time + custom |

> Estos tiers son **capability flags en el producto** (ver Admin/RBAC y arquitectura de acceso vigente). El agente debe construir features pensando a qué tier pertenecen: una vista de Revenue Enabled es Pro+; los benchmarks cross-tenant son Enterprise y dependen de masa crítica.

### Creative Studio: ASaaS en su forma más literal

Creative Studio no obliga a escoger entre “vender software” y “vender agencia”. Productiza el servicio creativo en un sistema que puede ser operado con distintos grados de autonomía:

Su propósito concilia autoría y escala: el equipo creativo conserva la parte irrepetible —pensar, explorar,
dirigir y decidir— y Globe absorbe la parte pesada —Creative Prompt Engineering, routing, referencias,
restricciones, parámetros, estimate, retries, lineage y memoria—. El operador es el punto de vista de la
experiencia, pero el workspace/equipo es el protagonista económico; la autoridad y la aprobación siguen humanas.

| Modo operativo | Valor que compra el cliente | Frontera económica |
|---|---|---|
| **Efeonce-managed** | Capacidad gobernada, dirección, ejecución y accountability de delivery | Fee de servicio/capacidad; Efeonce controla el scope y puede comprometer OTD/FTR |
| **Co-operated** | Sistema compartido + capacidad Efeonce en lanes, excepciones o picos | Servicio y acceso se empaquetan con responsabilidades explícitas por tramo |
| **Client-operated** | Autonomía sobre templates curados, memoria y controles del Studio | Acceso/credits/soporte futuros; no incluye por defecto dirección ni SLA de Managed Squad |

Estos modos **no son un modelo de delivery ni una forma de engagement adicional**. Tampoco son tres productos.
El mismo run, assets, lineage, review y ledger cambian de operador sin perder contexto. Staff Augmentation sigue
siendo client-directed y no puede usarse para esconder un Managed Squad.

La formulación completa reemplaza esa lista plana: los modos se asignan dentro de una combinación explícita de
**modelo de delivery + forma de engagement**. Por ejemplo, `On-Going + Managed Squad` puede contener runs
`efeonce-managed` y una lane graduada a `client-operated`; `Staff Augmentation + efeonce-managed` en la misma
lane es inválido. Canon: [Creative Studio Business Model V1](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md).

La progresión adecuada es **observar/revisar → correr templates curados → ajustar variables autorizadas → construir/versionar sólo con madurez y permiso**. El sistema debe enrutar alta ambigüedad, riesgo de marca, derechos complejos o gasto elevado hacia co-operación/managed; empujar todo a self-service dañaría craft y trasladaría riesgo al cliente.

El flywheel económico es servicio → template validado → autonomía segura → uso/evidencia → excepciones y picos gestionados por Efeonce → mejor template. Por eso el producto no canibaliza automáticamente el servicio: lo mueve desde la repetición hacia dirección, diseño de workflows, QA y capacidad elástica. La prueba ASaaS no es vender más tokens; es que el cliente quede **más capaz** y el sistema con **más memoria**.

Esta doctrina mejora la captura de valor sin cambiar las cinco líneas de ingreso: hace defendible gobierno/
plataforma por reducción de complejidad y memoria; eleva capacidad humana hacia dirección/curation; convierte
templates y Creative Prompt Engineering en IP acumulativa; y mantiene credits como operaciones gobernadas, no
como venta de prompts. Otras agencias permanecen como hipótesis B2B2B y no alteran tiers, delivery ni acceso
hasta probar tenancy, rights, marca, accountability y margen.

---

## La implicación estratégica (por qué importa para cada decisión)

La recalibración cambia tres cosas, y todas tocan al producto:

1. **El pitch dejó de ser "vamos a construir un producto".** El producto ya existe. Es "tenemos un producto que ninguna otra agencia en LATAM tiene", con **demo en vivo**. → Por eso el **tenant demo** (Fase 1) es dependencia comercial crítica, no un nice-to-have.
2. **El switching cost se activa desde el día 1.** El cliente tiene login y métricas desde el onboarding; no hay que esperar a que el valor acumulativo crezca. → Cada feature que profundiza el historial y la transparencia **acelera el switching cost**.
3. **La narrativa ASaaS se valida con evidencia.** 40+ páginas, 8 módulos, 7 integraciones hacen demostrable lo que antes era concepto.

**El error más costoso sería seguir tratando a Greenhouse como futuro cuando ya es presente.** La visión ASaaS sigue válida; lo que cambió es el timeline: Fase 1 no es construir — es **exponer y adoptar**.

### Qué significa para el agente
- Prioriza **exponer al cliente** lo ya construido por encima de construir capacidades nuevas internas (el gap es de exposición, no de tecnología).
- Las dos fronteras de producto con más palanca de negocio hoy: **self-service** (acciones desde el portal) y **vista cliente de inteligencia** (financiera/Revenue Enabled filtrada por tenant).
- Cada feature de **acumulación de historial y transparencia** es, literalmente, construir el foso (switching cost).
- Respeta el aislamiento multi-tenant y los tiers como capability flags: exponer datos de un tenant a otro rompería la promesa central del modelo.

---

*Fuentes: ASaaS Strategy (mar-2026) + Addendum de Recalibración (vigente). El addendum prevalece sobre el roadmap original donde difieren. Nombres/dominios normalizados según `00` (Greenhouse, greenhouse.efeoncepro.com). Última verificación de drift contra runtime: 2026-07-23 — Creative Studio está operativo internal-only; acceso cliente y B2B2B permanecen gateados; estado/roadmap vivo en `project_context.md`.*
