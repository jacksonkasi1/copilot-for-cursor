# 🚀 Copilot Proxy for Cursor

**Unlock the full power of GitHub Copilot in Cursor IDE.**

This project provides a local proxy server that acts as a bridge between Cursor and GitHub Copilot. It solves key limitations by:
1.  **Bypassing Cursor's Model Routing:** Using a custom prefix (`cus-`) to force Cursor to use your own API endpoint instead of its internal backend.
2.  **Enabling Agentic Capabilities:** Transforming Cursor's Anthropic-style tool calls into OpenAI-compatible formats that Copilot understands. This enables **File Editing, Terminal Execution, Codebase Search, and MCP Tools**.
3.  **Fixing Schema Errors:** Automatically sanitizing requests to prevent `400 Bad Request` errors caused by format mismatches (e.g., `tool_choice`, `cache_control`).

---

## 🏗 Architecture

*   **Port 4141 (`copilot-api`):** The core service that authenticates with GitHub and provides the OpenAI-compatible API.
*   **Port 4142 (`proxy-router`):** The intelligence layer. It intercepts requests, transforms schemas, handles the "loophole" prefix, and serves the dashboard.

---

## 🛠 Setup Guide

### 1. Prerequisites
*   Node.js & npm
*   Bun (`curl -fsSL https://bun.sh/install | bash`)
*   ngrok (for HTTPS tunneling required by Cursor)

### 2. Installation & Auto-Start (macOS)
Run these scripts once to set up persistent background services. They will start automatically on boot and restart if they crash.

```bash

# 1. Setup Core API (Port 4141)
chmod +x setup-copilot-service.sh
./setup-copilot-service.sh

# 2. Setup Proxy Router (Port 4142)
chmod +x setup-proxy-service.sh
./setup-proxy-service.sh
```

### 3. Verify Services
Check if the dashboard is running:
👉 **[http://localhost:4142](http://localhost:4142)**

---

## ⚙️ Cursor Configuration

Cursor requires an HTTPS endpoint. We use `ngrok` to expose our local proxy.

1.  **Start ngrok:**
    ```bash
    ngrok http 4142
    ```
    *Copy the HTTPS URL provided by ngrok (e.g., `https://your-url.ngrok-free.app`).*

2.  **Configure Cursor:**
    *   Go to **Settings** (Gear Icon) -> **Models**.
    *   Toggle **OFF** "Copilot" (optional, to avoid conflicts).
    *   Add a new **OpenAI Compatible** model:
        *   **Base URL:** `https://your-ngrok-url.ngrok-free.app/v1`
        *   **API Key:** `dummy` (any value works)
        *   **Model Name:** Use a **prefixed name** (e.g., `cus-claude-sonnet-4.5`).

    > **💡 Tip:** Go to the [Dashboard](http://localhost:4142) to see all available models and copy their IDs.

---

## ✨ Features & Supported Tools

This proxy enables **full agentic workflows**. The following capabilities are fully supported:

*   **💬 Chat & Reasoning:** Full conversation context with standard models.
*   **📂 File System:**
    *   `Read`: Read file contents.
    *   `Write`: Create and overwrite files.
    *   `StrReplace`: Intelligent find-and-replace edits.
    *   `Delete`: Remove files.
*   **💻 Terminal:**
    *   `Shell`: Execute commands (`ls`, `git`, `npm`, etc.).
*   **🔍 Search:**
    *   `Grep` / `Glob`: Regex and file pattern search.
    *   `SemanticSearch`: AI-powered codebase navigation.
*   **🔌 MCP Tools (Model Context Protocol):**
    *   Full support for external tools like **Neon** (Database), **Playwright** (Browser Automation), **Memory**, and **Docs**.

---

## 🧪 Verification

To confirm that Chat, File Creation, Terminal, and Reasoning are all working together, run this prompt in Cursor:

```text
Please perform this multi-step test to verify your tool capabilities:

1. Create a new directory named "test_agent_capabilities".
2. Inside it, create a file "status_report.md" with the content: "# Agent Capabilities Test\nStarted verification..."
3. Run the terminal command `ls -F` in that directory and append the output to "status_report.md".
4. Search the current codebase for the string "proxy-router" using grep/search and summarize what you find in a new section in "status_report.md".
5. Use your memory tool (if available) to save this fact: "The verification test was run successfully."
6. Finally, read the "status_report.md" file and show me the final content.
```

If the agent completes the task and shows the file content, your setup is perfect! ✅

---

## ⚠️ Limitations & Notes

1.  **"Append" Logic:** Sometimes the model may claim to "append" text to a file but might overwrite it instead, or fail to read the previous content first. This is a behavior of the *model*, not a failure of the proxy.
2.  **Image Uploads:** The proxy sanitizes requests to ensure compatibility. Standard image uploads (Vision) are supported via OpenAI format (`image_url`), but some proprietary Anthropic image formats may be converted to text placeholders to prevent crashes.
3.  **ngrok URL:** The ngrok URL changes every time you restart ngrok (unless you have a paid static domain). You will need to update the Base URL in Cursor if you restart ngrok.

---

### 📝 Logs
If you encounter issues, check the logs:
*   Proxy: `tail -f ~/Library/Logs/copilot-proxy.log`
*   API: `tail -f ~/Library/Logs/copilot-api.log`