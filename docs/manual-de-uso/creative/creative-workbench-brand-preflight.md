# Preflight de marca en Creative Workbench

Estado: foundation local opt-in, TASK-1945. No distribuida al equipo ni conectada a generación IA.

`pnpm marca:preflight projects/<cliente>/<pieza> <request.json>` valida sin producir.
`--run` crea una corrida nueva con lock y copias selladas de sus entradas. El request vive dentro
de la pieza; no admite paths de recursos aportados por el agente. Ejemplo de estructura:

```json
{"brandId":"sky-airline","version":"0.1.0","operation":"compose","resources":["logo"],"producer":"persona"}
```

La versión del ejemplo no está publicada. Los tres packs reales siguen gated; el comando debe
rechazarlos. La persona del request sirve para atribución, no autentica ni concede acceso.

El catálogo gestionado `clients/brands.json` vincula cliente con pack, versión y digest; sólo un
pack admitido permite IDs sellados con marca, versión y procedencia. Ningún fallback está permitido.
La carpeta `runs/<uuid>/inputs/` conserva bytes verificados; `brand.lock.json` registra procedencia,
versión, hashes y contexto. Cambios de pieza/catálogo/pack después del preflight invalidan la corrida.
Los permisos de sólo lectura de los inputs previenen escrituras accidentales; no son una frontera
de seguridad frente al dueño de la máquina. El owner del catálogo es el plano de control Greenhouse.

Para declarar el flujo operativo faltan wrappers que consuman este preflight antes de generar,
verificación de identidad/permisos reales y consumo del lock por los compositores. Las APIs crudas
con credenciales directas pueden eludir este módulo. El QA visual sigue obligatorio para cada pieza.
No usar CLI Efeonce como sustituto cuando un pack SKY o Berel esté gated.

Verificación del código canónico:
`node --test scripts/creative-workbench/brand-context.test.mjs`.
