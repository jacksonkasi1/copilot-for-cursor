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
        let targetModel = json.model;

        if (json.model && json.model.startsWith(PREFIX)) {
          targetModel = json.model.slice(PREFIX.length);
          json.model = targetModel;
          console.log(`🔄 Rewriting model: ${originalModel} -> ${json.model}`);
        }

        const isClaude = targetModel.toLowerCase().includes('claude');

        // --- HELPER: Recursively clean schema object ---
        const cleanSchema = (schema: any) => {
            if (!schema || typeof schema !== 'object') return schema;
            if (schema.additionalProperties !== undefined) delete schema.additionalProperties;
            if (schema.$schema !== undefined) delete schema.$schema;
            if (schema.title !== undefined) delete schema.title;
            if (schema.properties) {
                for (const key in schema.properties) cleanSchema(schema.properties[key]);
            }
            if (schema.items) cleanSchema(schema.items);
            return schema;
        };

        // --- TRANSFORM TOOLS (Anthropic -> OpenAI) ---
        if (json.tools && Array.isArray(json.tools)) {
            json.tools = json.tools.map((tool: any) => {
                let parameters = tool.input_schema || tool.parameters || {};
                parameters = cleanSchema(parameters);
                if (tool.type === 'function' && tool.function) {
                    tool.function.parameters = cleanSchema(tool.function.parameters);
                    return tool;
                }
                return {
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: parameters 
                    }
                };
            });
        }

        // --- FIX TOOL_CHOICE ---
        if (json.tool_choice && typeof json.tool_choice === 'object') {
            if (json.tool_choice.type === 'auto') json.tool_choice = "auto";
            else if (json.tool_choice.type === 'none') json.tool_choice = "none";
            else if (json.tool_choice.type === 'required') json.tool_choice = "required";
        }

        // --- PROCESS MESSAGES (Sanitize, Transform, Handle Tools) ---
        if (json.messages && Array.isArray(json.messages)) {
            const newMessages: any[] = [];
            
            for (let i = 0; i < json.messages.length; i++) {
                const msg = json.messages[i];
                let isToolResult = false;

                // 1. Handle Anthropic "Tool Result" Block
                if (msg.role === 'user' && Array.isArray(msg.content)) {
                    const toolResults = msg.content.filter((c: any) => c.type === 'tool_result');
                    if (toolResults.length > 0) {
                        isToolResult = true;
                        toolResults.forEach((tr: any) => {
                            newMessages.push({
                                role: "tool",
                                tool_call_id: tr.tool_use_id,
                                content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content)
                            });
                        });
                        
                        const otherContent = msg.content.filter((c: any) => c.type !== 'tool_result');
                        if (otherContent.length > 0) {
                            const mappedContent = otherContent.map((part: any) => {
                                if (part.cache_control) delete part.cache_control;
                                
                                // CLAUDE: Strip Images (Quietly)
                                if (isClaude) {
                                    if (part.type === 'image' || (part.source && part.source.type === 'base64')) {
                                        return { type: 'text', text: '[Image Omitted]' };
                                    }
                                }

                                // ALL: Transform Images
                                if (part.type === 'image' && part.source && part.source.type === 'base64') {
                                    return {
                                        type: 'image_url',
                                        image_url: {
                                            url: `data:${part.source.media_type};base64,${part.source.data}`
                                        }
                                    };
                                }
                                if (part.type === 'image') part.type = 'image_url';
                                return part;
                            });
                            newMessages.push({ role: 'user', content: mappedContent });
                        }
                    }
                }

                if (!isToolResult) {
                    if (Array.isArray(msg.content)) {
                        msg.content = msg.content.map((part: any) => {
                            if (part.cache_control) delete part.cache_control;
                            
                            // CLAUDE: Strip Images (Quietly)
                            if (isClaude) {
                                if (part.type === 'image' || (part.source && part.source.type === 'base64')) {
                                    return { type: 'text', text: '[Image Omitted]' };
                                }
                            }

                            // ALL: Transform Images
                            if (part.type === 'image' && part.source && part.source.type === 'base64') {
                                return {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:${part.source.media_type};base64,${part.source.data}`
                                    }
                                };
                            }
                            
                            if (part.type === 'image') part.type = 'image_url';
                            return part;
                        });
                        
                        if (msg.content.length === 0) msg.content = " ";
                    }
                    newMessages.push(msg);
                }
            }
            json.messages = newMessages;
            
            // NOTE: Removed System Prompt Injection to avoid confusing Claude.
        }

        const body = JSON.stringify(json);
        const headers = new Headers(req.headers);
        headers.set("host", targetUrl.host);
        headers.set("content-length", String(new TextEncoder().encode(body).length));

        // --- VISION HEADER (Only if NOT Claude) ---
        const hasVisionContent = (messages: any[]) => messages.some(msg => 
            Array.isArray(msg.content) && msg.content.some((p: any) => p.type === 'image_url')
        );

        if (!isClaude && hasVisionContent(json.messages)) {
             headers.set("Copilot-Vision-Request", "true");
        }

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
