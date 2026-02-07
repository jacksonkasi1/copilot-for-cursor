#!/bin/bash

PLIST_PATH="$HOME/Library/LaunchAgents/com.user.copilot-proxy.plist"
BUN_PATH="/Users/mahy/.bun/bin/bun"
SCRIPT_PATH="$(pwd)/proxy-router.ts"

echo "Creating launchd service for Copilot Proxy (Port 4142)..."

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.copilot-proxy</string>
    <key>ProgramArguments</key>
    <array>
        <string>$BUN_PATH</string>
        <string>run</string>
        <string>$SCRIPT_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/copilot-proxy.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/copilot-proxy.error.log</string>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
</dict>
</plist>
EOF

echo "✅ Created plist at $PLIST_PATH"

# Unload previous service if running
launchctl unload "$PLIST_PATH" 2>/dev/null

# Load and start the service
launchctl load "$PLIST_PATH"

echo "✅ Proxy Service loaded and started on Port 4142!"
echo "Logs available at: ~/Library/Logs/copilot-proxy.log"
