import { NextRequest, NextResponse } from "next/server";

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  const authHeader = req.headers.get("x-opencode-auth");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  
  return headers;
}

function getBaseUrl(req: NextRequest): string {
  return req.headers.get("x-opencode-url") || "http://localhost:4096";
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/opencode/sessions/[id]/command
 * 
 * Sends a slash command to be executed by the AI assistant.
 * The backend expands the command template and processes it.
 * 
 * Body: {
 *   command: string,    // Command name (without the leading /)
 *   arguments: string,  // Arguments to pass to the command
 *   model?: string,     // Optional model selection (providerID/modelID)
 *   agent?: string,     // Optional agent name
 * }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const baseUrl = getBaseUrl(req);
  const headers = getAuthHeaders(req);
  const body = await req.json();
  
  try {
    const response = await fetch(`${baseUrl}/session/${id}/command`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Command failed: ${response.status}` }));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute command" },
      { status: 500 }
    );
  }
}
