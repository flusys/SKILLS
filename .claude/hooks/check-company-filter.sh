#!/bin/bash
# Backstop for the CLAUDE.md/security.md CRITICAL rule: every list/get query on a company-scoped
# entity must call applyCompanyFilter, and it must do so from getSelectQuery specifically —
# getById/getByIds only ever invoke that hook, not getExtraManipulateQuery (getAll-only).
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

total_calls=$(grep -c "applyCompanyFilter" "$file_path")

if [ "$total_calls" -eq 0 ]; then
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

# The call exists somewhere in the file — but "somewhere" isn't enough. It has shipped for real in
# getExtraManipulateQuery alone (getAll-only), leaving getById/getByIds fetch-by-UUID completely
# unscoped for another company's row. Extract the getSelectQuery method body (from its signature to
# the next sibling method/constructor at the same indent) and require the call to appear there too.
select_block=$(awk '
  /getSelectQuery *\(/ { print; infn=1; next }
  infn && /^[ \t]*(protected|public|private|constructor)/ { infn=0 }
  infn { print }
' "$file_path")

calls_in_select=0
if [ -n "$select_block" ]; then
  calls_in_select=$(grep -c "applyCompanyFilter" <<<"$select_block")
fi

if [ "$calls_in_select" -eq 0 ]; then
  jq -n --arg f "$file_path" '{
    decision: "block",
    reason: (
      "\($f) calls applyCompanyFilter somewhere, but not inside getSelectQuery — either " +
      "getSelectQuery is missing entirely, or the call sits in getExtraManipulateQuery/another " +
      "hook instead. getExtraManipulateQuery only fires for getAll; getById/getByIds call " +
      "getSelectQuery exclusively, so this shape leaves single-record fetch-by-UUID completely " +
      "unscoped for another company'\''s row even though getAll looks correctly filtered. This " +
      "exact shape has shipped as a live cross-tenant leak before. Move (or add) the " +
      "applyCompanyFilter call inside getSelectQuery:\n" +
      "  applyCompanyFilter(query, { isCompanyFeatureEnabled: bootstrapAppConfig.enableCompanyFeature, entityAlias }, user)\n" +
      "If this service intentionally reads across companies (e.g. a super-admin report), add a " +
      "`// company-filter: exempt — <reason>` comment instead."
    )
  }'
  exit 0
fi

exit 0
