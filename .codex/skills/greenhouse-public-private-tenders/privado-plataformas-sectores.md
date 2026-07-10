# Tenders Privados — Plataformas, Registros y Sectores

El terreno físico donde ocurren los tenders privados: las **plataformas e-procurement** por las que el comprador te invita y recibe tu oferta, los **registros/precalificaciones** que debes tener antes de poder ofertar, y los **playbooks por sector**. El proceso vendor-side (RFI/RFP/RFQ, evaluación, BAFO) va en `privado-rfp-lifecycle.md`.

## Plataformas e-procurement (por dónde entra la oportunidad)

Los corporativos grandes no licitan por email: usan un **e-procurement / e-sourcing suite**. Estar registrado y saber operarla es requisito de entrada.

| Plataforma | Qué es | Dónde la ves |
|---|---|---|
| **SAP Ariba** | La suite líder de procurement; Ariba Network conecta compradores y proveedores | Grandes empresas, minería, retail, banca, multinacionales |
| **Coupa** | Suite de spend management + sourcing muy extendida | Corporativos medianos-grandes, tech, servicios |
| **Jaggaer** | e-sourcing enterprise (ex SciQuest) | Industria, universidades, salud |
| **GEP SMART** | Suite unificada de source-to-pay | Grandes corporativos globales |
| **Oracle Procurement Cloud** | Módulo de Oracle Fusion | Empresas con stack Oracle |
| **SAP Fieldglass** | **VMS** (Vendor Management System) específico para **staff augmentation / servicios contingentes** — se contrata gente/roles, no proyectos | Contratación de talento externo, staff aug, consultoría por rol |
| **Portales propios** | Muchas empresas grandes tienen su propio portal de proveedores | Caso a caso |

Implicaciones:

- **Regístrate en la red del comprador antes** de que salga el tender (Ariba Network, portal de proveedores). El alta suele incluir due diligence (documentos legales, financieros, seguridad).
- **Fieldglass ≠ RFP de proyecto.** Es un VMS: se contratan **roles/personas** con tarifa por hora/rol, órdenes de trabajo (Work Orders), timesheets. Si Efeonce va por staff augmentation, el juego es tarifa por rol + disponibilidad, no propuesta creativa. Cruza con `greenhouse-talent-people-operator`.
- La plataforma define el **formato de respuesta** (igual que los anexos en público): responde en su estructura o quedas fuera.

## Precalificación y registros de proveedor (el "ChileProveedores" privado)

Muchos sectores exigen estar **precalificado** en un registro sectorial **antes** de poder ofertar. Sin el registro vigente, no te invitan.

| Registro | Ámbito | Nota |
|---|---|---|
| **Achilles** | Registro de proveedores para minería, energía, oil & gas, utilities en LATAM (RepHispana y otras comunidades) | Muy usado por grandes mineras/energéticas; requiere data legal, financiera, HSE, calidad |
| **SICEP** | Sistema de gestión de proveedores usado en minería (Chile) | Precalificación técnica/administrativa |
| **REPRO / registros de la industria** | Registros sectoriales según país/industria | Verificar por caso |
| **Portales de proveedor propios** (Codelco, BHP, Falabella, bancos, etc.) | Alta directa en el sistema del cliente | Due diligence propia del cliente |

Reglas:

- La **precalificación toma tiempo** (semanas): documentación legal, estados financieros, certificaciones (ISO, HSE), políticas (ética, seguridad, laboral). Empieza **antes** de necesitarla.
- Mantén los registros **vigentes**: un registro vencido = invitación perdida.
- Para minería/energía, **HSE (Health, Safety, Environment)** y compliance son requisitos duros, no opcionales.

## Playbooks por sector

### Minería y energía
- Compradores: Codelco, BHP, Antofagasta Minerals, Anglo American, generadoras/transmisoras.
- Entrada: precalificación (Achilles/SICEP/portal propio) + HSE + capacidad financiera demostrada.
- Ciclos largos, contratos grandes, exigencia alta de compliance y continuidad operativa.
- Para agencia: comunicación corporativa, campañas de seguridad, contenido, RR.CC. comunitarias, sitios/plataformas. Diferénciate por experiencia sectorial y sensibilidad al riesgo reputacional.

### Retail y consumo masivo
- Compradores: grandes retailers, marcas de consumo.
- Ciclos más rápidos, foco en performance/creatividad/velocidad, muchos servicios de marketing.
- Encaja fuerte con el catálogo de Efeonce (campañas, contenido, performance, social). Cruza con `efeonce-agency` + `digital-marketing`.

### Banca y servicios financieros
- Compradores: bancos, aseguradoras, fintech.
- Compliance y seguridad de la información **muy** exigentes (data protection, due diligence de proveedor, a veces auditorías).
- Ciclos formales, comités de riesgo. La confianza y las referencias pesan.

### Telco y tecnología
- Ciclos formales, e-procurement maduro (Ariba/Coupa), foco en escalabilidad y SLA.

### Salud privada
- Clínicas/prestadores; compliance regulatorio + sensibilidad de datos de salud.

## Diferencias clave con lo público (operativas)

- **No hay obligación de publicidad:** la oportunidad llega por invitación / relación / plataforma, no por un portal abierto único. El **radar** es distinto: relaciones, ABM, plataformas, no scraping de un portal estatal.
- **Precalificación en vez de inhabilidades legales:** el filtro de entrada es el registro/due diligence del cliente, no el art. 4 de una ley.
- **Confidencialidad (NDA)** en vez de expediente público: separa estrictamente lo confidencial del cliente de tus notas internas.
- **El competidor y su precio son opacos:** no hay dato abierto de quién ganó ni a cuánto.

## Radar de oportunidades privadas (cómo se descubren)

A diferencia del público (portal + API), el pipeline privado se alimenta de:
- **Relaciones y ABM** (cuentas objetivo trabajadas por comercial — `commercial-expert`).
- **Alta en plataformas/redes de proveedores** de las cuentas objetivo (Ariba Network, portales propios).
- **Precalificación proactiva** en registros sectoriales de los mercados donde Efeonce quiere jugar.
- **Señales de intención** (una cuenta que abre un RFI, un contacto que avisa).

Esto vive en el CRM/pipeline (`hubspot-greenhouse-bridge`), no en el módulo de licitaciones públicas — pero el **mismo lifecycle bid/no-bid** (`bid-lifecycle-go-no-go.md`) aplica.

## Hand-off

- Proceso, evaluación, negociación/BAFO → `privado-rfp-lifecycle.md`.
- Staff augmentation / Fieldglass / roles → `greenhouse-talent-people-operator`.
- Cuentas objetivo, ABM, pipeline → `commercial-expert` + `hubspot-greenhouse-bridge`.
- Servicios por sector → `efeonce-agency` + `digital-marketing`/`seo-aeo` según rubro.
