# Operar la flota de modelos del Producer

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-25 por Claude (TASK-1554)
> **Ultima actualizacion:** 2026-07-25 por Claude
> **Documentacion funcional:** [Flota de modelos del Producer](../../documentation/creative-studio/efeonce-globe-producer-flota-modelos.md)

## Para qué sirve

Para responder, con evidencia y no de memoria, tres preguntas que aparecen seguido:

- ¿Por qué este modelo no aparece / aparece como "Próximamente"?
- ¿Cómo hago que un modelo nuevo llegue al Producer?
- ¿Por qué Nexa dice una cosa y la pantalla otra? *(spoiler: no puede pasar — si pasa, es un bug real)*

## Antes de empezar

- El reader es **read-only**. Nada de lo que hagas acá cambia disponibilidad: la disponibilidad la
  produce la **promoción** (ADR-009), que es otro proceso.
- Necesitás la capability `globe.producer.catalog.read`.
- El estado por modelo se lleva en
  [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md).
  **Leelo primero**: es la causa más común de concluir mal, porque un modelo puede estar integrado y
  verificado en el Model Lab y aun así no estar promovido a producción.

## Diagnóstico: "este modelo no aparece como disponible"

Recorré en este orden. Cada paso descarta una causa distinta, y saltearse el primero es de dónde
salen la mayoría de los diagnósticos equivocados.

**1. ¿Existe la ruta en el catálogo?**
Si el modelo no tiene ruta declarada, ningún consumer puede nombrarlo. Ya pasó: cinco capacidades
tenían modelos integrados y verificados desde julio **sin ninguna ruta**, así que eran invisibles en
todas las superficies. El problema estaba upstream de la interfaz.

**2. ¿Está promovido para *este* workspace?**
La disponibilidad es **por workspace**. Promovido en A no es promovido en B. Un modelo funcionando
perfecto en un espacio puede estar en "Próximamente" en otro, y eso es correcto.

**3. ¿Está el binding habilitado?**
Promovido pero no habilitado ⇒ no entra a la flota.

**4. ¿Aparece como "Bloqueado"?**
Entonces hay una dependencia externa y **la razón viene escrita en el propio dato**. Leela antes de
investigar: suele nombrar exactamente qué falta.

## Diagnóstico: "aparece pero no lo puedo ejecutar"

Distinguí dos situaciones que se parecen y no son lo mismo:

- **"Necesita cuadros" / "Necesita una imagen para editar"** → el modelo **está disponible**; le falta
  un insumo. Elegirlo te lleva al modo donde se lo podés dar.
- **"Próximamente" / "Bloqueado"** → no es ejecutable, y no hay nada que puedas hacer desde la
  pantalla.

La distinción no es cosmética: un modelo ofrecido como ejecutable donde no puede correr
**reservaría crédito y fallaría después**. Si ves eso, es un bug y hay que reportarlo.

## Agregar un modelo a la flota

1. Declarar la ruta en el catálogo del Producer (`PRODUCER_ROUTE_CATALOG`), **contra lo que el
   adapter realmente transporta**, no contra lo que uno supone que soporta.
2. Promoverlo para el workspace (ADR-009).
3. Verificar que aparece.

No hay paso 4. **No se edita ninguna pantalla.** Si alguien te pide "cablear el modelo en la UI",
algo se desvió del diseño.

## Verificar

```bash
# Contrato + proyección + tests (desde efeonce-globe)
pnpm check

# Los invariantes de la flota
node --experimental-strip-types --test packages/domain/src/producer-fleet.test.ts
```

Los tests cubren: derivación de disponibilidad (promovido→disponible, no promovido→excluido), alcance
por workspace, recomendado honesto, y que **el identificador del proveedor nunca sale en el payload**.

## Qué NO hacer

- **NUNCA** cablear una lista de modelos en una pantalla, ni en el Producer, ni en Nexa, ni en una
  integración. Ese es exactamente el trabajo que este contrato elimina, y reintroducirlo hace que
  agregar un modelo vuelva a costar una edición por superficie.
- **NUNCA** reconstruir la disponibilidad por tu cuenta desde readiness o binding. Hay **un** reader;
  un segundo cálculo diverge del primero y nadie se entera hasta que un usuario ve dos respuestas
  distintas.
- **NUNCA** exponer el identificador interno del proveedor, el costo ni el margen. El nombre público
  del modelo sí va.
- **NUNCA** preseleccionar un modelo recomendado que no esté disponible. Una recomendación que no se
  puede ejecutar es peor que ninguna.
- **NUNCA** ocultar un modelo no disponible. Mostralo con su estado: invisible y bloqueado se sienten
  igual de mal, pero invisible además impide preguntar.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El modelo no aparece en ninguna modalidad | No tiene ruta en el catálogo | Declarar la ruta (paso 1 de "Agregar") |
| Aparece en un workspace y no en otro | Comportamiento correcto: promoción por workspace | Promover donde haga falta |
| Dice "Próximamente" y sabés que funciona | Verificado en el Model Lab, **no promovido** a producción | Revisar el ledger; promover si corresponde |
| Nexa y la pantalla muestran distinto | **Un consumer se armó su propia lista** | Bug: buscar el cálculo paralelo y borrarlo |
| Falla después de reservar crédito | Se ofreció ejecutable donde no puede correr | Bug: reportar con la ruta y el modo |

## Referencias técnicas

- Contrato: `efeonce-globe/packages/contracts/src/producer-fleet.ts`
- Proyección y tests: `packages/domain/src/producer-fleet.{ts,test.ts}`
- Ledger de estado: [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md)
- Consumer UI: `TASK-1555` (selector compacto del Producer)
