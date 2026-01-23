import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockRequest(
  headers: Record<string, string> = {},
  body?: unknown,
  searchParams: string = ''
): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] || null,
    },
    json: () => Promise.resolve(body),
    nextUrl: {
      searchParams: new URLSearchParams(searchParams),
    },
  } as unknown as NextRequest
}

describe('GET /api/opencode/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies to /session and returns sessions', async () => {
    const sessions = [
      { id: 'session-1', title: 'First session' },
      { id: 'session-2', title: 'Second session' },
    ]
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(sessions),
    })

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(data).toEqual(sessions)
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    })

    const req = createMockRequest({
      'x-opencode-url': 'http://session-server:3000',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://session-server:3000/session',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    })

    const req = createMockRequest({
      'x-opencode-auth': 'Bearer session-token',
    })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer session-token',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Session service down'))

    const req = createMockRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Session service down' })
  })
})

describe('POST /api/opencode/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new session', async () => {
    const newSession = { id: 'new-session', title: 'My Session' }
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(newSession),
    })

    const req = createMockRequest({}, { title: 'My Session' })
    const response = await POST(req)
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Session' }),
      })
    )
    expect(data).toEqual(newSession)
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'test' }),
    })

    const req = createMockRequest(
      { 'x-opencode-url': 'http://custom:8080' },
      { title: 'Test' }
    )
    await POST(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom:8080/session',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'test' }),
    })

    const req = createMockRequest(
      { 'x-opencode-auth': 'Basic xyz789' },
      { title: 'Test' }
    )
    await POST(req)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic xyz789',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Create failed'))

    const req = createMockRequest({}, { title: 'Test' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Create failed' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce('Something went wrong')

    const req = createMockRequest({}, { title: 'Test' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to create session' })
  })
})
