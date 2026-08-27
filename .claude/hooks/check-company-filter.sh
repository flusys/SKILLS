#!/bin/bash
# Backstop for the CLAUDE.md/security.md CRITICAL rule: every list/get query on a company-scoped
# entity must call applyCompanyFilter. Reference docs and skill prose repeat this rule in four
# places, but none of them are a mechanical gate — this is that gate.
#
# PostToolUse hook for Edit|Write|MultiEdit — see .claude/settings.json. Fires only on a
# backend service file, only once the project is stamped with Company feature: true, and only
# for an entity that actually declares a companyId column.
#
# Escape hatch for a service that intentionally reads across companies (e.g. a super-admin
# report): add a `// company-filter: exempt — <reason>` comment anywhere in the file.

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")

[ -z "$file_path" ] && exit 0
echo "$file_path" | grep -qE '(^|/)services/[^/]+\.service\.ts$' || exit 0
[ -f "$file_path" ] || exit 0

root_claude="$CLAUDE_PROJECT_DIR/CLAUDE.md"
[ -f "$root_claude" ] || exit 0

# Only enforced once bootstrap has stamped the project's Company feature convention as true.
grep -qE '^\|\s*Company feature\s*\|\s*true\s*\|' "$root_claude" || exit 0

grep -q "company-filter: exempt" "$file_path" && exit 0

entity_file=$(echo "$file_path" | sed -E 's#(^|/)services/([^/]+)\.service\.ts$#\1entities/\2.entity.ts#')
[ -f "$entity_file" ] || exit 0
grep -q "companyId" "$entity_file" || exit 0

if ! grep -q "applyCompanyFilter" "$file_path"; then
  jq -n --arg f "$file_path" '{
    decision: "block",
    reason: (
      "\($f) manages a company-scoped entity (companyId column present) but never calls " +
      "applyCompanyFilter. CLAUDE.md/security.md: every list/get query on a company-scoped " +
      "entity must be filtered. Add it inside getSelectQuery (getById/getByIds only call this " +
      "hook, not getExtraManipulateQuery — putting the filter there alone leaves single-record " +
      "reads unscoped):\n" +
      "  applyCompanyFilter(query, { isCompanyFeatureEnabled: bootstrapAppConfig.enableCompanyFeature, entityAlias }, user)\n" +
      "If this service intentionally reads across companies (e.g. a super-admin report), add a " +
      "`// company-filter: exempt — <reason>` comment instead of a filter call."
    )
  }'
  exit 0
fi

exit 0
