# 04 · Transferencias Internacionales + DPA + GDPR

> **⚠️ No es asesoría legal.** Orienta y cita; valida con abogado. Este módulo es transversal: casi todo tratamiento moderno **cruza fronteras** (CRM/martech en la nube, clientes en varios países, equipo distribuido).

Efeonce opera en 4 países + abre EEUU, y sus clientes Globe son internacionales. Los datos **se mueven** (HubSpot, Google, Notion, nubes en EEUU). Esto dispara dos temas: **quién es qué** (controller/processor) y **cómo se legitima la transferencia**.

## Controller vs Processor (la distinción que define el contrato)

- **Controller / Responsable** — decide **fines y medios** del tratamiento. El **cliente** de Efeonce suele ser el controller de los datos de sus usuarios.
- **Processor / Encargado** — trata datos **por cuenta** del controller, siguiendo sus instrucciones. **Efeonce como agencia suele ser processor** de los datos de sus clientes (corre campañas, gestiona su CRM).
- **Sub-processor** — el processor subcontrata (HubSpot, Google, un freelancer). Requiere autorización del controller + contrato back-to-back.

**Consecuencia:** cuando Efeonce trata datos de un cliente, necesita un **DPA (Data Processing Agreement / contrato de encargo)** con ese cliente, y **DPAs con sus sub-processors** (martech). Sin DPA, el tratamiento es irregular en casi todas las jurisdicciones cubiertas.

## DPA / Contrato de encargo — contenido mínimo

Un DPA (llámese "contrato de encargo" en LATAM, "DPA" en GDPR, "service provider/contractor terms" en CCPA) debe fijar:

- **Objeto, duración, naturaleza y finalidad** del tratamiento.
- **Tipos de datos** y **categorías de titulares**.
- **Instrucciones**: el processor solo trata según instrucciones del controller.
- **Confidencialidad** del personal.
- **Medidas de seguridad** (→ `greenhouse-secret-hygiene`).
- **Sub-encargados**: autorización + flow-down de obligaciones.
- **Asistencia** al controller (derechos de titulares, brechas, evaluaciones).
- **Devolución/eliminación** de datos al terminar.
- **Auditoría**.
- **Transferencias internacionales** y su mecanismo (abajo).

## GDPR — cuándo te alcanza (aunque no estés en la UE)

El **GDPR (UE)** tiene **alcance extraterritorial**: aplica si tratas datos de personas **en la UE** al (a) ofrecerles bienes/servicios o (b) monitorear su comportamiento — **sin importar dónde esté Efeonce**. Un cliente Globe con audiencia europea puede arrastrarte a GDPR.

Si GDPR aplica:
- Bases de licitud, derechos ampliados, **DPO** según el caso, **DPIA** para alto riesgo, **notificación de brechas 72h**, y **transferencias fuera del EEE** legitimadas (abajo).
- Multas muy altas (hasta % de facturación global).

## Legitimar la transferencia internacional (los mecanismos)

Cuando los datos **salen** hacia un país sin "nivel adecuado", necesitas un mecanismo:

- **Decisión de adecuación** — el país destino es considerado "adecuado" (lista corta). Si aplica, la transferencia es libre.
- **SCCs (Standard Contractual Clauses)** — cláusulas tipo que las partes firman; el mecanismo más usado GDPR. Requieren a menudo un **TIA** (Transfer Impact Assessment).
- **BCRs (Binding Corporate Rules)** — para grupos multinacionales.
- **Consentimiento explícito / excepciones** — acotado, no para flujos masivos.
- **Data Privacy Framework (UE–EEUU)** — marco para transferencias a empresas US certificadas (verifica su estado vigente).

**En LATAM:** Chile (nueva 21.719), Colombia, México y Perú tienen **cada uno** su régimen de transferencia internacional (garantías, cláusulas, a veces registro/autorización). No asumas que un mecanismo GDPR basta para LATAM — verifica por país.

**Data localization:** algunos sectores/países exigen que ciertos datos **no salgan** del territorio. Verifica si el cliente/rubro lo impone.

## Aterrizaje Efeonce (stack real)

- **HubSpot, Google (GA4/Ads), Notion, nubes en EEUU** → Efeonce transfiere datos a EEUU. Necesitas **DPAs con esos proveedores** (los ofrecen) + mecanismo de transferencia + informarlo en la privacy policy.
- **Como processor del cliente:** firma DPA con el cliente y **replica** las obligaciones hacia tus sub-processors (flow-down).
- **Como controller propio** (tus leads/marketing): tú eres responsable de legitimar tus transferencias.

## Checklist

- [ ] Define el rol en cada flujo: ¿controller o processor?
- [ ] **DPA con clientes** (cuando eres processor) + **DPAs con sub-processors** (martech).
- [ ] ¿GDPR aplica? (audiencia/usuarios en la UE) → régimen completo.
- [ ] Mecanismo de transferencia por destino (adecuación / SCCs / DPF) + TIA si aplica.
- [ ] Régimen de transferencia **por cada país LATAM** (no asumir uno solo).
- [ ] ¿Data localization exigida? (sector/país).
- [ ] Transferencias declaradas en la privacy policy (`09`).

## Hand-off

- Régimen por país → `01` (CL), `02` (LATAM), `03`/`03b` (US).
- DPA como cláusula contractual → `05`.
- Seguridad/PII/sub-processors técnicos → `greenhouse-secret-hygiene` + `arch-architect`/`greenhouse-backend`.
- Declaración en el sitio → `09` + `efeonce-public-site-wordpress`.
- **Validación legal** → abogado de privacidad (por jurisdicción).
