# Catálogo de servicios Efeonce

> **Propietario:** Efeonce Group SpA — RUT 77.357.182-1
> **Sitio:** <https://efeoncepro.com>
> **Estado:** categoría documental activa
> **Última actualización:** 2026-07-17

## Propósito

`docs/services/` define las capacidades que Efeonce entrega y opera como servicio para clientes. Una ficha de
servicio explica el resultado contratado, alcance, entregables, forma de trabajo, responsabilidades, evidencia,
límites y continuidad gestionada. La implementación de un cliente puede servir como referencia comprobada, pero
no convierte sus datos en datos de Greenhouse.

Esta categoría complementa las tres capas documentales obligatorias:

| Capa | Pregunta que responde |
|---|---|
| `docs/services/` | ¿Qué servicio ofrece y asume Efeonce, con qué resultado, alcance y gobierno? |
| `docs/architecture/` | ¿Cuál es el contrato técnico y qué no se debe romper? |
| `docs/documentation/` | ¿Cómo funciona la capacidad desde producto y operación? |
| `docs/manual-de-uso/` | ¿Cómo se ejecuta, verifica, diagnostica y escala? |

## Fronteras

- No es un tarifario. Precios, descuentos y condiciones comerciales pertenecen a propuestas y contratos.
- No es un catálogo de componentes de software ni reemplaza `service_modules` o `/agency/services`.
- No es el objeto nativo `Service` de HubSpot. Ese objeto representa una instancia contratada/entregada dentro
  del CRM del cliente.
- No duplica arquitectura, manuales, auditorías ni informes. Cada ficha enlaza sus fuentes canónicas.
- Una referencia de cliente sólo puede reutilizarse externamente con la autorización correspondiente.

## Modelo de una ficha

Cada servicio debe declarar como mínimo:

1. promesa y resultado esperado;
2. problema y comprador/owner operativo;
3. alcance incluido, opcional y excluido;
4. entregables y evidencia de aceptación;
5. ciclo `intake -> inventory -> design -> propose -> approve -> execute -> verify -> document -> measure`;
6. responsabilidades Efeonce/cliente/plataforma;
7. dependencias, riesgos y estados degradados;
8. métricas con definición, período, baseline y denominador;
9. continuidad, soporte, cadence y procedimiento de cambio;
10. arquitectura, documentación funcional, manual y casos de referencia.

## Familias disponibles

- [HubSpot as a Service](hubspot-as-a-service/README.md)
