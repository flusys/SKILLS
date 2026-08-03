#!/bin/bash
# Enforces two Hard Rules from CLAUDE.md that were previously only prose:
#   - never modify anything under node_modules/
#   - never hand-edit generated migrations
# PreToolUse hook for Edit|Write|MultiEdit — see .claude/settings.json.

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")

if [ -z "$file_path" ]; then
  exit 0
fi

if echo "$file_path" | grep -qE '(^|/)node_modules/'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "CLAUDE.md Hard Rule: never modify anything under node_modules/. If a @flusys/* package is broken, report it by package name instead."
    }
  }'
  exit 0
fi

if echo "$file_path" | grep -qE '(^|/)persistence/migrations/'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "CLAUDE.md Hard Rule: never hand-edit migrations. Change the entity instead and run: cd backend && npm run migration:generate --name=<name> && npm run migration:run"
    }
  }'
  exit 0
fi

exit 0
