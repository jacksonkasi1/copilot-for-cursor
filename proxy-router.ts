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

    // 0. Serve Dashboard
    if (url.pathname === "/" || url.pathname === "/dashboard.html") {
      try {
        const dashboardContent = await Bun.file("dashboard.html").text();
        return new Response(dashboardContent, { headers: { "Content-Type": "text/html" } });
      } catch (e) {
        return new Response("Dashboard not found.", { status: 404 });
      }
    }

    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

    // Handle CORS
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
        let json = await req.json();
        const originalModel = json.model;

        // --- TRANSFORM TOOLS (Anthropic -> OpenAI) ---
        if (json.tools && Array.isArray(json.tools)) {
            // console.log(`🛠️  Transforming ${json.tools.length} tools to OpenAI format.`);
            
            json.tools = json.tools.map((tool: any) => {
                if (tool.type === 'function' && tool.function) return tool;

                return {
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.input_schema || tool.parameters || {} 
                    }
                };
            });
        }

        // --- FIX TOOL_CHOICE ---
        // Cursor sends: { type: "auto" } or { type: "none" }
        // OpenAI expects: "auto" or "none" (string)
        
        if (json.tool_choice && typeof json.tool_choice === 'object') {
            if (json.tool_choice.type === 'auto') {
                console.log("🛠️  Fixing tool_choice: { type: 'auto' } -> 'auto'");
                json.tool_choice = "auto";
            } else if (json.tool_choice.type === 'none') {
                console.log("🛠️  Fixing tool_choice: { type: 'none' } -> 'none'");
                json.tool_choice = "none";
            } else if (json.tool_choice.type === 'required') {
                console.log("🛠️  Fixing tool_choice: { type: 'required' } -> 'required'");
                json.tool_choice = "required";
            }
             // If it's a specific function call { type: "function", function: ... }, leave it alone.
        }

        if (json.model && json.model.startsWith(PREFIX)) {
          json.model = json.model.slice(PREFIX.length);
          console.log(`🔄 Rewriting model: ${originalModel} -> ${json.model}`);
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
        
        // If error, log the response body from upstream
        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ Upstream Error (${response.status}):`, errText);
            return new Response(errText, { status: response.status, headers: responseHeaders });
        }

        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders,
        });
      }

      // 2. Handle Models List
      if (req.method === "GET" && url.pathname.includes("/models")) {
        const headers = new Headers(req.headers);
        headers.set("host", targetUrl.host);
        const response = await fetch(targetUrl.toString(), { method: "GET", headers: headers });
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
            headers: { ...Object.fromEntries(response.headers), "Access-Control-Allow-Origin": "*" }
        });
      }

      // 3. Fallback
      const headers = new Headers(req.headers);
      headers.set("host", targetUrl.host);
      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: headers,
        body: req.body,
      });
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(response.body, { status: response.status, headers: responseHeaders });

    } catch (error) {
      console.error("Proxy Error:", error);
      return new Response(JSON.stringify({ error: "Proxy Error", details: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
});
