import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initClient,
  getConfig,
  checkConnection,
  getProviders,
  getAgents,
  getSessions,
  getSessionMessages,
  sendMessageAsync,
  respondToPermission,
  abortSession,
  createSession,
  subscribeToEvents,
} from './opencode'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('opencode client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initClient({ baseUrl: 'http://localhost:4096' })
  })

  describe('initClient / getConfig', () => {
    it('stores and retrieves config', () => {
      const config = { baseUrl: 'http://test:8080' }
      initClient(config)
      expect(getConfig()).toEqual(config)
    })

    it('includes auth header when credentials provided', async () => {
      initClient({
        baseUrl: 'http://localhost:4096',
        username: 'user',
        password: 'pass',
      })

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ healthy: true, version: '1.0.0' }),
      })

      await checkConnection()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-opencode-auth': expect.stringContaining('Basic'),
          }),
        })
      )
    })
  })

  describe('checkConnection', () => {
    it('returns connected status when healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ healthy: true, version: '1.2.3' }),
      })

      const status = await checkConnection()

      expect(status).toEqual({
        connected: true,
        serverVersion: '1.2.3',
      })
    })

    it('returns error when response has error field', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      const status = await checkConnection()

      expect(status).toEqual({
        connected: false,
        error: 'Server error',
      })
    })

    it('returns error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const status = await checkConnection()

      expect(status).toEqual({
        connected: false,
        error: 'Network error',
      })
    })

    it('returns error when client not initialized', async () => {
      initClient(null as any)

      const status = await checkConnection()

      expect(status).toEqual({
        connected: false,
        error: 'Client not initialized',
      })
    })
  })

  describe('getProviders', () => {
    it('returns providers on success', async () => {
      const providers = { all: [], connected: [], default: {} }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(providers),
      })

      const result = await getProviders()

      expect(result).toEqual(providers)
    })

    it('returns null on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Failed' }),
      })

      const result = await getProviders()

      expect(result).toBeNull()
    })

    it('returns null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getProviders()

      expect(result).toBeNull()
    })
  })

  describe('getAgents', () => {
    it('returns agents on success', async () => {
      const agents = [{ name: 'build', mode: 'primary' }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(agents),
      })

      const result = await getAgents()

      expect(result).toEqual(agents)
    })

    it('returns empty array on error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Failed' }),
      })

      const result = await getAgents()

      expect(result).toEqual([])
    })
  })

   describe('getSessions', () => {
     it('returns sessions on success', async () => {
       const sessions = [{ id: 'session-1', title: 'Test' }]
       mockFetch.mockResolvedValueOnce({
         json: () => Promise.resolve(sessions),
       })
 
       const result = await getSessions()
 
       expect(result).toEqual(sessions)
     })
 
     it('throws error on error response', async () => {
       mockFetch.mockResolvedValueOnce({
         json: () => Promise.resolve({ error: 'Not found' }),
       })
 
       await expect(getSessions()).rejects.toThrow('Not found')
     })
 
     it('should include search param when provided', async () => {
       const sessions = [{ id: 'session-1', title: 'Test' }]
       mockFetch.mockResolvedValueOnce({
         json: () => Promise.resolve(sessions),
       })
 
       await getSessions({ search: 'test query' })
 
       const callUrl = mockFetch.mock.calls[0][0]
       expect(callUrl).toContain('search=test')
       expect(callUrl).toContain('query')
     })
 
     it('should include limit param when provided', async () => {
       const sessions = [{ id: 'session-1', title: 'Test' }]
       mockFetch.mockResolvedValueOnce({
         json: () => Promise.resolve(sessions),
       })
 
       await getSessions({ limit: 10 })
 
       expect(mockFetch).toHaveBeenCalledWith(
         expect.stringContaining('limit=10'),
         expect.any(Object)
       )
     })
 
     it('should include both search and limit params', async () => {
       const sessions = [{ id: 'session-1', title: 'Test' }]
       mockFetch.mockResolvedValueOnce({
         json: () => Promise.resolve(sessions),
       })
 
       await getSessions({ search: 'foo', limit: 5 })
 
       const callUrl = mockFetch.mock.calls[0][0]
       expect(callUrl).toContain('search=foo')
       expect(callUrl).toContain('limit=5')
     })
   })

  describe('getSessionMessages', () => {
    it('returns messages on success', async () => {
      const messages = [{ info: { id: 'msg-1' }, parts: [] }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(messages),
      })

      const result = await getSessionMessages('session-1')

      expect(result.messages).toEqual(messages)
      expect(result.hasMore).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/sessions/session-1/messages',
        expect.any(Object)
      )
    })

    it('returns empty array when response is empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const result = await getSessionMessages('session-1')

      expect(result.messages).toEqual([])
      expect(result.hasMore).toBe(false)
    })
  })

  describe('sendMessageAsync', () => {
    it('sends message with text part', async () => {
      mockFetch.mockResolvedValueOnce({ 
        ok: true,
        json: () => Promise.resolve(null),
      })

      const result = await sendMessageAsync('session-1', 'Hello')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/sessions/session-1/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ parts: [{ type: 'text', text: 'Hello' }] }),
        })
      )
    })

    it('includes model and agent when provided', async () => {
      mockFetch.mockResolvedValueOnce({ 
        ok: true,
        json: () => Promise.resolve(null),
      })

      await sendMessageAsync('session-1', 'Hello', {
        model: { providerID: 'anthropic', modelID: 'claude-3' },
        agent: 'build',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/sessions/session-1/messages',
        expect.objectContaining({
          body: JSON.stringify({
            parts: [{ type: 'text', text: 'Hello' }],
            model: { providerID: 'anthropic', modelID: 'claude-3' },
            agent: 'build',
          }),
        })
      )
    })

    it('throws error on failed response', async () => {
      mockFetch.mockResolvedValueOnce({ 
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      })

      await expect(sendMessageAsync('session-1', 'Hello')).rejects.toThrow('Failed')
    })
  })

  describe('respondToPermission', () => {
    it('sends allow response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await respondToPermission('session-1', 'perm-1', true)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/permissions/perm-1/reply',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reply: 'once' }),
        })
      )
    })

    it('sends deny response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await respondToPermission('session-1', 'perm-1', false)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/permissions/perm-1/reply',
        expect.objectContaining({
          body: JSON.stringify({ reply: 'reject' }),
        })
      )
    })
  })

  describe('abortSession', () => {
    it('sends abort request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await abortSession('session-1')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/sessions/session-1/abort',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('createSession', () => {
    it('creates session with title', async () => {
      const session = { id: 'new-session', title: 'My Session' }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(session),
      })

      const result = await createSession('My Session')

      expect(result).toEqual(session)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/opencode/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'My Session' }),
        })
      )
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Create failed' }),
      })

      await expect(createSession('Test')).rejects.toThrow('Create failed')
    })
  })

  describe('subscribeToEvents', () => {
    it('creates EventSource with correct URL', () => {
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      })

      const subscription = subscribeToEvents({ baseUrl: 'http://localhost:4096' })

      expect(subscription).toHaveProperty('close')
      subscription.close()

      Object.defineProperty(window, 'location', { value: originalLocation })
    })

    it('calls onEvent when message received', async () => {
      const onEvent = vi.fn()
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      })

      let capturedOnMessage: ((event: MessageEvent) => void) | null = null
      class MockEventSource {
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: (() => void) | null = null
        onopen: (() => void) | null = null
        close = vi.fn()
        constructor() {
          setTimeout(() => {
            capturedOnMessage = this.onmessage
          }, 0)
        }
      }
      Object.defineProperty(window, 'EventSource', { value: MockEventSource })

      subscribeToEvents({ baseUrl: 'http://localhost:4096' }, onEvent)
      
      await new Promise(resolve => setTimeout(resolve, 10))

      if (capturedOnMessage) {
        capturedOnMessage({
          data: JSON.stringify({
            payload: { type: 'message.created', properties: { id: '1' } },
          }),
        } as MessageEvent)
      }

      expect(onEvent).toHaveBeenCalledWith({
        type: 'message.created',
        properties: { id: '1' },
      })

      Object.defineProperty(window, 'location', { value: originalLocation })
    })
  })
})
