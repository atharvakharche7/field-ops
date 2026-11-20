import { describe, expect, it } from 'vitest'
import { allowedNextStatuses, effectiveStatus } from './status'

// These must match the backend's Status.canMoveTo, or the page would offer moves the server rejects.
describe('allowedNextStatuses', () => {
  it('lets an assigned ticket start or be resolved straight away', () => {
    expect(allowedNextStatuses('ASSIGNED')).toEqual(['IN_PROGRESS', 'RESOLVED'])
  })

  it('lets an in-progress ticket only be resolved', () => {
    expect(allowedNextStatuses('IN_PROGRESS')).toEqual(['RESOLVED'])
  })

  it('offers nothing for open (unassigned) or resolved tickets', () => {
    expect(allowedNextStatuses('OPEN')).toEqual([])
    expect(allowedNextStatuses('RESOLVED')).toEqual([])
  })

  it('never offers going backwards or staying the same', () => {
    expect(allowedNextStatuses('IN_PROGRESS')).not.toContain('ASSIGNED')
    expect(allowedNextStatuses('IN_PROGRESS')).not.toContain('IN_PROGRESS')
  })
})

describe('effectiveStatus', () => {
  it('is the server status when nothing is waiting', () => {
    expect(effectiveStatus('ASSIGNED', [])).toBe('ASSIGNED')
  })

  it('is the last waiting update when some are queued', () => {
    expect(effectiveStatus('ASSIGNED', [{ toStatus: 'IN_PROGRESS' }, { toStatus: 'RESOLVED' }])).toBe('RESOLVED')
  })
})
