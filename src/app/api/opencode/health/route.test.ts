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

describe('GET /api/opencode/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies to /global/health on default URL', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ healthy: true, version: '1.0.0' }),
    })

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/global/health',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(data).toEqual({ healthy: true, version: '1.0.0' })
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ healthy: true }),
    })

    const req = createMockRequest({
      'x-opencode-url': 'http://custom:8080',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom:8080/global/health',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ healthy: true }),
    })

    const req = createMockRequest({
      'x-opencode-auth': 'Basic dXNlcjpwYXNz',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic dXNlcjpwYXNz',
        },
      })
    )
  })

  it('returns 500 with error message on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Connection refused' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce('Unknown error')

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Connection failed' })
  })
})
