const PORT = 4142;
const TARGET_URL = "http://localhost:4141";
const PREFIX = "cus-";

console.log(`🚀 Proxy Router running on http://localhost:${PORT}`);
console.log(`🔗 Forwarding to ${TARGET_URL}`);
console.log(`🏷️  Prefix: "${PREFIX}"`);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    try {
      // 1. Handle Chat Completions (Modify Request Body)
      if (req.method === "POST" && url.pathname.includes("/chat/completions")) {
        const json = await req.json();
        const originalModel = json.model;

        if (json.model && json.model.startsWith(PREFIX)) {
          json.model = json.model.slice(PREFIX.length);
          console.log(`🔄 Rewriting model: ${originalModel} -> ${json.model}`);
        } else {
          console.log(`⚠️  Model "${json.model}" has no prefix. Forwarding as is.`);
        }

        const body = JSON.stringify(json);
        const headers = new Headers(req.headers);
        headers.set("host", targetUrl.host);
        headers.set("content-length", String(new TextEncoder().encode(body).length));

        const response = await fetch(targetUrl.toString(), {
          method: "POST",
          headers: headers,
          body: body,
        });

        // Return response with CORS
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders,
        });
      }

      // 2. Handle Models List (Modify Response Body)
      if (req.method === "GET" && url.pathname.includes("/models")) {
        const headers = new Headers(req.headers);
        headers.set("host", targetUrl.host);

        const response = await fetch(targetUrl.toString(), {
          method: "GET",
          headers: headers,
        });

        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          data.data = data.data.map((model: any) => ({
            ...model,
            id: PREFIX + model.id,
            display_name: PREFIX + (model.display_name || model.id)
          }));
        }

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        });
      }

      // 3. Fallback: Proxy Everything Else Directly
      const headers = new Headers(req.headers);
      headers.set("host", targetUrl.host);

      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: headers,
        body: req.body,
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error("Proxy Error:", error);
      return new Response(JSON.stringify({ error: "Proxy Error", details: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
});