# Session Search Feature

## TL;DR

> **Quick Summary**: Add search functionality to the session list, allowing users to quickly find sessions by title.
> 
> **Deliverables**:
> - Search input in SessionList header
> - API support for `search` and `limit` parameters
> - Debounced search with loading indicator
> 
> **Estimated Effort**: Short (~2-3 hours)
> **Parallel Execution**: NO - sequential tasks
> **Critical Path**: API → Store → UI

---

## Context

### Original Request
Add session search/filter capability using the new OpenCode API parameters: `search` and `limit`.

### Research Findings
- OpenCode API now supports: `GET /session?search=xxx&limit=20`
- Current `getSessions()` only passes `roots=true`
- SessionList component already has header with refresh/new buttons - good place for search input

---

## Work Objectives

### Core Objective
Enable users to search sessions by title directly from the session list.

### Concrete Deliverables
- `src/lib/opencode.ts`: Updated `getSessions()` with search/limit params
- `src/store/index.ts`: New `searchQuery` state and `searchSessions()` action
- `src/components/SessionList.tsx`: Search input with debounce

### Definition of Done
- [x] User can type in search box and see filtered results
- [x] Search is debounced (300ms) to avoid excessive API calls
- [x] Loading indicator shows during search
- [x] Clearing search shows all sessions again
- [x] Works on both native iOS and web

### Must Have
- Debounced search (not on every keystroke)
- Loading state feedback
- Clear button to reset search

### Must NOT Have (Guardrails)
- Don't break existing session list functionality
- Don't add complex filtering UI (keep it simple - just search)
- Don't persist search query across app restarts

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: Tests-after (add test for new API function)
- **Agent-Executed QA**: Playwright for UI verification

### Agent-Executed QA Scenarios

```
Scenario: Search finds matching sessions
  Tool: Playwright (playwright skill)
  Preconditions: App connected, multiple sessions exist with different titles
  Steps:
    1. Navigate to session list
    2. Find search input: input[placeholder*="Search"]
    3. Type: "test" (a term that matches some sessions)
    4. Wait 500ms for debounce + API response
    5. Assert: Session list shows only sessions with "test" in title
    6. Screenshot: .sisyphus/evidence/session-search-results.png
  Expected Result: Filtered list shows matching sessions only
  Evidence: .sisyphus/evidence/session-search-results.png

Scenario: Clear search shows all sessions
  Tool: Playwright (playwright skill)
  Preconditions: Search has been performed
  Steps:
    1. Click clear button (X) in search input
    2. Wait for session list to update
    3. Assert: All sessions visible again
  Expected Result: Full session list restored
  Evidence: .sisyphus/evidence/session-search-cleared.png

Scenario: Empty search results
  Tool: Playwright (playwright skill)
  Steps:
    1. Type: "xyznonexistent123"
    2. Wait for search
    3. Assert: "No sessions found" or empty state visible
  Expected Result: Empty state shown for no matches
```

---

## TODOs

- [x] 1. Update getSessions API to support search/limit parameters

  **What to do**:
  - Add `GetSessionsOptions` interface with `search?: string` and `limit?: number`
  - Modify `getSessions()` to accept options parameter
  - Build URL params from options

  **Must NOT do**:
  - Don't change the default behavior when no options passed

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - Reason: Simple API modification, single file change

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  - `src/lib/opencode.ts:194-202` - Current getSessions implementation
  - OpenCode API: `GET /session?search=xxx&limit=20&roots=true`

  **Acceptance Criteria**:
  - [x] `getSessions()` accepts optional `{ search?: string, limit?: number }`
  - [x] When `search` provided, adds `?search=xxx` to URL
  - [x] When `limit` provided, adds `?limit=N` to URL
  - [x] Backward compatible - calling `getSessions()` without args still works

  **Commit**: YES
  - Message: `feat(api): add search and limit params to getSessions`
  - Files: `src/lib/opencode.ts`

---

- [x] 2. Add search state and action to store

  **What to do**:
  - Add `sessionSearchQuery: string` to state
  - Add `setSessionSearchQuery(query: string)` action
  - Modify `refreshSessions()` to use search query if set
  - Add `searchSessions(query: string)` that sets query and refreshes

  **Must NOT do**:
  - Don't persist search query to localStorage
  - Don't break existing refreshSessions behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - Reason: State management addition, follows existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/store/index.ts:494-536` - refreshSessions implementation
  - `src/store/index.ts:188-210` - state shape

  **Acceptance Criteria**:
  - [x] `sessionSearchQuery` added to state (default: "")
  - [x] `setSessionSearchQuery()` action updates query
  - [x] `refreshSessions()` passes search query to API when set
  - [x] Clearing query (empty string) fetches all sessions

  **Commit**: NO (group with task 3)

---

- [x] 3. Add search UI to SessionList component

  **What to do**:
  - Add search input between header and session list
  - Implement debounce (300ms) for search input
  - Show loading indicator during search
  - Add clear button (X) when search has text
  - Handle empty results state

  **Must NOT do**:
  - Don't add complex filter dropdowns
  - Don't auto-focus search on mount (annoying on mobile)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`
  - Reason: UI component with user interaction patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:
  - `src/components/SessionList.tsx:273-305` - Current header area
  - `src/components/SessionList.tsx:307-362` - Session list rendering

  **Acceptance Criteria**:
  - [x] Search input visible below header
  - [x] Typing triggers debounced search (300ms delay)
  - [x] Loading spinner shows during API call
  - [x] Clear (X) button appears when input has text
  - [x] "No sessions found" shows for empty results
  - [x] Pinned sessions still shown separately when not searching
  - [x] Search filters both pinned and unpinned sessions

  **Agent-Executed QA**:
  ```
  Scenario: Search input renders correctly
    Tool: Playwright
    Steps:
      1. Navigate to session list view
      2. Assert: input[placeholder*="Search"] exists
      3. Assert: Input is not auto-focused
      4. Screenshot: .sisyphus/evidence/task-3-search-input.png
    Evidence: .sisyphus/evidence/task-3-search-input.png
  
  Scenario: Debounce prevents excessive API calls
    Tool: Playwright
    Steps:
      1. Type "test" quickly (4 chars)
      2. Count network requests to /session endpoint
      3. Assert: Only 1 request made (after debounce), not 4
    Evidence: Network log captured
  ```

  **Commit**: YES
  - Message: `feat(ui): add session search with debounce`
  - Files: `src/store/index.ts`, `src/components/SessionList.tsx`

---

- [x] 4. Add test for getSessions with search

  **What to do**:
  - Add test case for `getSessions({ search: 'test' })`
  - Verify URL includes search param

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (after task 1)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/lib/opencode.test.ts` - Existing tests

  **Acceptance Criteria**:
  - [x] Test verifies search param is added to URL
  - [x] `bun test src/lib/opencode.test.ts` passes

  **Commit**: YES
  - Message: `test: add getSessions search param test`
  - Files: `src/lib/opencode.test.ts`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `feat(api): add search and limit params to getSessions` | opencode.ts |
| 3 | `feat(ui): add session search with debounce` | store/index.ts, SessionList.tsx |
| 4 | `test: add getSessions search param test` | opencode.test.ts |

---

## Success Criteria

### Verification Commands
```bash
bun test  # All tests pass
bun run build  # Build succeeds
```

### Final Checklist
- [x] Search input visible in session list
- [x] Typing filters sessions after debounce
- [x] Clear button resets to all sessions
- [x] Works on iOS native app
- [x] No console errors
