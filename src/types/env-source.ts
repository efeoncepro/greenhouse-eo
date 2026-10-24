/**
 * Fuente de variables de entorno que una función recibe por inyección.
 *
 * Usar este tipo —no `NodeJS.ProcessEnv`— cuando la función sólo LEE algunas claves y acepta el
 * env como parámetro para poder probarla. Next.js aumenta `NodeJS.ProcessEnv` con
 * `readonly NODE_ENV` obligatorio, así que exigirlo obliga a cada test a fabricar un env completo
 * o a castear (`as NodeJS.ProcessEnv`), y el cast apaga justo el chequeo que importa.
 *
 * `process.env` es asignable a `EnvSource`, por lo que el default `= process.env` sigue funcionando.
 */
export type EnvSource = Readonly<Record<string, string | undefined>>
