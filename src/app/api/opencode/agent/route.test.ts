import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
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

describe('GET /api/opencode/agent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies to /agent and returns data', async () => {
    const agents = [
      { name: 'build', mode: 'primary' },
      { name: 'oracle', mode: 'secondary' },
    ]
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(agents),
    })

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/agent',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(data).toEqual(agents)
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    })

    const req = createMockRequest({
      'x-opencode-url': 'http://agent-server:5000',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://agent-server:5000/agent',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    })

    const req = createMockRequest({
      'x-opencode-auth': 'Basic abc123',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic abc123',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Agent service unavailable'))

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Agent service unavailable' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce(undefined)

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch agents' })
  })
})
