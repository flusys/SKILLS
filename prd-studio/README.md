# PRD Studio

A visual PRD builder: define modules, entities, relations, state machines, and UI specs on a
canvas, get a live completeness check against `prd-generator`'s own consistency rules, and export
`docs/prd-bootstrap.md` + `docs/prd-feature-<nn>-<name>.md` files that `/bootstrap` and
`/develop-feature` consume completely unchanged.

**Why:** the previous flow's only intake path was natural language → an LLM inferring structure →
free-hand markdown. That single choke point is where relations lost their inverse side, fields
went unclassified as exposed/hidden, and state machines got skipped. This tool moves structure
enforcement into an editor and turns export into a deterministic render — no LLM in that step, so
nothing gets paraphrased or dropped on the way out.

## Shape of the project

One Angular CLI project at the root — `angular.json` and `package.json` live here exactly like
they do in `dashboard/`, and `src/app/` is the Angular app. `server/` sits alongside as plain
Node/TypeScript (run with `tsx`, not part of `ng build`): the Zod schema, the deterministic
markdown renderer/parser, the completeness linter, and the small Express API. One `package.json`,
one `node_modules`, one repo — but still two runtimes, because a browser has no filesystem access
of its own: the Angular app can't read or write `docs/*.md` directly, so `server/` does that and
the app talks to it over `fetch('/api/...')`. `src/app/services/factory.ts` and a few other files
type-import directly from `server/schema/*.ts` (not the zod runtime — see `constants.ts`'s own
comment) so the model's shape is never hand-duplicated between the two.

## Status: functional end to end

All five phases from the original roadmap are built and have been driven in a real headless
browser (Playwright), not just unit-tested:

1. **Schema** (`server/schema/`) — Zod schemas + inferred TypeScript types for `BootstrapPrd` and
   `FeaturePrd`, a structured mirror of every section in `.claude/skills/prd-generator/SKILL.md`
   Steps 3 & 4. Fields the old template let slip through a paragraph (response-field exposure, an
   entity's company-scoping mode, a state machine's reject/resubmit semantics) are required keys
   here instead of optional prose.
2. **Render** (`server/render/`) — deterministic JSON → markdown, no LLM, reproducing the exact
   table/section shape the two skills already parse. Round-trip verified: render → parse
   reproduces the original model exactly (`npm run roundtrip:test`).
3. **Parse** (`server/parse/`) — reverse-parses an existing `docs/prd-*.md` back into the model, so
   an already-exported PRD can be reopened and edited instead of being a write-only export target.
4. **Lint** (`server/lint/rules.ts`) — Step 5 of the prd-generator SKILL re-implemented as
   executable rules (nav entries without a matching module, a module needing a package that isn't
   selected, `enableCompanyFeature` inconsistent with a company-scoped entity, duplicate permission
   keys, dependency-order violations and stale slug references, unclassified response fields, …),
   run continuously against the draft rather than once at the end.
5. **API** (`server/api/`) — a small Express server: `GET/PUT /api/draft`, `GET /api/lint`,
   `POST /api/import` (reads `docs/*.md` from a target directory into the model),
   `POST /api/export` (validates against the schema, then the linter, then renders + writes
   `docs/*.md` — `force: true` can only bypass lint-rule warnings, never a genuine schema gap,
   since there's nothing valid to render for a field that's still empty).
6. **Web app** (`src/app/`) — Angular 22 (standalone, signals, zoneless) using real `@flusys/ng-ui`
   components (`f-select`, `f-checkbox`, `f-card`, `f-inputnumber`, `f-toast`/`ConfirmationService`,
   …) so the tool looks and behaves like the rest of the FLUSYS stack, not a bespoke one-off. Only
   `@flusys/ng-core` + `@flusys/ng-ui` are registered — no auth/iam/storage/localization, no SSR,
   no router; this app has no backend dependency beyond the small local Express API. The draft is
   a signal (`DraftStoreService`), mutated in place and `touch()`-ed to renotify; unlike a
   hand-rolled DOM rebuild, Angular's signal-driven change detection only re-renders the bindings
   that actually changed, so there's no scroll/focus-loss class of bug to work around. The canvas
   is still hand-rolled SVG (`canvas/canvas-renderer.ts`, framework-agnostic) wrapped in a thin
   `CanvasComponent`, with an auto-fit viewBox so it never leaves a tiny cluster of nodes stranded
   in an otherwise-empty pane. The whole shell is responsive — three breakpoints (desktop/tablet/
   mobile) via named CSS grid areas in `app.component.css`, not fluid-only sizing.

## Running it

```bash
cd prd-studio
npm install
npm run dev
```

`dev` runs both processes at once (via `concurrently`, labeled `[api]`/`[web]` in one terminal):
the Express API on :4001 (reads/writes `docs/*.md`, keeps the in-progress draft in
`.data/draft.json`) and `ng serve` on :5173 (proxying `/api` to :4001 — see `proxy.conf.json`).
They're still two separate Node processes under the hood — a browser can't touch the filesystem
itself, so the API has to run somewhere — `dev` just launches both with one command instead of
two terminal tabs. Run them separately (`npm run api` / `npm start`) if you want independent
restart/log control, e.g. while iterating on just the API.

Open http://localhost:5173. Type a target project's absolute path into the top bar to Import an
existing `docs/prd-bootstrap.md` (+ any `docs/prd-feature-*.md`) into the editor — that field is
remembered in localStorage, so it survives a page reload — or start from the blank Bootstrap tab
and add modules from the sidebar. The Completeness panel on the right updates as you edit
(debounced ~500ms); Export is still allowed with warnings outstanding but prompts for confirmation
on blocking issues, and refuses outright (no confirmation offered) when required fields are still
empty.

### Verifying without opening a browser

```bash
npm run server:typecheck
npm run roundtrip:test      # render -> parse -> identical model
npm run render:example      # writes example-output/docs/*.md from a worked Invoicing example
npm run build                # ng build — production bundle, ~267KB gzipped transfer

npm run e2e                  # Playwright: fills forms, adds a module/entity, renames it, checks lint
npm run e2e:import           # Playwright: imports an on-disk PRD and checks the canvas reconstructs it
npm run e2e:export           # Playwright: import -> export round-trip through the real Export button, byte-identical output
npm run e2e:responsive       # Playwright: screenshots at desktop/tablet/mobile widths
npm run e2e:target-dir       # Playwright: the target-directory field survives a page reload
npm run e2e:rename           # Playwright: a module's name/slug can be edited after creation
```

All `e2e*` scripts need both servers already running (see above) and a Chromium binary
(`npx playwright install chromium` once). Each assumes a clean draft — either run them one at a
time, or `rm -f .data/draft.json` before each (they don't reset it for you, since state carrying
over between manual clicks in the browser is the whole point the rest of the time).

## Package layout

```
prd-studio/
  angular.json, tsconfig.json, tsconfig.app.json, proxy.conf.json, .postcssrc.json
                        Angular CLI project files, at the root exactly like dashboard/'s own
  src/                  the Angular app
    tailwind.css, index.html, main.ts
    app/
      app.config.ts         provideZonelessChangeDetection + provideNgUI — only ng-core/ng-ui,
                             nothing product-specific (no auth/iam/storage/localization/SSR)
      app.component.*       shell: sidebar, top bar, responsive 3-breakpoint grid (app.component.css)
      services/
        draft-store.service.ts  the draft as a signal; touch() renotifies after in-place mutation
        api.service.ts          fetch wrappers to the local Express API (no HttpClient needed)
        factory.ts               shaped-but-empty model constructors for "add module"/"add entity"
      canvas/
        canvas-renderer.ts      framework-agnostic SVG (auto-fit viewBox, drag, click-to-select)
        canvas.component.ts     thin Angular wrapper — ViewEncapsulation.None, since the SVG is
                                 injected via raw DOM APIs and never gets Angular's scoping attribute
        layout.ts                canvas node positions — client-only (localStorage), never sent to the API
      panels/           bootstrap-panel, feature-panel, entity-inspector, lint-panel components
  server/               plain Node/TypeScript (tsx), not part of `ng build`
    schema/     BootstrapPrd, FeaturePrd — Zod schemas + inferred types (constants.ts has no
                zod import, so the Angular app can use PACKAGE_KEYS etc. without the validation
                runtime in its bundle)
    render/     JSON -> markdown renderers (deterministic, no LLM)
    parse/      markdown -> JSON reverse-parsers
    lint/       Step 5 consistency checklist as executable rules
    api/        Express server: draft storage, lint, import, export
    examples/   a worked Invoicing example — render:example and roundtrip:test run against it
  e2e/                  Playwright scripts, run against the two dev servers above
    e2e-smoke.mjs               fills forms, adds a module/entity, renames it, checks lint
    e2e-import.mjs              import round-trip through the real UI
    e2e-export.mjs              import -> export through the real Export button
    e2e-responsive.mjs          screenshots at desktop/tablet/mobile widths
    e2e-target-dir-persist.mjs  target directory survives a page reload
    e2e-rename-module.mjs       a module's name/slug can be edited after creation
```

## Fixed after first real use

Bugs that only surfaced once a person (not just type-checking or automated smoke tests) actually
clicked around — worth naming so the pattern doesn't repeat.

**From the current Angular + `@flusys/ng-ui` build:**

- **ng-ui icons are Lucide names, not PrimeIcons.** Every `icon="pi pi-trash"`-style binding threw
  `Unable to resolve icon` at runtime (visible only in the browser console, not the type checker,
  since `icon` is typed `string`) — ng-ui's `icon` input resolves through a `LucideDynamicIcon`, so
  it wants plain names like `trash-2`, `plus`, `x`, matching the same convention the bootstrap
  PRD's own Navigation Menu table already uses (`icon: string.min(1, "a lucide.dev icon name")`).
- **The Angular dev server needs its own proxy config.** `ng serve` doesn't read Vite's
  `vite.config.ts` proxy settings — without `proxy.conf.json` wired into `angular.json`'s `serve`
  options, every `/api/*` call 404'd into `index.html` and failed to parse as JSON, silently
  breaking load/save/lint/import/export with no compile-time signal at all.
- **`f-select`'s `options` input is `unknown[]` (mutable), not `readonly unknown[]`.** Declaring
  option lists with `as const` (`["FULL", "RBAC", "DIRECT"] as const`) fails to bind — TS4104,
  "readonly cannot be assigned to mutable type." Fixed by declaring them as plain `string[]` and
  widening the handler signatures that consumed the narrower literal type to `string`.
- **Two-call union narrowing doesn't work in a template.** `store.activeTab().kind === 'feature' &&
  store.activeTab().slug === f.slug` fails to compile — TypeScript narrows within one expression,
  not across two separate calls to a signal getter that could theoretically diverge between them.
  Fixed with a component method (`isActiveFeatureTab(slug)`) that reads the signal once.
- **A raw-DOM-injected SVG never gets Angular's view-encapsulation attribute.** The canvas SVG is
  built with `document.createElementNS`, not Angular's template compiler, so emulated
  encapsulation's `_ngcontent-*` marker — which its style-scoping selectors are rewritten to
  require — never lands on it; a normal component stylesheet silently fails to match anything
  inside. `CanvasComponent` uses `ViewEncapsulation.None` deliberately, because styling injected
  DOM is its entire job.
- **The default production bundle budget (2–3MB) doesn't fit a real `ng-ui` app.** Even with only
  `ng-core`/`ng-ui` registered, the full component library plus `chart.js` (an ng-ui peer
  dependency, pulled in even though nothing here uses `f-chart`) raw-bundles to ~6.3MB — a
  reasonable ~267KB gzipped transfer, but over Angular's default error budget. Raised to match
  `dashboard/angular.json`'s own 4MB/8MB rather than inventing a new threshold.
- **The target-directory field had no persistence.** It lived in a plain in-memory signal, so
  every page reload silently cleared it back to empty — the next Import/Export click just said
  "Set a target directory first" with no hint that the field used to be filled in. Now remembered
  in localStorage (`e2e:target-dir` verifies it survives a reload).
- **A module's name/slug had no editing UI at all**, discovered during a dead-code audit:
  `DraftStoreService.renameFeatureSlug()` existed, fully implemented, and was never called from
  anywhere — the Angular rewrite ported the method but never added the form field that would call
  it, so a module was stuck as "New Module 1"/`module-1` forever once created. Rather than delete
  the "unused" method, added the missing "Module" card (name + slug fields) to the feature panel.
  While wiring it up, also found the rename didn't cascade into *other* modules' `dependsOn` /
  `requiredBefore` lists or the bootstrap-level development-order list — fixed, and the linter
  now flags a `dependsOn` pointing at a slug that doesn't exist, instead of silently no-op'ing the
  development-order check when it can't find a match (`e2e:rename` covers the UI path end to end).

**From the original vanilla-JS build**, superseded by the Angular rewrite but worth remembering
as a class of bug: a generic "editable table" component that always showed an "+ Add row" button
regardless of whether the underlying list was supposed to be fixed-size (letting you add a
nonsense 10th row to a table meant to hold exactly nine known package keys), and zod validation
messages that were accidentally UI placeholder hints instead of actual error text (`"e.g. School"`
surfacing as if it were the reason a field was invalid, rather than an example of what to type).
Both are fixed in the current schema regardless of frontend — see `server/schema/*.ts`.

**From merging the two npm packages into one Angular-CLI-rooted project:** every relative
type-import from `src/app/**` into `server/schema/*.ts` had to shift by exactly one `../` (the old
two-package layout had an extra `web/` nesting level) and `src/schema` → `server/schema` — easy to
get subtly wrong file-by-file, so this was done with `sed` across every affected file in one pass
and confirmed with a full `ng build` afterward rather than trusting each edit individually.

## Known one-way fields

Two things are Studio-only editor metadata with no column in the markdown template, so they're
lost on export → reimport (confirmed by `roundtrip:test`'s explicit normalization, not a parser
bug): a feature module's human display name (bootstrap only ever renders its file path — the name
is recoverable by cross-referencing the feature PRD's own title, which the API's `/api/import`
does when loading feature files, just not in the schema-only round-trip test) and a nav entry's
`moduleSlug` link (the linter downgrades this to a warning, not blocking, prompting you to relink
after a reimport).

If a future `prd-generator` edit changes the markdown shape, update the matching
schema/render/parse here in the same change — this package has no independent authority over the
format, it mirrors the skill.
