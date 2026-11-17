---
name: import-questions
description: Load the approved quiz questions from data/questions/ into Firestore (Contrarreloj) with npm run questions:import. Use when asked to "importa las preguntas" or "súbelas a Firestore", after the question PR is merged. Always does a dry run first and asks for explicit confirmation before writing to the real project. It never creates or edits questions and never touches credentials.
argument-hint: '[file ... | all] [--project <id>]'
allowed-tools: Read, Glob, Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(git branch:*), Bash(gh pr view:*), Bash(npm run questions:validate:*)
---

# Import questions into Firestore

The only skill that writes to Firestore, and the only step of the question workflow that
cannot be undone with a revert: it changes the real database the players read from. Handle it
as such. The import script is idempotent (each question goes to the document named after its
`id`), so a repeated import updates in place and never duplicates.

Parameters (all optional): the files to import, or `all` for the whole folder, and
`--project <id>`.

## Workflow

1. **Start from a merged `main`.** The repository is the source of truth, so Firestore must
   never hold questions that are not in `main`. Check that the current branch is `main`, that
   the tree is clean and that `main` is up to date (`git status`; ask the user to pull, or
   pull with `git pull --ff-only` if they agree). If the question PR is not merged yet, stop
   and say so. Import from another branch only if the user explicitly asks, and say what that
   means.
2. **Choose the files.** Default: the question files of the latest commit that touched
   `data/questions/`, that is, the squash-merged PR. Find it with
   `git log -1 --format=%H -- data/questions/` and list its files with
   `git show --name-only --format= <hash>`. If the user passed files, use those. With
   `all`, import the whole folder: that rewrites **every** question in the bank with the
   repository version. Show the list and why you chose it.
3. **Choose the project.** Use `--project` if given; otherwise read `projects.default` from
   `.firebaserc`. Never invent a project. If `FIRESTORE_EMULATOR_HOST` is set in the
   environment, the import goes to the local emulator, not to production: tell the user.
4. **Validate.** `npm run questions:validate`. Any error: stop.
5. **Dry run.** `npm run questions:import -- --project <id> --dry-run [files]`. Show what it
   would write: number of questions, files, target and the first ids. The dry run needs no
   credentials. Expect one approval prompt for it: `.claude/settings.json` asks for approval
   on every `questions:import` command on purpose.
6. **Ask for confirmation.** In the conversation (AskUserQuestion), state the project, the
   number of questions and the files, and ask whether to write them now. Only an explicit yes
   continues. Anything else cancels and nothing is written.
7. **Import.** `npm run questions:import -- --project <id> --yes [files]`. `--yes` is needed
   because the tool has no interactive terminal, and it is allowed only because step 6 already
   got the user's confirmation. Never add it before that.
8. **If it fails with credentials** ("Could not authenticate", `PERMISSION_DENIED`): tell the
   user to run `! gcloud auth application-default login` with the account that owns the
   project, then try again from step 7 with their confirmation still valid. If the error is
   about permissions after logging in, that account has no write access to the project. Say so
   and stop.
9. **Report.** Project, number of questions written, and the reminders that matter:
   - Re-running is safe. To retire a question, set its `"status"` to `"disabled"` and import
     again.
   - Players get the questions from Firestore (cached up to an hour in their browser). The
     fallback bank bundled in the app only changes with the next deploy.

## Never

- Run the import without the confirmation of step 6, or against a project nobody named.
- Create, read, move or print credentials, tokens or service-account keys, or set
  `GOOGLE_APPLICATION_CREDENTIALS`. Authentication is always the user's own, outside the repo.
- Create or edit questions, or change `status` on your own. That belongs to `add-questions`
  and to the user.
- Commit, push or open pull requests. That belongs to `publish-questions`.
