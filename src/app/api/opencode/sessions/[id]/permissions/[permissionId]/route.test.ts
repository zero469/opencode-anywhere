import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockRequest(
  headers: Record<string, string> = {},
  body?: unknown
): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] || null,
    },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

function createContext(id: string, permissionId: string) {
  return { params: Promise.resolve({ id, permissionId }) }
}

describe('POST /api/opencode/sessions/[id]/permissions/[permissionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies allow permission response', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest({}, { response: 'allow' })
    const response = await POST(req, createContext('session-1', 'perm-123'))
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session/session-1/permissions/perm-123',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'allow' }),
      })
    )
    expect(data).toEqual({ success: true })
  })

  it('proxies deny permission response', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest({}, { response: 'deny' })
    await POST(req, createContext('session-1', 'perm-456'))

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session/session-1/permissions/perm-456',
      expect.objectContaining({
        body: JSON.stringify({ response: 'deny' }),
      })
    )
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest(
      { 'x-opencode-url': 'http://perm-server:4000' },
      { response: 'allow' }
    )
    await POST(req, createContext('sess-1', 'perm-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      'http://perm-server:4000/session/sess-1/permissions/perm-1',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest(
      { 'x-opencode-auth': 'Bearer perm-token' },
      { response: 'allow' }
    )
    await POST(req, createContext('session-1', 'perm-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer perm-token',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Permission response failed'))

    const req = createMockRequest({}, { response: 'allow' })
    const response = await POST(req, createContext('session-1', 'perm-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Permission response failed' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce(undefined)

    const req = createMockRequest({}, { response: 'allow' })
    const response = await POST(req, createContext('session-1', 'perm-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to respond to permission' })
  })
})
