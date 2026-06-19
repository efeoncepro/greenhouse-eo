export type DesignHandoffKind = 'page' | 'component'

export type DesignHandoffStatus = 'proposed' | 'in_implementation' | 'implemented' | 'archived'

export interface DesignHandoffAllowedFile {
  fileKey: string
  fileLabel: string
  addedBy: string
  addedAt: string
  supersededAt: string | null
}

export interface DesignHandoffEntry {
  entryId: string
  title: string
  kind: DesignHandoffKind
  fileKey: string
  fileLabel: string | null
  nodeId: string
  nodeName: string | null
  status: DesignHandoffStatus
  implementedSurfaceKey: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface CreateDesignHandoffEntryInput {
  title?: string
  kind?: DesignHandoffKind
  url: string
  nodeName?: string | null
  actorUserId: string
}

export interface TransitionDesignHandoffEntryInput {
  entryId: string
  toStatus: DesignHandoffStatus
  implementedSurfaceKey?: string | null
  actorUserId: string
}

export interface DesignHandoffTransitionResult {
  entry: DesignHandoffEntry
  fromStatus: DesignHandoffStatus
  eventType: 'transitioned' | 'archived'
}
