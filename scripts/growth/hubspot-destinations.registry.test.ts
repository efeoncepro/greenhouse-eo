import { describe, expect, it } from 'vitest'

import { HUBSPOT_DESTINATION_SPECS } from './hubspot-destinations.registry'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('hubspot-destinations registry', () => {
  it('resuelve cada formulario por un form_key único', () => {
    const keys = HUBSPOT_DESTINATION_SPECS.map(spec => spec.formKey)

    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(key).toMatch(UUID)
  })

  it('no reusa un formulario HubSpot entre Growth Forms', () => {
    // Compartir destino fue la causa del mapeo huérfano: cuatro formularios apuntaban al
    // formulario de lead-gen, cuyo mapeo no calzaba con sus campos.
    const names = HUBSPOT_DESTINATION_SPECS.map(spec => spec.hubspotForm.name)
    const ids = HUBSPOT_DESTINATION_SPECS.map(spec => spec.hubspotForm.id).filter(Boolean)

    expect(new Set(names).size).toBe(names.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(HUBSPOT_DESTINATION_SPECS)('$slug mapea correo y nombre, sin claves repetidas', spec => {
    const ghKeys = spec.fields.map(field => field.ghKey)

    expect(new Set(ghKeys).size).toBe(ghKeys.length)
    expect(spec.fields.find(field => field.ghKey === 'email')?.property).toBe('email')
    expect(spec.fields.find(field => field.ghKey === 'firstName')?.property).toBe('firstname')
    expect(spec.fields.find(field => field.ghKey === 'lastName')?.property).toBe('lastname')
  })

  it('sólo crea properties bajo el prefijo gh_form_', () => {
    const created = HUBSPOT_DESTINATION_SPECS.flatMap(spec => spec.fields).filter(field => field.kind !== 'existing')

    for (const field of created) {
      expect(field.property).toMatch(/^gh_form_[a-z0-9_]+$/)
      expect(field.description).toBeTruthy()
    }
  })

  it('no asigna la misma property creada a campos de formularios distintos', () => {
    const owners = new Map<string, string>()

    for (const spec of HUBSPOT_DESTINATION_SPECS) {
      for (const field of spec.fields.filter(candidate => candidate.kind !== 'existing')) {
        expect(owners.get(field.property) ?? spec.slug).toBe(spec.slug)
        owners.set(field.property, spec.slug)
      }
    }
  })
})
