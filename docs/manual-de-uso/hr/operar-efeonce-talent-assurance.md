# Operar Efeonce Talent Assurance

## Propósito

Usa este manual para operar la promesa `Verificado por Efeonce` desde la demanda de capacidad hasta la revisión post-hire.

La decisión arquitectónica está en [Talent Assurance Decision V1](../../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md). La explicación funcional está en [Efeonce Talent Assurance](../../documentation/hr/efeonce-talent-assurance.md).

## Antes de abrir una demanda

Confirma:

1. stakeholder y contexto: interno o cliente;
2. resultado que debe producir la capacidad;
3. rol, seniority y dedicación;
4. competencias críticas y nivel esperado;
5. modalidad `build`, `buy` o `borrow`;
6. disponibilidad de talento reclutable;
7. loaded cost, management, QA, backup y reemplazo;
8. fee, alcance, SLA y piso de margen;
9. owner de selección y owner de continuidad.

Si la economía no permite contratar y sostener el estándar, detén la publicación y escala a Commercial/Finance. No publiques una vacante con requisitos de perfil senior y presupuesto de perfil no reclutable.

## Durante la selección

1. Usa el scorecard del rol, no una descripción genérica.
2. Asigna el assessment correcto a la `hiring_application`.
3. Incluye un work sample relacionado con el trabajo real.
4. Usa entrevista estructurada con las mismas preguntas y rúbrica.
5. Registra evidencia observable, no impresiones de “fit”.
6. Revisa portfolio y referencias cuando el riesgo lo justifique.
7. Documenta gaps, accommodations y override del score advisory.
8. No selecciones sin la evidencia mínima configurada para el rol.

La IA puede proponer preguntas o puntuaciones, pero una persona debe revisar y confirmar. Nunca uses inferencia emocional, biométrica o personalidad automática.

## Al tomar la decisión

Registra:

- decisión;
- destino;
- evidencia;
- gaps aceptados;
- override del assessment, si existe;
- estándar contra el que se evaluó;
- plan de onboarding;
- fecha esperada de revisión 30/60/90.

Una selección no debe significar que todos los gaps desaparecieron. Debe quedar claro qué es capacidad probada y qué es desarrollo esperado.

## Durante onboarding

Confirma que la persona recibe:

- contexto de marca y negocio;
- stakeholders y límites;
- owner y backup;
- rituales y canales;
- criterios de calidad;
- primera entrega observable;
- documentación de memoria de la cuenta.

Si la persona no logra entender el contexto o requiere supervisión incompatible con el modelo, registra la señal tempranamente. No esperes al final del período para descubrir un mismatch.

## Revisiones 30/60/90

En cada checkpoint registra:

- autonomía;
- capacidad técnica o funcional;
- calidad y confiabilidad;
- feedback del operador del cliente;
- cumplimiento de tiempos;
- nivel de supervisión requerido;
- riesgos de continuidad;
- soporte o desarrollo necesario;
- outcome provisional.

Usa uno de estos outcomes:

- `validated_hire`;
- `needs_support`;
- `role_mismatch`;
- `selection_failure`;
- `insufficient_evidence`.

## Si la persona debe salir

Registra la causa principal y evidencia. En particular, diferencia:

- falta de conocimiento;
- falta de capacidad aplicada;
- seniority incorrecto;
- falta de autonomía;
- mismatch con el contexto del cliente;
- problema de confiabilidad;
- sobrecarga o mala gestión;
- cambio de demanda;
- error de selección.

Activa continuidad: backup, memoria, comunicación al cliente, transición y nueva selección si corresponde.

## Si el presupuesto es insuficiente

No intentes resolverlo presionando a Recruiting. Elige una alternativa explícita:

- ajustar precio;
- reducir alcance;
- reducir dedicación;
- cambiar composición del pod;
- usar capacidad compartida;
- formar talento interno;
- usar capacidad borrow verificada;
- rechazar la oportunidad.

La promesa de calidad no puede mantenerse intacta si la economía no financia su delivery.

## Verificación y escalamiento

Escala a Talent + Operations cuando:

- el template no representa el rol;
- falta evidencia crítica;
- hay señales contradictorias entre assessment y entrevista;
- la persona es seleccionada sin assessment requerido;
- el operador reporta falta de capacidad;
- la continuidad depende de una sola persona.

Escala a Finance + Commercial cuando:

- el fee no cubre loaded cost y continuidad;
- el cliente exige seniority no financiado;
- el descuento compromete el piso de margen;
- el modelo requiere backup o bench no presupuestado.

