import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBaseUrl(req: NextRequest): string {
  const urlParam = req.nextUrl.searchParams.get("baseUrl");
  return urlParam || req.headers.get("x-opencode-url") || "http://localhost:4096";
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const sseUrl = `${baseUrl}/global/event`;

  const response = await fetch(sseUrl, {
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok || !response.body) {
    return new Response("Failed to connect to OpenCode SSE", { status: 502 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const encoder = new TextEncoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (error) {
        console.error("[SSE Proxy] Stream error:", error);
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
