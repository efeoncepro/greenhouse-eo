# Creative Workbench — Taller del equipo creativo

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-09-29 por Claude
> **Ultima actualizacion:** 2026-09-30 por Claude
> **Documentacion tecnica:** [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)

## Qué es

`efeoncepro/creative-workbench` es el repositorio donde trabaja el equipo creativo de Efeonce con Claude y
Codex: diseño, redacción, fotografía de marca y producción con IA para Efeonce, Berel y SKY.

No es una copia de Greenhouse. Recibe desde Greenhouse sólo lo que el equipo necesita, y siempre lo mismo que
Greenhouse tiene:

- **Skills de oficio:** copy, dirección de arte, social, publicidad, línea gráfica, tipografía, motion, audio,
  selección de modelos y la skill de Berel.
- **CLIs:** fotografía de marca (`foto:*`) y generación con IA (`ai:image`, `ai:fal`, `ai:omni`).
- **Documentos de marca:** línea gráfica «La órbita», canon fotográfico, social y publicidad.
- **Reglas de trabajo** para personas y agentes.

## Cómo se controla

| Qué | Quién decide | Dónde |
|---|---|---|
| Qué skills, CLIs y documentos recibe el equipo | Julio | Manifest de exportación en Greenhouse |
| Quién entra y a qué clientes | Julio | `control.json` en Greenhouse |
| Quién puede generar con IA | Julio | `control.json` (`ia: true`) |
| Qué produce el equipo | El equipo | Carpeta `projects/` del workbench |

Lo que llega desde Greenhouse queda **sellado**: si alguien lo edita en el workbench, la revisión automática
lo detecta y la siguiente sincronización lo restaura.

Desde el 2026-09-30 el workbench tiene además un **harness propio** (sus comandos de producción por marca,
su guardarraíl y su `package.json`). Esos archivos son **nativos**: los mantiene el workbench y la
sincronización no los toca. Qué archivos son nativos lo decide Greenhouse y queda escrito en el sello, así
que el workbench no puede declararse dueño de algo por su cuenta. Las revisiones automáticas (gates) siguen
siendo siempre de Greenhouse.

| Tipo de archivo | Quién lo mantiene |
|---|---|
| Skills, herramientas de IA y fotografía, documentos de marca, revisiones automáticas | Greenhouse (sellado) |
| Harness del workbench (comandos `marca:*`, guardarraíl, dependencias) | El workbench (nativo) |
| Piezas en `projects/` | El equipo |

## Qué puede y qué no puede el equipo

| Puede | No puede |
|---|---|
| Crear piezas, briefs y prompts en `projects/` | Editar skills, CLIs, reglas o documentos |
| Generar con IA a través de los CLIs, si tiene acceso | Ver las llaves de los proveedores |
| Bajar las referencias aprobadas de marca | Borrar o sobrescribir archivos en los buckets |
| Subir entregables de sus clientes | Ver o subir material de clientes que no tiene asignados |
| Proponer cambios por issue | Publicar hacia clientes o redes desde el repo |

## Cómo circula una pieza

1. Se crea la pieza y su brief.
2. Se produce con ayuda del agente; los archivos quedan fuera de git.
3. Los entregables se suben al bucket del cliente y quedan registrados con su huella.
4. Se revisa en un pull request; aprueba otra persona, con nombre y fecha.
5. La entrega o publicación ocurre fuera del repo. La versión final de campaña es de Marketing Studio.

## IA y costos

El equipo usa llaves **dedicadas al workbench**, distintas de las de Greenhouse y con tope de gasto en cada
proveedor. La llave nunca está en el equipo ni en el repo: el CLI la lee en el momento con la identidad Google
de la persona. Quitar el acceso a alguien es inmediato.

> Detalle técnico: [ADR del workbench](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md) ·
> [manual de operación](../../manual-de-uso/plataforma/operar-creative-workbench.md) ·
> código en `scripts/creative-workbench/`.
