> **Tipo de documento:** Manual de uso (paso a paso para el operador)
> **Version:** 1.0
> **Creado:** 2026-08-15 por Claude (TASK-1714/1715)
> **Ultima actualizacion:** 2026-08-15 por Claude (TASK-1714/1715)
> **Documentacion funcional:** [documentos-de-candidatos.md](../../documentation/hr/documentos-de-candidatos.md)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

# Ver los documentos de un candidato

## Para que sirve

Para leer el CV de una persona que postulo, revisar su portafolio, y —cuando el proceso lo exige—
ver el numero completo de su documento de identidad dejando constancia de por que lo hiciste.

## Antes de empezar

- Necesitas acceso a Hiring (permiso `hiring.application.read`). Si puedes abrir la ficha del
  candidato, ya lo tienes.
- Para ver el numero completo del documento de identidad necesitas ademas
  `hiring.candidate.reveal_identity`. Hoy lo tienen **Admin**, **HR Manager** y **Operaciones**. Si no
  lo tienes, el boton de revelar simplemente no aparece.

## Paso a paso — leer el CV

1. Entra a **Agencia → Hiring → Pipeline** y abre la ficha del candidato.
2. Ve a la pestana **Documentos**.
3. En el grupo **Archivos y enlaces**, busca la fila **Curriculum (CV)**.
4. Pulsa **Ver**. El CV se abre en una ventana sobre la ficha, sin sacarte del portal.
5. Cuando termines, pulsa **Cerrar** o la tecla `Esc`.

Dentro de esa ventana tambien tienes **Descargar** y **Abrir en pestana nueva**, por si prefieres
guardarlo o verlo a pantalla completa.

> Si el candidato postulo varias veces, veras **mas de un CV**, del mas reciente al mas antiguo. No se
> ocultan a proposito: sirven para ver como evoluciono su perfil.

## Paso a paso — revelar el documento de identidad

1. En la misma pestana, baja al grupo **Identidad**.
2. Pulsa **Revelar (requiere motivo)**.
3. Escribe el motivo real. Minimo 5 caracteres, y va a quedar guardado con tu nombre.
   Ejemplo util: `preparacion de contrato para la contratacion aprobada`.
4. Pulsa **Revelar y registrar**.
5. El numero aparece en la fila. Usa **Copiar** para llevarlo a donde lo necesitas, y **Ocultar**
   cuando termines.

## Que significa cada senal

| Lo que ves | Que significa |
|---|---|
| Fila con nombre, peso y fecha | El archivo esta disponible: puedes verlo y descargarlo |
| Chip naranja **Sin escanear** | Se subio antes de que existiera el escaneo automatico. Se puede abrir igual |
| Chip azul **Procesando** | El escaner todavia lo esta revisando. Vuelve en unos minutos |
| Chip rojo **Cuarentena** | El escaner de seguridad bloqueo el archivo. **No es culpa del candidato** |
| "El candidato no adjunto CV" | Simplemente no hay archivo |
| Aviso rojo "No pudimos cargar los documentos" | Fallo el sistema, no es que el candidato no tenga documentos. Pulsa **Reintentar** |
| Grupo **Identidad** con un texto explicativo | Normal: el documento de identidad recien se pide despues de una decision favorable |
| No ves el boton **Revelar** | No tienes ese permiso. Pideselo a Admin o a People Ops |

## Que no hacer

- **No le pidas el CV al candidato por correo** porque "no lo encuentras en el portal". Si la fila dice
  cuarentena o procesando, el mensaje te dice exactamente que pasa.
- **No trates un aviso de "no pudimos cargar" como "no tiene documentos".** Son cosas distintas y la
  pantalla las distingue a proposito.
- **No escribas un motivo generico** al revelar identidad (`revision`, `ok`, `necesito el dato`). Ese
  texto queda en un historial permanente y es lo que alguien va a leer si se audita el acceso.
- **No dejes la ventana del documento abierta** en un equipo compartido.

## Problemas comunes

**"Pulso Ver y aparece un aviso de que mi navegador no muestra PDF."**
Pasa tipicamente en el celular: esos navegadores no saben dibujar un PDF dentro de una pagina. Usa
**Abrir en pestana nueva** o **Descargar** desde la misma ventana.

**"El CV no carga y sale un error."**
La ventana te ofrece **Abrir en pestana nueva**; pruebalo. Si tampoco abre, el archivo puede haberse
borrado del almacenamiento — avisa al equipo de plataforma con el ID de la postulacion.

**"Revele el documento y al recargar volvio a estar oculto."**
Es el comportamiento correcto. El numero nunca se guarda en tu navegador; cada vez que lo necesitas se
pide de nuevo, y ese acceso queda registrado.

**"Me dice que no tengo permiso justo despues de que me lo dieron."**
Los permisos se resuelven al cargar la pagina. Recarga la ficha.

## Referencias tecnicas

- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` §Delta 2026-08-15
- Tasks: `docs/tasks/complete/TASK-1714-*` (reveal auditado) y `TASK-1715-*` (panel y visor)
- Codigo: `src/lib/hiring/documents/` (dominio) · `src/views/greenhouse/hiring/CandidateDocumentsPanel.tsx` (UI)
