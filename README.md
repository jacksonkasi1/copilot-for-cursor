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
