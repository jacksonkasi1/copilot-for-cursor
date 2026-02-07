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

Or visit the web dashboard: `https://ericc-ch.github.io/copilot-api?endpoint=http://localhost:4141/usage`

---

## ⚠️ Important Notes

1. GitHub Security Notice: Excessive automated or scripted use of Copilot may trigger GitHub's abuse-detection systems. You may receive a warning from GitHub Security, and further anomalous activity could result in temporary suspension of your Copilot access.

2. Use this proxy responsibly to avoid account restrictions.

---

**Summary:** Just delete the token file at `~/.local/share/copilot-api/github_token` and restart — you'll be prompted to login with a different account! 🔄

---

# 🎉 You're Ready to Use!

The server is running and showing models, which means **authentication is already complete**. Your GitHub Copilot is connected!

---

## Quick Test (Verify it works)

Run this in a new terminal:

```bash
curl http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

If you get a response, everything is working!

---

## Now Connect Your Coding Tool

### For **Aider**:
```bash
aider --openai-api-base http://localhost:4141/v1 --openai-api-key dummy --model gpt-4o
```

### For **Cline** (VS Code Extension):
1. Open Cline settings
2. Set API Provider → OpenAI Compatible
3. Base URL: `http://localhost:4141/v1`
4. API Key: `dummy` (any value works)
5. Model: `gpt-4o`

### For **Cursor**:
1. Go to **Settings** (Gear Icon) -> **Models**
2. Toggle off "Copilot" (optional, to avoid conflicts)
3. Add a new **OpenAI Compatible** model:
   - **Base URL**: `https://<your-ngrok-url>.ngrok-free.app/v1` (e.g., `https://545b-103-181-32-182.ngrok-free.app/v1`)
   - **API Key**: `dummy` (any value works)
   - **Model Name**: `gpt-4o` (or any available model from your dashboard)
4. Click **Verify**

> **Note:** Since Cursor requires an HTTPS endpoint, you must use **ngrok** to forward your local port.
> Run: `ngrok http 4141` and use the provided HTTPS URL.

---

## ⚠️ Auto-Start Setup (macOS)

If you want the service to start automatically on boot and restart on crash:

1. Run the setup script included in this repo:
   ```bash
   chmod +x setup-copilot-service.sh
   ./setup-copilot-service.sh
   ```
2. Check logs at `~/Library/Logs/copilot-api.log`

---

## 📊 Dashboard

A simple HTML dashboard is included (`dashboard.html`) to check your quota and available models locally.
Open it in your browser: `open dashboard.html`
