import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] || null,
    },
  } as unknown as NextRequest
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/opencode/sessions/[id]/abort', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies abort request to correct session', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest()
    const response = await POST(req, createContext('session-123'))
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session/session-123/abort',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(data).toEqual({ success: true })
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest({
      'x-opencode-url': 'http://abort-server:7000',
    })
    await POST(req, createContext('abc'))

    expect(mockFetch).toHaveBeenCalledWith(
      'http://abort-server:7000/session/abc/abort',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const req = createMockRequest({
      'x-opencode-auth': 'Bearer abort-token',
    })
    await POST(req, createContext('session-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer abort-token',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Abort request failed'))

    const req = createMockRequest()
    const response = await POST(req, createContext('session-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Abort request failed' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce({ code: 'UNKNOWN' })

    const req = createMockRequest()
    const response = await POST(req, createContext('session-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to abort session' })
  })
})
