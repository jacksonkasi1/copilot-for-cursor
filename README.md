# Switching GitHub Accounts in copilot-api

## How the Token Works

The GitHub token is saved to `~/.local/share/copilot-api/github_token` with 0o600 permissions. The GitHub token persists across restarts. The Copilot token is ephemeral and refreshed automatically.

---

## To Switch Accounts (When Credits Run Out):

### Step 1: Delete the stored token
```bash
rm ~/.local/share/copilot-api/github_token
```

### Step 2: Restart copilot-api
```bash
# Stop the running server (Ctrl+C) then:
npx copilot-api start
```

This will trigger the OAuth device code flow again, and you can authenticate with your **second GitHub account**.

---

## Alternative: Provide Token Directly

You can also provide a GitHub token directly: `npx copilot-api@latest start --github-token ghp_YOUR_TOKEN_HERE`

So you could create multiple tokens for each account and switch by using different tokens.

---

## Quick Script to Switch Accounts

Create a helper script `switch-copilot-account.sh`:

```bash
#!/bin/bash
echo "🔄 Switching Copilot account..."
rm -f ~/.local/share/copilot-api/github_token
echo "✅ Token removed. Starting fresh authentication..."
npx copilot-api start
```

Make it executable:
```bash
chmod +x switch-copilot-account.sh
```

Run it when you want to switch:
```bash
./switch-copilot-account.sh
```

---

## Check Your Usage Before Switching

You can show your Copilot usage/quota in the terminal (no server needed) with: `npx copilot-api@latest check-usage`

Or visit the web dashboard: `http://localhost:4142` (served by our proxy)

---

## ⚠️ Important Notes

1. GitHub Security Notice: Excessive automated or scripted use of Copilot may trigger GitHub's abuse-detection systems. You may receive a warning from GitHub Security, and further anomalous activity could result in temporary suspension of your Copilot access.

2. Use this proxy responsibly to avoid account restrictions.

---

**Summary:** Just delete the token file at `~/.local/share/copilot-api/github_token` and restart — you'll be prompted to login with a different account! 🔄

---

# 🎉 Setup for Cursor IDE (The "Loophole" Fix)

Cursor often ignores custom API URLs if the model name is standard (e.g., `gpt-4o`). To bypass this, we use a **Proxy Router** that adds a custom prefix to model names.

## 1. Start the Services

You need **two** services running:
1.  **Copilot API** (Port 4141) - The actual provider.
2.  **Proxy Router** (Port 4142) - The "loophole" fixer + Dashboard server.

### One-Time Auto-Start Setup (macOS)
Run these scripts to make them start automatically on boot:

```bash
# Setup Copilot API (4141)
chmod +x setup-copilot-service.sh
./setup-copilot-service.sh

# Setup Proxy Router (4142)
chmod +x setup-proxy-service.sh
./setup-proxy-service.sh
```

---

## 2. Configure Cursor

1.  Open **Settings** (Gear Icon) -> **Models**.
2.  Toggle **OFF** "Copilot" (optional, to avoid conflicts).
3.  Add a new **OpenAI Compatible** model:
    -   **Base URL**: `https://<your-ngrok-url>.ngrok-free.app/v1` (Forwarding to port **4142**)
    -   **API Key**: `dummy`
    -   **Model Name**: Use the **prefixed name** (e.g., `cus-gpt-4o`).

> **How to get the prefixed name?**
> Open the dashboard at `http://localhost:4142`. It lists all available models with their "Cursor Model ID". Just click "Copy"!

---

## 3. Using ngrok (Required for Cursor)

Since Cursor requires HTTPS, you must expose your local proxy (Port 4142) via ngrok:

```bash
ngrok http 4142
```

Use the HTTPS URL provided by ngrok as your Base URL in Cursor.

---

## 📊 Dashboard

The proxy server (Port 4142) now serves the dashboard directly to avoid CORS issues.

👉 **Open in Browser:** [http://localhost:4142](http://localhost:4142)
