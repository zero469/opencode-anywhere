import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
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

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/opencode/sessions/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies to /session/{id}/message and returns messages', async () => {
    const messages = [
      { info: { id: 'msg-1', role: 'user' }, parts: [] },
      { info: { id: 'msg-2', role: 'assistant' }, parts: [] },
    ]
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(messages),
    })

    const req = createMockRequest()
    const response = await GET(req, createContext('session-456'))
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session/session-456/message',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(data).toEqual(messages)
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    })

    const req = createMockRequest({
      'x-opencode-url': 'http://message-server:6000',
    })
    await GET(req, createContext('sess-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      'http://message-server:6000/session/sess-1/message',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    })

    const req = createMockRequest({
      'x-opencode-auth': 'Basic msg-auth',
    })
    await GET(req, createContext('session-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic msg-auth',
        },
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Message fetch failed'))

    const req = createMockRequest()
    const response = await GET(req, createContext('session-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Message fetch failed' })
  })
})

describe('POST /api/opencode/sessions/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends message via prompt_async endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 204,
      json: () => Promise.resolve({}),
    })

    const body = { parts: [{ type: 'text', text: 'Hello' }] }
    const req = createMockRequest({}, body)
    const response = await POST(req, createContext('session-789'))

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/session/session-789/prompt_async',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    )
    expect(response.status).toBe(204)
  })

  it('returns JSON response when not 204', async () => {
    const responseData = { queued: true, messageId: 'msg-1' }
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(responseData),
    })

    const body = { parts: [{ type: 'text', text: 'Hello' }] }
    const req = createMockRequest({}, body)
    const response = await POST(req, createContext('session-1'))
    const data = await response.json()

    expect(data).toEqual(responseData)
  })

  it('uses custom base URL from header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 204,
      json: () => Promise.resolve({}),
    })

    const req = createMockRequest(
      { 'x-opencode-url': 'http://prompt-server:5000' },
      { parts: [] }
    )
    await POST(req, createContext('sess-abc'))

    expect(mockFetch).toHaveBeenCalledWith(
      'http://prompt-server:5000/session/sess-abc/prompt_async',
      expect.any(Object)
    )
  })

  it('includes auth header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 204,
      json: () => Promise.resolve({}),
    })

    const req = createMockRequest(
      { 'x-opencode-auth': 'Bearer prompt-token' },
      { parts: [] }
    )
    await POST(req, createContext('session-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer prompt-token',
        },
      })
    )
  })

  it('includes model and agent in request body', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 204,
      json: () => Promise.resolve({}),
    })

    const body = {
      parts: [{ type: 'text', text: 'Hello' }],
      model: { providerID: 'anthropic', modelID: 'claude-3' },
      agent: 'build',
    }
    const req = createMockRequest({}, body)
    await POST(req, createContext('session-1'))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(body),
      })
    )
  })

  it('returns 500 on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Prompt send failed'))

    const req = createMockRequest({}, { parts: [] })
    const response = await POST(req, createContext('session-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Prompt send failed' })
  })

  it('returns 500 with generic message on non-Error throw', async () => {
    mockFetch.mockRejectedValueOnce(null)

    const req = createMockRequest({}, { parts: [] })
    const response = await POST(req, createContext('session-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to send message' })
  })
})
