import { describe, expect, it } from 'vitest'

import { INSTREAM_CHUNK_BYTES, frameInstream, interpretClamdReply } from './clamd-protocol.mjs'

describe('frameInstream', () => {
  it('abre con el comando zINSTREAM terminado en NUL', () => {
    const frames = frameInstream(Buffer.from('abc'))

    expect(frames[0].toString('ascii')).toBe('zINSTREAM\0')
  })

  it('prefija cada chunk con su largo en uint32 big-endian', () => {
    const payload = Buffer.from('hello')
    const [, header, body] = frameInstream(payload)

    expect(header.readUInt32BE(0)).toBe(5)
    expect(body.toString()).toBe('hello')
  })

  // Sin el terminador de largo 0, clamd espera para siempre y el scan expira:
  // el veredicto sería `scanner_timeout` en cada upload.
  it('cierra con un bloque de largo cero', () => {
    const frames = frameInstream(Buffer.from('abc'))

    expect(frames.at(-1)?.readUInt32BE(0)).toBe(0)
  })

  it('parte payloads grandes en chunks bajo el límite de clamd', () => {
    const big = Buffer.alloc(INSTREAM_CHUNK_BYTES * 2 + 10, 0x41)
    const frames = frameInstream(big)

    // comando + 3×(header+body) + terminador
    expect(frames).toHaveLength(1 + 3 * 2 + 1)

    const bodies = frames.slice(1, -1).filter((_: Buffer, index: number) => index % 2 === 1)

    expect(bodies.map((chunk: Buffer) => chunk.length)).toEqual([INSTREAM_CHUNK_BYTES, INSTREAM_CHUNK_BYTES, 10])
    expect(Buffer.concat(bodies).equals(big)).toBe(true)
  })

  it('un payload vacío sigue produciendo un frame válido', () => {
    const frames = frameInstream(Buffer.alloc(0))

    expect(frames).toHaveLength(2)
    expect(frames.at(-1)?.readUInt32BE(0)).toBe(0)
  })
})

describe('interpretClamdReply', () => {
  it('lee OK como limpio', () => {
    expect(interpretClamdReply('stream: OK')).toEqual({ status: 'ok' })
  })

  it('extrae la firma de un FOUND', () => {
    expect(interpretClamdReply('stream: Eicar-Test-Signature FOUND')).toEqual({
      status: 'found',
      signature: 'Eicar-Test-Signature',
    })
  })

  it('tolera el NUL final del modo z-command', () => {
    expect(interpretClamdReply('stream: OK\0')).toEqual({ status: 'ok' })
  })

  describe('ante duda, nunca limpio', () => {
    it('un ERROR de clamd no se lee como ok', () => {
      const result = interpretClamdReply('INSTREAM size limit exceeded. ERROR')

      expect(result.status).toBe('error')
    })

    it('una respuesta vacía es error, no ok', () => {
      expect(interpretClamdReply('').status).toBe('error')
      expect(interpretClamdReply(null).status).toBe('error')
    })

    it('una respuesta desconocida es error, no ok', () => {
      expect(interpretClamdReply('stream: something weird').status).toBe('error')
    })

    // El orden del match importa: si OK se evaluara primero, una firma que
    // terminara en "OK" se leería como archivo limpio.
    it('una firma que contiene OK sigue siendo FOUND', () => {
      expect(interpretClamdReply('stream: Trojan.FAKEOK FOUND')).toEqual({
        status: 'found',
        signature: 'Trojan.FAKEOK',
      })
    })
  })
})
