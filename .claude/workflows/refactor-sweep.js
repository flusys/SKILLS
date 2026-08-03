export const meta = {
  name: 'refactor-sweep',
  description: 'Refactor every file under a folder in parallel, one subagent per file, following the /refactor skill rules',
}

const folder = (args && args.folder) || '.'

const found = await agent(
  `List every source file under "${folder}", recursively, as repo-relative paths. ` +
  'Exclude node_modules, .git, dist, .angular, coverage, *.log, and lockfiles. Sort alphabetically.',
  {
    model: 'haiku', // mechanical file listing — no judgment call
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string' } },
      },
    },
  },
)

const results = await pipeline(found.files, file =>
  agent(
    'Read .claude/skills/refactor/SKILL.md and follow it exactly, scoped to exactly one file: ' +
    `${file}\n\n` +
    'Fix only: real bugs, security issues, dead code, broken FLUSYS patterns, redundancy, and ' +
    'reinvented base-class logic. Do not touch formatting, naming preferences, or working-but-' +
    'not-optimal code. Reply with one line: the file path, then what changed, or "no changes".',
    { label: file, model: 'haiku' }, // same shape as code-reviewer's read+report pass
  ),
)

return results.filter(Boolean)
