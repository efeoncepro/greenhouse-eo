import { describe, expect, it } from 'vitest'

import { buildContentFactoryInspectionMapFromBridgeReports } from '../intelligence-map'
import type { PublicSiteBridgeInspectionReport } from '../../bridge-inspection'

const baseReport = {
  contractVersion: 'public-site-bridge-inspection.v1',
  generatedAt: '2026-06-14T18:00:00.000Z',
  baseUrl: 'https://efeoncepro.com',
  pageId: 1,
  mode: 'read_only',
  auth: {
    usernameConfigured: true,
    applicationPasswordSecretConfigured: true,
    secretResolved: true
  },
  endpoints: {
    health: {
      status: 200,
      ok: true,
      summary: {
        plugin: { name: 'greenhouse-wp-bridge', version: '0.3.1', mode: 'read_only_inspection' },
        site: { url: 'https://efeoncepro.com' },
        theme: { name: 'Ohio-Child' },
        capabilities: { elementor_loaded: true },
        security: { writesEnabled: false }
      }
    },
    elementorDocument: {
      status: 200,
      ok: true,
      summary: {
        post: null,
        elementor: { hasData: false },
        elementsSummary: {
          totalElements: 0,
          byElType: {},
          byWidgetType: {},
          topLevelElements: []
        },
        semanticAnchors: [],
        ohioMetaKeys: [],
        inspectionWarning: 'read_only_snapshot_no_mutation'
      }
    },
    blockDocument: {
      status: 200,
      ok: true,
      summary: {
        post: null,
        editor: {
          model: 'wordpress_blocks',
          hasBlocks: false,
          contentLength: 0,
          elementorEditMode: '',
          elementorDataPresent: false
        },
        blocksSummary: {
          totalBlocks: 0,
          topLevelBlockCount: 0,
          byBlockName: {},
          topLevelBlocks: []
        },
        semanticAnchors: [],
        inspectionWarning: 'read_only_snapshot_no_mutation'
      }
    },
    ohioWidgetCatalog: null
  },
  safetyPolicy: {
    writesWordPressContent: false,
    publishesContent: false,
    clearsCache: false,
    createsBackup: false,
    sendsSecretsToOutput: false
  }
} satisfies PublicSiteBridgeInspectionReport

const buildReport = (overrides: Partial<PublicSiteBridgeInspectionReport>): PublicSiteBridgeInspectionReport => ({
  ...baseReport,
  ...overrides,
  endpoints: {
    ...baseReport.endpoints,
    ...overrides.endpoints
  }
})

describe('content factory intelligence map', () => {
  it('normalizes Gutenberg posts into block modules', () => {
    const report = buildReport({
      pageId: 249766,
      endpoints: {
        ...baseReport.endpoints,
        elementorDocument: {
          ...baseReport.endpoints.elementorDocument,
          summary: {
            ...baseReport.endpoints.elementorDocument.summary,
            post: {
              id: 249766,
              type: 'post',
              status: 'publish',
              slug: 'glitch-02',
              title: 'GLITCH #02',
              modified: '2026-03-03T17:05:52'
            }
          }
        },
        blockDocument: {
          ...baseReport.endpoints.blockDocument,
          summary: {
            ...baseReport.endpoints.blockDocument.summary,
            post: {
              id: 249766,
              type: 'post',
              status: 'publish',
              slug: 'glitch-02',
              title: 'GLITCH #02',
              modified: '2026-03-03T17:05:52'
            },
            editor: {
              model: 'wordpress_blocks',
              hasBlocks: true,
              contentLength: 100,
              elementorEditMode: '',
              elementorDataPresent: false
            },
            blocksSummary: {
              totalBlocks: 3,
              topLevelBlockCount: 3,
              byBlockName: {
                'core/freeform': 1,
                'core/heading': 2
              },
              topLevelBlocks: [
                { path: '0', blockName: 'core/heading', attrs: ['level'], anchor: null, classes: [], childCount: 0 },
                { path: '1', blockName: 'core/freeform', attrs: [], anchor: null, classes: [], childCount: 0 }
              ]
            }
          }
        }
      }
    })

    const map = buildContentFactoryInspectionMapFromBridgeReports([report], {
      scannedAt: '2026-06-14T18:01:00.000Z'
    })

    expect(map.objects[0]).toMatchObject({
      wordpressPostId: 249766,
      postType: 'post',
      editorModel: 'gutenberg_blocks',
      status: 'publish'
    })
    expect(map.objects[0].modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nativeKind: 'blockName', key: 'core/freeform', count: 1, risk: 'medium' }),
        expect.objectContaining({ nativeKind: 'blockName', key: 'core/heading', count: 2, settingsKeys: ['level'] })
      ])
    )
  })

  it('normalizes Elementor pages into landing widget, theme meta and HubSpot modules', () => {
    const report = buildReport({
      pageId: 244079,
      endpoints: {
        ...baseReport.endpoints,
        elementorDocument: {
          ...baseReport.endpoints.elementorDocument,
          summary: {
            ...baseReport.endpoints.elementorDocument.summary,
            post: {
              id: 244079,
              type: 'page',
              status: 'publish',
              slug: 'servicios-contratar-hubspot',
              title: 'Empodera tu crecimiento con HubSpot + Efeonce',
              modified: '2026-06-14T11:50:10'
            },
            elementor: { hasData: true, editMode: 'builder' },
            elementsSummary: {
              totalElements: 4,
              byElType: { widget: 3 },
              byWidgetType: {
                'hubspot-form': 1,
                ohio_heading: 2
              },
              topLevelElements: [
                {
                  id: 'abc',
                  path: '0',
                  elType: 'section',
                  widgetType: null,
                  cssClasses: ['gh-section-hubspot-partner-proof'],
                  childCount: 1
                }
              ]
            },
            semanticAnchors: [{ cssClass: 'gh-section-hubspot-partner-proof' }],
            ohioMetaKeys: ['page_add_wrapper']
          }
        }
      }
    })

    const map = buildContentFactoryInspectionMapFromBridgeReports([report], {
      scannedAt: '2026-06-14T18:02:00.000Z'
    })

    expect(map.objects[0]).toMatchObject({
      wordpressPostId: 244079,
      postType: 'landing',
      editorModel: 'elementor_document',
      status: 'publish'
    })
    expect(map.objects[0].modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nativeKind: 'widgetType', key: 'hubspot-form', count: 1 }),
        expect.objectContaining({ nativeKind: 'hubspot', key: 'hubspot-form', count: 1 }),
        expect.objectContaining({ nativeKind: 'widgetType', key: 'ohio_heading', count: 2 }),
        expect.objectContaining({ nativeKind: 'themeMeta', key: 'page_add_wrapper', count: 1 })
      ])
    )
  })
})
