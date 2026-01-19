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

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const baseUrl = getBaseUrl(req);
  const headers = getAuthHeaders(req);
  
  try {
    const response = await fetch(`${baseUrl}/session/${id}/todo`, {
      headers,
    });
    
    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
