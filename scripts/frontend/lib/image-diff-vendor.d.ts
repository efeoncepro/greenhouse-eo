/**
 * Ambient type declarations for the offline image-diff vendor deps used by GVC
 * (`pixelmatch` + `pngjs`). Both packages ship without bundled `.d.ts` and we
 * deliberately avoid pulling `@types/*` for two tiny, stable libraries — these
 * minimal declarations cover exactly the surface GVC consumes.
 *
 * TASK-1018 Slice 0 — diff engine dependency wiring.
 */

declare module 'pixelmatch' {
  interface PixelmatchOptions {
    /** Matching threshold (0..1); smaller = more sensitive. Default 0.1. */
    threshold?: number
    /** Whether to skip anti-aliased pixels. Default false. */
    includeAA?: boolean
    /** Blending factor of unchanged pixels in the diff output. Default 0.1. */
    alpha?: number
    aaColor?: [number, number, number]
    diffColor?: [number, number, number]
    diffColorAlt?: [number, number, number]
    /** Draw the diff over a transparent background (a mask). Default false. */
    diffMask?: boolean
  }

  /**
   * Compares two RGBA pixel buffers of identical dimensions and returns the
   * number of mismatched pixels. Writes the visual diff into `output` when
   * provided.
   */
  function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray | Buffer,
    img2: Uint8Array | Uint8ClampedArray | Buffer,
    output: Uint8Array | Uint8ClampedArray | Buffer | null,
    width: number,
    height: number,
    options?: PixelmatchOptions
  ): number

  export default pixelmatch
}

declare module 'pngjs' {
  interface PNGOptions {
    width?: number
    height?: number
    fill?: boolean
  }

  export class PNG {
    constructor(options?: PNGOptions)
    width: number
    height: number
    /** RGBA pixel buffer, length = width * height * 4. */
    data: Buffer
    static sync: {
      read(buffer: Buffer): PNG
      write(png: PNG): Buffer
    }
  }
}
