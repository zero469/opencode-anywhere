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

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { requestId } = await context.params;
  const baseUrl = getBaseUrl(req);
  const headers = getAuthHeaders(req);
  
  try {
    const response = await fetch(
      `${baseUrl}/question/${requestId}/reject`,
      {
        method: "POST",
        headers,
      }
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject question" },
      { status: 500 }
    );
  }
}
