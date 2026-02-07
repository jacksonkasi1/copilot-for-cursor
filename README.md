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
*   **📂 File System:** `Read`, `Write`, `StrReplace`, `Delete`.
*   **💻 Terminal:** `Shell` (Run commands).
*   **🔍 Search:** `Grep`, `Glob`, `SemanticSearch`.
*   **🔌 MCP Tools:** Full support for external tools like Neon, Playwright, etc.

---

## ⚠️ Known Limitations: Claude Vision Support

There is a known server-side limitation with **Claude models** via the GitHub Copilot API.

*   **Gemini / GPT-4o:** Full Vision Support (Images work perfectly).
*   **Claude (via Copilot):** Does **NOT** support images via the API proxy. Requests containing images will be rejected by GitHub with `400 Bad Request`.

**The Workaround (Implemented in Proxy):**
To prevent crashes, the proxy automatically **strips images** from requests sent to Claude models. Claude will see a placeholder `[Image Omitted]` instead.

**Suggested Workflow:**
1.  **Need Vision?** Use `cus-gemini-3-flash-preview` or `cus-gpt-4o`.
2.  **Need Coding Smarts?** Use `cus-claude-sonnet-4.5`.
3.  **Switching Context:** If you start with Gemini (image) and want to switch to Claude, consider **duplicating the chat** (Cursor feature) or starting a fresh chat to ensure a clean context without image dependencies.

> **💡 Help Wanted:** If you know how to get Claude Vision working via the unofficial Copilot API, please open an Issue or PR!

---

### 📝 Logs
If you encounter issues, check the logs:
*   Proxy: `tail -f ~/Library/Logs/copilot-proxy.log`
*   API: `tail -f ~/Library/Logs/copilot-api.log`