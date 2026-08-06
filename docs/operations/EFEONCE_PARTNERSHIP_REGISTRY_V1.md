# Efeonce — registro maestro de partnerships y providers V1

> **Estado:** `Activo — requiere actualización por evidencia`
> **Owner:** Strategy + Commercial + práctica dueña + Finance/Legal
> **Última revisión:** 2026-08-05
> **Empresa:** Efeonce Group SpA · RUT 77.357.182-1 · 55 personas · Santiago, Chile
> **Contacto operativo:** Julio César Reyes Rangel, CEO · `julio.reyes@efeonce.org`

## Propósito

Este es el registro central de las relaciones de Efeonce con plataformas, providers, distribuidores y programas de
partnership. Distingue una relación tecnológica de una aprobación comercial y evita publicar o vender un partnership
que sólo tenga una cuenta, una postulación o una conversación iniciada.

La lógica económica y los gates para convertir una relación en oferta viven en [`Efeonce Partner & Provider Layer
Operating Model V1`](../business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md). Este documento mantiene el
estado por relación, la evidencia observable y el siguiente paso.

## Taxonomía de estados

| Estado | Significado | Claim permitido |
| --- | --- | --- |
| `Partnership activo` | Programa o contrato vigente, con evidencia actual | Puede declararse partnership dentro del alcance probado |
| `Partner registrado` | Cuenta u organización registrada, sin nivel o habilitación comercial completa | No equivale a Select/Premier/Diamond ni a reseller |
| `Postulación enviada` | Formulario enviado y confirmación visible | Puede decirse “postulación enviada”; no “aceptado” |
| `Postulación pendiente` | Postulación iniciada o follow-up sin confirmación de envío/aceptación | No permite claims comerciales |
| `Provider en uso` | Tecnología usada en delivery, sin partnership comercial confirmado | Puede declararse uso tecnológico, no partnership |
| `Bloqueado` | Falta una acción, verificación, CAPTCHA, acuerdo o acceso | Debe tener owner y próximo paso |
| `No iniciado` | Relación identificada como oportunidad, sin evidencia de onboarding | Sólo prospecto/target |

## Registro consolidado

| Relación | Programa o vía | Estado al 2026-08-05 | Rol para Efeonce | Próximo paso / owner | Evidencia |
| --- | --- | --- | --- | --- | --- |
| **Google Cloud** | Google Cloud Partner Network / Partner Network Hub | **Partner registrado**. Todas las rutas visibles aparecen como `Registrado`; debida diligencia `En curso`; no hay nivel Select/Premier/Diamond activo | Rail enterprise, Cloud/AI, Services y posible Co-sell | Completar due diligence y revisar requisitos de nivel; owner: Julio | [ficha detallada](#google-cloud) |
| **Google for Education / Chrome** | Partner Advantage / Chrome y soluciones de administración | Onboarding iniciado; credenciales y autorizaciones no confirmadas | Educación, Chrome Enterprise y distribución | Verificar si sigue siendo una vía estratégica separada de Google Cloud | Correo de Arthur Guedes, 2025-11-17 |
| **Google Ads** | Google Partners | Bienvenida recibida en 2024; badge y estado actual no verificados | Performance/Growth | Confirmar si se mantiene y quién es el owner | Correo `partners-noreply@google.com`, 2024-06-07 |
| **Anthropic / Claude** | Claude Solution Partner | **Postulación pendiente**; Claude se usa con clientes | Agentes, razonamiento, knowledge systems y managed agents | Hacer follow-up y documentar casos de producción; owner: Julio + práctica IA | Auditoría comercial 2026-07-26; mailbox |
| **OpenAI** | Solution/partner route | **Postulación pendiente** | Agentes, automatización e integraciones | Esperar respuesta y hacer seguimiento; owner: Julio | Auditoría comercial 2026-07-26; mailbox |
| **BytePlus / ByteDance** | Partner Network — Agency + Reseller | **Bloqueado**: formulario preparado, CAPTCHA pendiente; no hay aceptación confirmada | Distribución y servicios para Seedance/Seedream | Completar CAPTCHA, revisar términos, soporte, economics y continuidad; owner: Julio | Auditoría comercial 2026-07-26; correo de Ingram Micro |
| **Runway** | Enterprise contact / Creative Partners | **Postulación enviada** para Enterprise; Creative Partners no confirmado por error HTTP 504 | Video generativo y Creative Operations | Esperar respuesta Enterprise; reintentar Creative Partners sólo si sigue siendo necesario | Confirmación web; auditoría comercial 2026-07-26 |
| **ElevenLabs** | Commercial Partner Program — Systems Integrator | **Postulación enviada y confirmada** | Voz, agentes conversacionales, dubbing y localización | Esperar discovery y eventual acuerdo comercial | Confirmación web; auditoría comercial 2026-07-26 |
| **Black Forest Labs / FLUX** | Creator Program | **Postulación enviada y confirmada** | Capability creativa y acceso temprano | Esperar contacto; no presentarlo como reseller/co-sell | Confirmación web; auditoría comercial 2026-07-26 |
| **AWS** | AWS Partner Central | **Bloqueado**: verificación de identidad pendiente | Rail cloud para clientes AWS-first | Completar documento + selfie y luego onboarding empresarial; owner: Julio | Auditoría comercial 2026-07-26 |
| **Salesforce** | Consulting Partner | **Bloqueado**: acuerdo y usuario no confirmados | CRM enterprise potencial | Completar aceptación y verificar usuario sólo si existe oportunidad concreta | Auditoría comercial 2026-07-26 |
| **HubSpot** | Solutions/Services Partner | Relación comercial listada en el modelo; estado contractual actual no revalidado en este corte | RevOps, CRM e implementación | Revalidar tier, portal, certificaciones y derechos antes de usar claim externo | Modelo Partner & Provider Layer V1 |
| **Lovable** | Lovable Partner Program | **Postulación pendiente** | Prototipado y accelerated delivery | Follow-up o cerrar como experimento; owner: Product/Commercial | Auditoría comercial 2026-07-26 |
| **HeyGen** | Agency Certification / waitlist | **No iniciado**: enlace de Typeform observado como incorrecto | Avatar, video y localización | Encontrar formulario vigente o solicitar acceso al Agency Group | Auditoría comercial 2026-07-26 |
| **Microsoft AI Cloud** | Partner ecosystem | **No iniciado / target** | Azure AI y clientes Microsoft-first | No abrir hasta existir oportunidad, owner y economics claros | Modelo Partner & Provider Layer V1 |

## Google Cloud

### Estado confirmado por revisión del portal — 2026-08-05

- Cuenta autenticada: `julio.reyes@efeonce.org`.
- Organización visible: **Efeonce Group Spa**.
- Portal: [Partner Network Hub](https://partners.cloud.google.com/).
- Rutas visibles como `Registrado`:
  - Google Cloud — Venta conjunta;
  - Google Cloud — Tecnología;
  - Google Cloud — Servicios;
  - Google Workspace — Venta conjunta y servicios;
  - Google Workspace — Tecnología.
- La página de oportunidades indica que los miembros no pueden crear oportunidades; por tanto, Efeonce todavía no
  tiene habilitada esa capacidad de partner.
- La FAQ actual de reventa indica que un partner con estado `Registrado` puede revender mediante distribución sin
  esperar a alcanzar un nivel o competencia; sí debe elegir y establecer relación con un distribuidor.
- En requisitos, **Complete due diligence** aparece `En curso`.
- El requisito opcional **Complete MVA to list on Marketplace** aparece `Completado`.
- La página de competencias muestra como `Apto`, entre otras, Artificial Intelligence, Application Modernization,
  Business & Pro Services, Data & Analytics y Gemini Enterprise. `Apto` no significa que la competencia ya esté
  concedida.

### Due diligence formal — evidencia de Outlook 2026-08-06

Google envió a `jreyes@efeoncepro.com` el correo `[ACTION REQUIRED] for Efeonce Group Spa - Please complete Google
Business Partner Due Diligence Questionnaire`, desde `due-diligence@google.com`. El proceso corresponde a la revisión
anti-soborno y background check de partners. La fecha límite indicada es **13 de agosto de 2026**. El correo advierte
que Efeonce no puede comenzar a trabajar con Google hasta completar el proceso y que una relación existente podría
quedar en pausa mientras esté incompleta.

La invitación contiene un enlace individual de Aravo. No se registra en este repositorio el enlace, contraseña ni
ningún token de acceso.

El 2026-08-06 el CEO aclaró que Efeonce contempla la posibilidad de vender o implementar soluciones de Google Cloud
para el Estado de Chile. Esto no debe declararse como una relación gubernamental actual si no existe una oportunidad o
contrato vigente, pero sí debe informarse como actividad pública potencial en el cuestionario. Cualquier respuesta debe
distinguir entre actividad actual, actividad prevista y ausencia de actividad.

### Datos solicitados por due diligence

El formulario todavía requiere decidir y/o completar:

1. Países donde Efeonce ofrecerá servicios o revenderá productos de Google.
2. Si el volumen anual previsto de transacciones con Google supera USD 50.000.
3. Si existe una entidad asociada que trabaje actualmente con Google.
4. Si Efeonce venderá a administraciones públicas o interactuará con funcionarios en nombre de Google.
5. Información del CEO y contacto operativo.

No se enviaron respuestas ni se aceptaron condiciones durante la revisión. El siguiente acto recomendado es completar
esta debida diligencia antes del 13 de agosto, después de confirmar las cuatro decisiones operativas anteriores.

### Interpretación comercial

Google Cloud es hoy un **partner registrado**, no un partnership comercial plenamente activado. La ruta recomendada
para Efeonce sigue siendo `Google Cloud → Servicios` y después `Co-sell`, enfocada en AI/agents, datos, arquitectura y
operación gestionada. La reventa puede comenzar en paralelo desde el estado `Registrado`, pero requiere revisar
Ingram/Xvantage, facturación, soporte, margen y responsabilidad contractual antes de ofrecerla a clientes.

### Plan de activación para apalancar Efeonce

El objetivo no es obtener una insignia, sino que Google pueda reconocer a Efeonce como una compañía capaz de diseñar,
implementar y operar soluciones de IA sobre Google Cloud para clientes empresariales en Chile y Latinoamérica.

#### Secuencia priorizada

1. **Completar due diligence.** Confirmar país, volumen anual esperado, entidades asociadas y relación con organismos
   públicos antes de responder o enviar el formulario.
2. **Activar la ruta Services.** Posicionar `Google Cloud → Servicios → Co-sell` como carril principal, con foco en
   agentes empresariales, Gemini/Vertex AI, arquitectura de datos, modernización y managed operations.
3. **Elegir Artificial Intelligence como primera competencia.** Application Modernization queda como segunda competencia
   posible; no conviene intentar obtener todas las competencias simultáneamente.
4. **Formar un pod interno pequeño.** Julio lidera la relación comercial; una persona cubre arquitectura/IA, otra
   delivery/operación y otra pipeline/casos. No se requiere habilitar a toda la empresa para comenzar.
5. **Preparar dos casos Google-ready.** Cada caso debe documentar problema, solución, servicios Google utilizados, rol de
   Efeonce, resultado medible, expansión posible y autorización de uso como referencia.
6. **Registrar workloads y oportunidades cuando la capacidad se habilite.** La progresión de niveles y competencias se
   apoya en contribuciones de preventa/postventa, certificaciones, credenciales, workloads y oportunidades
   cerradas/validadas; no basta con declarar experiencia.
7. **Abrir reventa como carril paralelo.** Retomar Ingram Micro y Xvantage para consumo/licencias, pero sólo después de
   revisar margen, facturación, soporte, responsabilidades y continuidad. La reventa no sustituye la propuesta de
   servicios de Efeonce.
8. **Solicitar conversación de co-selling.** Con due diligence, pod y primeros casos preparados, pedir a Google una
   conversación sobre oportunidades, inversión y co-selling en Chile/LatAm.

#### Gates antes de enviar o vender

- Las cuatro respuestas de due diligence deben estar confirmadas por Julio.
- No se publicará “Google Cloud Partner” como claim pleno mientras el estado siga siendo `Registrado`.
- No se ofrecerá reventa hasta cerrar términos de distribuidor, facturación, soporte y economics.
- No se presentará una competencia como obtenida mientras el portal sólo indique `Apto`.
- Los casos de clientes requieren evidencia y autorización de uso.

## Reglas de actualización

Cada actualización debe registrar:

- fecha de observación;
- programa y ruta exactos;
- estado usando la taxonomía anterior;
- evidencia primaria (portal, correo, acuerdo o respuesta oficial);
- owner y próximo paso;
- límites del claim comercial;
- revisión de términos, derechos de reventa, datos/IP, soporte, economics y continuidad cuando corresponda.

Una cuenta, badge visible, formulario enviado o correo de bienvenida no se convierte automáticamente en partnership
activo. Los programas de IA investigados en la auditoría del 2026-07-26 deben actualizarse aquí cuando exista nueva
evidencia; la auditoría se conserva como fotografía histórica.

## Fuentes relacionadas

- [`Efeonce Partner & Provider Layer Operating Model V1`](../business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md)
- [`AI Partner Program Applications — 2026-07-26`](../audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md)
- [Google Cloud Partner Network](https://cloud.google.com/partners)
- [Google Cloud Partner Network Hub](https://partners.cloud.google.com/)
