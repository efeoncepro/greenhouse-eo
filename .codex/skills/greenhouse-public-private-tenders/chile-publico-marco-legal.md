# Chile Público — Marco Legal

> **Regla de vigencia:** las cifras (UTM, plazos, umbrales) y las normas cambian. La **Ley 21.634 (publicada 2023, con reglamento y entrada en vigencia escalonada 2024–2025)** modernizó la Ley 19.886. Verifica siempre la versión vigente en `www.chilecompra.cl`, `bcn.cl/leychile` o el reglamento antes de dar una cifra como definitiva. Cuando cites, incluye el año de la fuente.

## Las tres capas normativas

1. **Ley 19.886** — Ley de Bases sobre Contratos Administrativos de Suministro y Prestación de Servicios ("Ley de Compras Públicas"). Es el marco base.
2. **Ley 21.634 (2023)** — reforma de modernización. Refuerza integridad y probidad, criterios de sostenibilidad/inclusión, Compra Ágil, profesionalización de compradores, y ajusta procedimientos. Trata su contenido como el estado del arte, pero confirma qué artículos ya entraron en vigencia (fue escalonada).
3. **Reglamento (DS 250 de Hacienda y sus modificaciones)** — la letra chica operativa: plazos, garantías, criterios, causales de trato directo, formatos. La mayoría de las preguntas operativas se resuelven en el Reglamento, no en la Ley.

Normas conexas frecuentes:
- **Ley 20.393** — responsabilidad penal de personas jurídicas (delitos como cohecho, lavado). Inhabilita para contratar si hay condena vigente.
- **Ley 19.880** — procedimiento administrativo (impugnaciones, plazos, notificaciones).
- **Ley 18.575** — bases generales de la Administración (probidad).
- **Código del Trabajo / cumplimiento previsional** — deudas laborales/previsionales generan inhabilidad.

## Actores del sistema

| Actor | Rol |
|---|---|
| **DCCP / ChileCompra** (Dirección de Compras y Contratación Pública) | Administra el sistema, opera `mercadopublico.cl`, dicta directivas, mantiene Convenios Marco y ChileProveedores, emite los tickets de la API |
| **Organismo comprador** | El servicio público que licita (ministerio, municipio, hospital, FF.AA., empresa pública que se rige por la ley) |
| **Oferente / proveedor** | Quien postula. Efeonce actúa aquí |
| **Comisión evaluadora** | Evalúa ofertas según criterios de las bases; levanta acta |
| **Contraloría General de la República (CGR)** | Toma de razón de contratos sobre cierto monto/relevancia; control de legalidad |
| **Tribunal de Contratación Pública (TCP)** | Conoce la acción de impugnación por actos ilegales/arbitrarios en el procedimiento, entre la aprobación de bases y la adjudicación |

## Principios que sí tienen consecuencia operativa

- **Estricta sujeción a las bases.** Las bases son "ley del contrato". Si un requisito está en las bases, es exigible; si tu oferta no lo cumple, es inadmisible. No se puede exigir ni ofrecer fuera de bases.
- **Igualdad de los oferentes / no discriminación.** Por eso las aclaraciones se hacen por el **foro público** (todos ven lo mismo), no por canales privados.
- **Libre concurrencia** — la licitación pública es la regla general; las excepciones (trato directo, licitación privada) requieren causal fundada.
- **Transparencia y publicidad** — todo el expediente es público (salvo confidencialidad acotada).
- **Probidad e integridad** (reforzados por 21.634) — conflicto de interés, prevención de cohecho, declaraciones.

## Inhabilidades e incompatibilidades (art. 4 Ley 19.886) — chequear SIEMPRE antes de ofertar

Un oferente no puede contratar (o su oferta es inadmisible / el contrato es nulo) si, entre otras causales:

- Tiene **condena por prácticas antisindicales o infracción a derechos fundamentales del trabajador** dentro de los últimos 2 años.
- Tiene **deudas laborales o previsionales** con sus trabajadores (afecta pago; puede exigirse retención).
- Es **funcionario directivo** del organismo comprador, o persona/empresa ligada por parentesco/sociedad (conflicto de interés).
- La persona jurídica tiene **condena vigente bajo Ley 20.393** (responsabilidad penal), o socios/administradores condenados por ciertos delitos.
- Está en **Registro de condenados** o con inhabilidad decretada.

> El detalle operativo del checklist de admisibilidad e inhabilidades vive en `compliance-riesgo-integridad.md`. Acá está la base legal; allá está la lista accionable.

## ChileProveedores (Registro de Proveedores)

- Registro oficial administrado por ChileCompra donde el proveedor acredita documentos (constitución, poderes, financieros, certificados).
- **Estar hábil e inscrito** agiliza la contratación: para adjudicar, el organismo exige que el proveedor esté hábil. Muchas bases exigen inscripción **al momento de contratar** (no necesariamente al ofertar), pero conviene estar hábil antes.
- Verifica el estado antes de cerrar el bid: un proveedor inhábil no puede firmar aunque gane.

## Control posterior: Contraloría y Tribunal

- **Toma de razón (CGR):** contratos sobre cierto monto o relevancia pasan por control de legalidad antes de producir efectos. Suma plazo real entre adjudicación y ejecución — considéralo en la planificación de delivery/cashflow.
- **Tribunal de Contratación Pública:** si crees que el procedimiento tuvo un acto ilegal o arbitrario (bases amañadas, evaluación fuera de criterios, adjudicación irregular), la vía es la **acción de impugnación** ante el TCP. Ventana temporal: desde la aprobación de las bases hasta la adjudicación. Fuera de esa ventana, la vía puede ser recurso administrativo (Ley 19.880) o judicial.
- **Recurso administrativo:** reposición/jerárquico ante el propio organismo por vicios del acto.

> **No des estos plazos/vías como consejo legal cerrado.** Orienta la ruta y remite a validación con abogado. La skill nunca decide una impugnación sola.

## Errores de lectura legal más comunes (que cuestan la licitación)

1. Confundir **requisito de admisibilidad** (excluyente) con **criterio de evaluación** (puntúa). Un requisito admisible mal cumplido te saca; un criterio bajo solo baja puntaje.
2. Asumir que una aclaración informal por teléfono/correo tiene validez — solo vale lo que entra por el **foro** o queda en las bases/respuestas oficiales.
3. Ignorar la **entrada en vigencia escalonada** de la reforma 21.634 y citar un artículo que aún no rige (o uno derogado).
4. Tratar Compra Ágil o Convenio Marco como "licitación" — son procedimientos distintos con reglas propias (ver `chile-publico-operativo.md`).

## Hand-off

- Operativa (modalidades, bases, criterios, garantías, plazos) → `chile-publico-operativo.md`.
- Admisibilidad accionable + integridad → `compliance-riesgo-integridad.md`.
- Validación legal de una impugnación/causal → **abogado humano**; la skill orienta, no dictamina.
