#!/bin/bash

PLIST_PATH="$HOME/Library/LaunchAgents/com.user.copilot-api.plist"
NODE_PATH="/Users/mahy/.nvm/versions/node/v22.18.0/bin"
NPX_CMD="$NODE_PATH/npx"

echo "Creating launchd service for copilot-api..."

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.copilot-api</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NPX_CMD</string>
        <string>copilot-api</string>
        <string>start</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_PATH:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/copilot-api.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/copilot-api.error.log</string>
</dict>
</plist>
EOF

echo "✅ Created plist at $PLIST_PATH"

# Unload previous service if running
launchctl unload "$PLIST_PATH" 2>/dev/null

# Load and start the service
launchctl load "$PLIST_PATH"

echo "✅ Service loaded and started!"
echo "Logs available at: ~/Library/Logs/copilot-api.log"
