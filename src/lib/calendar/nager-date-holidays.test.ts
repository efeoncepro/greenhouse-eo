import { describe, expect, it, vi } from 'vitest'

import { fetchNagerDatePublicHolidays, loadNagerDateHolidayDateSet } from './nager-date-holidays'

describe('nager-date-holidays', () => {
  it('fetches and normalizes public holidays for a country/year', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: '2026-09-18',
            localName: 'Independencia Nacional',
            name: 'National Independence Day',
            countryCode: 'cl',
            fixed: true,
            global: true,
            counties: null,
            launchYear: 1810,
            types: ['Public']
          }
        ]),
        {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        }
      )
    )

    const holidays = await fetchNagerDatePublicHolidays(2026, 'cl', {
      fetchImpl
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://date.nager.at/api/v3/PublicHolidays/2026/CL',
      expect.objectContaining({
        signal: undefined
      })
    )
    expect(holidays).toEqual([
      {
        date: '2026-09-18',
        localName: 'Independencia Nacional',
        name: 'National Independence Day',
        countryCode: 'CL',
        fixed: true,
        global: true,
        counties: null,
        launchYear: 1810,
        types: ['Public']
      }
    ])
  })

  it('loads a holiday date set from the API payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: '2026-09-18',
            localName: 'Independencia Nacional',
            name: 'National Independence Day',
            countryCode: 'CL',
            fixed: true,
            global: true,
            counties: null,
            launchYear: 1810,
            types: ['Public']
          },
          {
            date: '2026-09-19',
            localName: 'Glorias del Ejército',
            name: 'Army Day',
            countryCode: 'CL',
            fixed: true,
            global: true,
            counties: null,
            launchYear: 1915,
            types: ['Public']
          }
        ]),
        {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        }
      )
    )

    const holidayDates = await loadNagerDateHolidayDateSet(2026, 'CL', {
      fetchImpl
    })

    expect([...holidayDates].sort()).toEqual(['2026-09-18', '2026-09-19'])
  })
})

