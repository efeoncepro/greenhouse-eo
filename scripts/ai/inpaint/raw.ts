import sharp from 'sharp'

/**
 * Lectura de píxeles crudos con el número de canales VERIFICADO.
 *
 * Por qué existe: en `sharp`, `blur()`, `linear()` y `resize()` sobre un buffer raw de 1 canal devuelven 3 canales
 * (reproducido 2026-10-02). Si quien lee asume 1 canal, el índice se corre y una máscara sale 100 % transparente sin
 * ningún error; el modelo repinta la escena entera y se paga (manual «editar una zona», §Verifica los píxeles). Toda
 * lectura raw del pipeline pasa por aquí y falla fuerte ante un conteo inesperado.
 */
export class RawChannelError extends Error {}

export interface RawImage {
  readonly width: number
  readonly height: number
  readonly channels: 1 | 3 | 4
  readonly data: Uint8Array
}

export const readRaw = async (pipeline: sharp.Sharp, expectedChannels: 1 | 3 | 4, label: string): Promise<RawImage> => {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })

  if (info.channels !== expectedChannels) {
    throw new RawChannelError(
      `${label}: se esperaban ${expectedChannels} canal(es) y llegaron ${info.channels}. ` +
        (expectedChannels === 1 ? 'Cierra la operación con .toColourspace(\'b-w\') antes de .raw().' : 'Normaliza con ensureAlpha()/removeAlpha().')
    )
  }

  return { width: info.width, height: info.height, channels: expectedChannels, data: new Uint8Array(data.buffer, data.byteOffset, data.length) }
}

/** Operación de sharp sobre un plano de 1 canal que vuelve a 1 canal (blur, resize). */
export const singleChannel = (data: Uint8Array, width: number, height: number): sharp.Sharp =>
  sharp(Buffer.from(data.buffer, data.byteOffset, data.length), { raw: { width, height, channels: 1 } })

/** Imagen RGBA 8 bits; `hadAlpha` recuerda si el archivo original traía canal alfa, para guardarlo igual. */
export interface RgbaImage extends RawImage {
  readonly channels: 4
  readonly hadAlpha: boolean
}

/**
 * Decodifica a RGBA en sRGB. La misma función lee la base y el resultado final, así que cualquier conversión de
 * color queda del mismo lado de la comparación y la verificación mide el archivo real, no un buffer intermedio.
 */
export const loadRgba = async (input: string | Buffer | Uint8Array, label = 'imagen'): Promise<RgbaImage> => {
  const source = typeof input === 'string' ? input : Buffer.from(input)
  const meta = await sharp(source).metadata()
  const raw = await readRaw(sharp(source).toColourspace('srgb').ensureAlpha(), 4, label)

  return { ...raw, channels: 4, hadAlpha: Boolean(meta.hasAlpha) }
}

/** PNG sin pérdida. Conserva alfa sólo si la base lo traía, para no cambiar el formato de la pieza. */
export const encodeRgbaPng = async (image: RgbaImage): Promise<Buffer> => {
  const pipeline = sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), {
    raw: { width: image.width, height: image.height, channels: 4 }
  })

  return (image.hadAlpha ? pipeline : pipeline.removeAlpha()).png({ compressionLevel: 9 }).toBuffer()
}

export const cloneRgba = (image: RgbaImage): RgbaImage => ({ ...image, data: new Uint8Array(image.data) })
