# Escaneo de archivos subidos

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-11 por Claude (TASK-1378)
> **Ultima actualizacion:** 2026-08-11 por Claude (TASK-1378)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (§Candidate document capture + Delta 2026-08-11)
> **Manual de uso:** [Operar el scanner de malware de assets](../../manual-de-uso/plataforma/operar-scanner-malware-assets.md)

## Qué problema resuelve

Greenhouse recibe archivos de gente de afuera: el CV de alguien que postula a una vacante, un adjunto de un
formulario público, el pliego de una licitación que manda una contraparte. Un archivo así puede ser cualquier cosa,
y el navegador no es fuente confiable sobre qué es: un ejecutable renombrado a `.pdf` se anuncia como PDF.

El escaneo es la puerta entre "alguien subió un archivo" y "ese archivo queda adjunto a algo nuestro".

## No es una función de reclutamiento

Es un servicio de plataforma. El escáner recibe bytes y devuelve un veredicto; no sabe si esos bytes son un CV, un
pliego o una foto. Hoy protege:

| Qué se sube | Desde dónde |
|---|---|
| CV y portafolio de candidatos | Apply público de Careers |
| Adjuntos de formularios | Growth Forms |
| Pliegos de licitación (RFP) | Carga manual a una Proposal |
| Entregables de propuesta | Carga manual a una Proposal |

Sumar un tipo de archivo nuevo a esa lista no requiere tocar el escáner: hereda la protección por construcción.

## Los dos escáneres

Corren juntos y detectan cosas distintas. **El peor veredicto gana**: si uno dice "limpio" y el otro objeta, el
archivo se bloquea.

**Escáner estructural.** Mira los primeros bytes del archivo, que son los que declaran de verdad qué tipo es, y los
compara con lo que el archivo dice ser. Detecta el ataque práctico: un programa, un ZIP o una página HTML
renombrados a `.pdf`. Corre siempre, no depende de nada externo, y no se puede apagar.

**Escáner de firmas (ClamAV).** Compara el contenido contra una base de más de tres millones y medio de firmas de
malware conocido, que se actualiza sola varias veces al día. Detecta lo que el estructural no puede: un archivo que
sí es un PDF válido pero que trae algo malicioso adentro. Este es el que se prende y se apaga.

Son complementarios, no alternativos: uno detecta suplantación de tipo, el otro contenido conocido como malicioso.

## Qué pasa cuando un archivo no pasa

El archivo queda **en cuarentena**: se guarda, pero no se puede adjuntar ni descargar. Los bytes no se borran, así
que si fue un falso positivo se resuelve y no se perdió nada.

Del lado de quien subió el archivo **no pasa nada visible**. Si una persona postula a una vacante y su CV queda en
cuarentena, la postulación se acepta igual y recibe el mismo mensaje que todos. Es deliberado: avisarle a un
atacante que su archivo fue rechazado le dice exactamente qué probar después.

Quien sí se entera es el equipo: aparece una alerta en el panel de operaciones para que alguien lo revise.

## La regla que puede sorprender

Si el escáner **no puede pronunciarse** —está caído, mal configurado, sin permisos— el archivo **también se
bloquea**. No se asume que está limpio.

Es una decisión consciente y tiene un costo: si el servicio se cae, nadie puede subir un CV hasta que vuelva. La
alternativa sería dejar pasar archivos sin revisar justo cuando la revisión no funciona, que es peor. Apagar el
escáner de firmas es un cambio de una variable y tarda menos de diez minutos, y el escáner estructural sigue
protegiendo mientras tanto.

## Estado actual

| Entorno | Escáner estructural | Escáner de firmas |
|---|---|---|
| Producción | Activo | **Desplegado y verificado, todavía no encendido** |
| Staging | Activo | Activo |

El de firmas está pendiente de una última verificación: que una postulación real de punta a punta en staging deje
registro de haber pasado por ambos escáneres.

> Detalle técnico: puerto y adaptadores en `src/lib/storage/asset-scan/`; servicio en `services/clamav/`; estado del
> encendido en [FEATURE_FLAG_STATE_LEDGER.md](../../operations/FEATURE_FLAG_STATE_LEDGER.md).
