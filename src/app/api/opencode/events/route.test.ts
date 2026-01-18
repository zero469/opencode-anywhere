import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockRequest(
  headers: Record<string, string> = {},
  searchParams: Record<string, string> = {}
): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] || null,
    },
    nextUrl: {
      searchParams: {
        get: (key: string) => searchParams[key] || null,
      },
    },
  } as unknown as NextRequest
}

describe('GET /api/opencode/events (SSE proxy)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connects to /global/event SSE endpoint', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([104, 101, 108, 108, 111]) })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    }
    const mockBody = {
      getReader: () => mockReader,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockBody,
    })

    const req = createMockRequest()
    const response = await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4096/global/event',
      expect.objectContaining({
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    )
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(response.headers.get('Connection')).toBe('keep-alive')
  })

  it('uses baseUrl from query parameter', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    })

    const req = createMockRequest({}, { baseUrl: 'http://custom:9000' })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom:9000/global/event',
      expect.any(Object)
    )
  })

  it('uses baseUrl from header when query param not provided', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    })

    const req = createMockRequest({ 'x-opencode-url': 'http://header-url:8080' })
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://header-url:8080/global/event',
      expect.any(Object)
    )
  })

  it('prefers query param over header for baseUrl', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    })

    const req = createMockRequest(
      { 'x-opencode-url': 'http://header-url:8080' },
      { baseUrl: 'http://query-url:9000' }
    )
    await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://query-url:9000/global/event',
      expect.any(Object)
    )
  })

  it('returns 502 when upstream response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      body: null,
    })

    const req = createMockRequest()
    const response = await GET(req)

    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toBe('Failed to connect to OpenCode SSE')
  })

  it('returns 502 when response body is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: null,
    })

    const req = createMockRequest()
    const response = await GET(req)

    expect(response.status).toBe(502)
  })

  it('streams data from upstream to client', async () => {
    const chunks = [
      new TextEncoder().encode('data: {"type":"test"}\n\n'),
      new TextEncoder().encode('data: {"type":"test2"}\n\n'),
    ]
    let readIndex = 0
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (readIndex < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[readIndex++] })
        }
        return Promise.resolve({ done: true, value: undefined })
      }),
      releaseLock: vi.fn(),
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    })

    const req = createMockRequest()
    const response = await GET(req)

    expect(response.body).toBeDefined()
    
    const reader = response.body!.getReader()
    const receivedChunks: Uint8Array[] = []
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) receivedChunks.push(value)
    }

    expect(receivedChunks.length).toBe(2)
  })

  it('handles stream read errors gracefully', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
        .mockRejectedValueOnce(new Error('Stream interrupted')),
      releaseLock: vi.fn(),
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    })

    const req = createMockRequest()
    const response = await GET(req)

    expect(response.body).toBeDefined()
    
    const reader = response.body!.getReader()
    const receivedChunks: Uint8Array[] = []
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) receivedChunks.push(value)
    }

    expect(receivedChunks.length).toBe(1)
    expect(mockReader.releaseLock).toHaveBeenCalled()
  })
})
