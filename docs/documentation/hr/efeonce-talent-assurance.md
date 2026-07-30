# Efeonce Talent Assurance

## Qué es

`Efeonce Talent Assurance` es el sistema que permite a Efeonce seleccionar, verificar, asignar, desarrollar y sostener capacidades humanas para clientes.

Su promesa visible es `Verificado por Efeonce`.

No es una página de Careers ni un badge decorativo. Es una relación entre evidencia, capacidad, contexto de cliente y continuidad.

Documentación técnica: [Talent Assurance Decision V1](../../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md).

Guardrails económicos: [Talent Assurance Economic Guardrails V1](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md).

## Qué significa `Verificado por Efeonce`

Una persona no queda “verificada” en abstracto. Se verifica un claim específico:

- qué skill o capability tiene;
- a qué nivel;
- para qué rol o contexto;
- con qué evidencia;
- quién la revisó;
- cuándo se verificó;
- hasta cuándo es vigente;
- qué límites tiene.

El sello no garantiza que la persona nunca cambie. Garantiza que Efeonce cuenta con evidencia y accountability proporcional a la capacidad comprometida.

## Las dos experiencias principales

### Operador del cliente

El operador debe poder confiar en que:

- la persona entiende su rol;
- la capacidad fue evaluada en situaciones relacionadas con el trabajo;
- el alcance y seniority están claros;
- existe un canal de feedback;
- Efeonce conserva la memoria de la cuenta;
- una salida no deja al cliente sin capacidad.

El operador aporta evidencia sobre desempeño y colaboración, pero no decide unilateralmente la identidad profesional de la persona.

### Colaborador

El colaborador debe saber:

- qué se espera de su rol;
- qué capacidades están verificadas;
- qué evidencia sustenta cada claim;
- cómo se revisa y renueva el estado;
- qué desarrollo necesita;
- cómo corregir o apelar un registro incorrecto.

La verificación debe abrir una ruta de desarrollo y no convertirse en una etiqueta opaca.

## Ciclo de assurance

```text
Demanda de capacidad
→ perfil y estándar
→ selección estructurada
→ evidencia de capability
→ decisión humana
→ onboarding y contexto
→ desempeño observado
→ feedback del operador
→ renovación, desarrollo o revocación
```

## Quality Gate de selección

Para roles críticos, una selección requiere evidencia suficiente en las competencias definidas para el rol. La evidencia puede incluir:

- assessment por competencias;
- work sample;
- entrevista estructurada;
- scorecard de entrevistador;
- portfolio revisado;
- referencias;
- experiencia previa verificable.

El score no decide automáticamente. La persona responsable registra la decisión, la evidencia, los gaps y cualquier override del resultado advisory.

## Calidad de contratación

Después de la incorporación, la calidad se observa en 30/60/90 días mediante:

- autonomía;
- dominio de la capability;
- calidad del trabajo;
- confiabilidad y ownership;
- experiencia del operador del cliente;
- necesidad de supervisión;
- continuidad y colaboración;
- desempeño operativo cuando exista señal canónica.

Los outcomes deben distinguir `validated_hire`, `needs_support`, `role_mismatch`, `selection_failure` e `insufficient_evidence`.

## Workforce y economics

Antes de abrir o comprometer una demanda, Efeonce debe revisar si puede sostener la promesa con el presupuesto disponible. El análisis considera:

- capability mínima;
- seniority;
- dedicación;
- loaded cost;
- management, QA y soporte;
- backup y reemplazo;
- herramientas e infraestructura;
- margen y sensibilidad;
- alternativa build/buy/borrow.

Si el presupuesto es insuficiente, se cambia el alcance, la composición, la modalidad o el precio. No se baja el estándar sin actualizar la promesa.

## Métricas principales

- porcentaje de contrataciones que alcanzan autonomía esperada;
- `selection_failure_rate`;
- tiempo hasta autonomía;
- calidad por rol y template;
- validez assessment↔outcome;
- permanencia de hires validados;
- continuidad de capacidad por cuenta;
- cobertura de backup;
- margen después de continuidad y reemplazos;
- satisfacción del operador del cliente.

## Límites

`Talent Assurance` no reemplaza:

- el juicio humano de Hiring;
- HRIS o payroll;
- evaluación legal o académica externa;
- el contrato comercial;
- el feedback directo del cliente;
- la responsabilidad del colaborador sobre su desempeño.
