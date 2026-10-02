import { describe, expect, it } from 'vitest'

import { rowToLoginAnnouncementDto, rowToLoginAnnouncementRecord, type LoginAnnouncementRow } from './mapping'

const row: LoginAnnouncementRow = {
  announcement_id: 'lgan-seed-globe-studio',
  kind: 'text',
  service_line: 'brand',
  tab_label: 'Brand',
  kicker: 'Nuevo · Globe Studio',
  title: 'Tu contenido, en locación',
  body: 'Producción con tu squad.',
  cta_label: 'Conocer Globe Studio',
  cta_url: 'https://efeoncepro.com',
  image_path: '/images/login/announcement-brand.webp',
  image_alt: 'Equipo de producción',
  lens_x: '60.00',
  lens_y: '34.00',
  lens_radius_ratio: '0.270',
  priority: 10,
  status: 'published',
  starts_at: new Date('2026-10-02T20:00:00Z'),
  ends_at: null,
  created_by: 'migration:task-1963',
  updated_by: 'migration:task-1963',
  created_at: '2026-10-02T20:00:00Z',
  updated_at: '2026-10-02T20:00:00Z'
}

describe('TASK-1963 — mapping de novedades del login', () => {
  it('convierte NUMERIC de Postgres a números y arma la lente', () => {
    expect(rowToLoginAnnouncementDto(row).lens).toEqual({ x: 60, y: 34, radiusRatio: 0.27 })
  })

  it('omite la lente, el CTA y la imagen cuando faltan sus partes', () => {
    const dto = rowToLoginAnnouncementDto({
      ...row,
      lens_x: null,
      lens_y: null,
      lens_radius_ratio: null,
      cta_label: null,
      cta_url: null,
      image_path: null,
      image_alt: null
    })

    expect(dto.lens).toBeNull()
    expect(dto.cta).toBeNull()
    expect(dto.image).toBeNull()
  })

  it('el DTO público no expone estado, autores ni fechas', () => {
    const dto = rowToLoginAnnouncementDto(row) as Record<string, unknown>

    for (const field of ['status', 'createdBy', 'updatedBy', 'priority', 'startsAt']) expect(dto).not.toHaveProperty(field)
  })

  it('el registro admin serializa fechas en ISO', () => {
    const record = rowToLoginAnnouncementRecord(row)

    expect(record.startsAt).toBe('2026-10-02T20:00:00.000Z')
    expect(record.endsAt).toBeNull()
    expect(record.status).toBe('published')
  })
})
