# Ildi Sudoku Kertje live — agent entrypoint

## Ownership and authority

This repository is the static publication target for Ildi Sudoku Kertje: [game page](index.html) and [development status](status.html).
Product logic, generators, UI, tests and publishing tools belong to [ildi-sudoku-kertje](../ildi-sudoku-kertje/AGENTS.md). Develop fixes there; do not fork behavior into the copied source files or hand-edit generated HTML here.
Forgejo `bridgeadmin/ildi-sudoku-kertje-live` (`origin`) is primary development Git; GitHub `attilaroszjar/ildi-sudoku-kertje-live` (`github`) is secondary Git and the historical Pages publication target.
Shared policy and infrastructure belong to [bridge-platform-infra](../bridge-platform-infra/AGENTS.md).

## Task routes

Read this entrypoint first, then only the applicable row. Paths into the sibling source repository are intentional; if unavailable, obtain that checkout before product work.
Source commands below run from `../ildi-sudoku-kertje`, never from this publication checkout.

| Task | Read next | Implementation / validation starting point |
| --- | --- | --- |
| Inspect published artifact or prepare an explicitly requested publication | Source [maintenance contract](../ildi-sudoku-kertje/docs/REPOSITORY_MAINTENANCE.md) | Inspect local [index](index.html) / [status](status.html); source [builder](../ildi-sudoku-kertje/scripts/build-standalone.mjs), [publisher](../ildi-sudoku-kertje/scripts/publish-ildi.mjs), [canonical gate](../ildi-sudoku-kertje/scripts/canonical-gate.mjs). `npm run test:canonical` rebuilds artifacts; publication is a separate authorized action. |
| Gameplay, generator, rendering, language or lifecycle defect | Source [task router](../ildi-sudoku-kertje/AGENTS.md), then its matching route | Source [runtime](../ildi-sudoku-kertje/games/sudoku-library.js), [app](../ildi-sudoku-kertje/assets/app.js); [solved-state regression](../ildi-sudoku-kertje/tests/solved-state-immutability.test.js). Use the source route's nearest test for the actual symptom. |
| Feedback or development-status discrepancy | Source [feedback queue](../ildi-sudoku-kertje/docs/ILDI_FEEDBACK_CURRENT.md) | Source [current work](../ildi-sudoku-kertje/data/current-work.json), [status builder](../ildi-sudoku-kertje/scripts/build-development-status.mjs), [backlog test](../ildi-sudoku-kertje/tests/development-status-backlog.test.js); `node --test tests/development-status-backlog.test.js`. Regenerate status through the approved publisher. |
| Brutal research pipeline | Source [research contract](../ildi-sudoku-kertje/server/brutal-search/README.md) | Source [pipeline](../ildi-sudoku-kertje/server/brutal-search/lib/phase-b-pipeline.js), [isolated test](../ildi-sudoku-kertje/tests/brutal-search-phase-b-pipeline.test.js); `node --test tests/brutal-search-phase-b-pipeline.test.js`. No database or worker action is implied. |
| Documentation / repository maintenance | Only the document being changed; [shared workflow](../bridge-platform-infra/server-docs/REPOSITORY_WORKFLOW_RULES.md) for Git or closure | Edit only the owning document. Copied iteration/audit docs are historical evidence; use the source router for current product scope. Validate links and whitespace as below. |

## Constraints

Preserve offline `file://` play, local assets, HU/EN behavior, deterministic puzzle replay and correctness/uniqueness contracts. The research server is separate from the player runtime.
UI changes require explicit user authorization. Publication, worker activation, migrations and infrastructure changes require their own explicit scope and applicable safety gates.
Keep the Brutal worker fail-closed, disabled/inactive; do not start it or expand search as part of publication or documentation work.
Keep credentials and private runtime values out of documentation, Git and diagnostic output; preserve persistent data and other tasks' worktrees.
DEV is the development/Codex environment; n8n is a runtime/deployment target. Git synchronization does not establish deployment. Read [environment identities](../bridge-platform-infra/server-docs/ENVIRONMENT_IDENTITIES.md) when crossing that boundary.

The local `scripts/publish-ildi.mjs` is a legacy copy: it checks for a GitHub-shaped `origin` and performs pull/commit/push. The source publisher also documents a GitHub live-target check, while this checkout has Forgejo `origin`.
Resolve that target mismatch under the source maintenance contract before any separately authorized publication; do not bypass checks, repoint remotes or run the copied publisher here.
Local source tests inspect copied modules and may assume a modular `index.html`; passing them would not prove the inline published page matches the current source or hosted site.

<!-- bridge-git-workflow:start -->
## Bridge Git workflow

For every Git operation, including inspection, read the installed `bridge-git-workflow` skill's `SKILL.md` and run its applicable safety checks.
Follow the [canonical workflow](../bridge-platform-infra/server-docs/REPOSITORY_WORKFLOW_RULES.md) for Git mutations and closure; never overwrite another task's changes.
Local Git checks do not prove remote synchronization, CI success or authorization to merge or deploy.
<!-- bridge-git-workflow:end -->

## Documentation validation and completion

Run `python3 /home/bridgedev/.agents/skills/bridge-docs-maintainer/scripts/check_repo_docs.py /home/bridgedev/bridge/ildi-sudoku-kertje-live`, then `git diff --check`; manually verify changed-document links and anchors beyond the entrypoint.
Documentation-only work needs no application tests unless it changes an executable contract. Report exact files, checks and unverified remote/runtime gates.
Honor local-only scope: do not commit, push, merge, deploy or activate a Skill when excluded by the task.
