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

describe('GET /api/opencode/provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies to /provider and returns data', async () => {
    const providers = {
      all: ['anthropic', 'openai'],
      connected: ['anthropic'],
      default: { providerID: 'anthropic', modelID: 'claude-3' },
    }
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(providers),
    })

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/provider',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(data).toEqual(providers)
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    })

    const req = createMockRequest({
      'x-opencode-url': 'http://remote:9000',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://remote:9000/provider',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    })

    const req = createMockRequest({
      'x-opencode-auth': 'Bearer token123',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Provider fetch failed'))

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Provider fetch failed' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce(null)

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch providers' })
  })
})
