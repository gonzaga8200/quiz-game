---
name: publish-questions
description: Commit, push and open a pull request for new or changed quiz question files in data/questions/ (Contrarreloj). Use after add-questions, or when asked to "publica las preguntas" or "haz el commit, el push y la PR de las preguntas". Checks the git identity, validates, follows Conventional Commits and stops at the open PR. It never merges and never imports to Firestore.
argument-hint: '[file ...] [--no-release]'
allowed-tools: Read, Glob, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git remote:*), Bash(git fetch:*), Bash(git config user.name), Bash(gh auth status:*), Bash(gh pr view:*), Bash(gh pr checks:*), Bash(npm run questions:validate:*)
---

# Publish questions as a pull request

Turns the question files already written in `data/questions/` (usually by `add-questions`) into
an open pull request. It does not write or edit questions: if something is wrong with a
question, send the user back to `add-questions`.

Parameters (all optional): the file(s) to publish (default: the new or modified
`data/questions/*.json` that git reports) and `--no-release` (see step 5).

## Workflow

1. **Check the identity.** The owner in `git remote get-url origin` must be the same GitHub
   login as `git config user.name`, and `gh auth status` must show that account as the active
   one. If not, stop and tell the user which accounts you see. Never change git config or
   switch accounts yourself.
2. **Find what to publish.** `git status --porcelain -- data/questions/`. Only question files
   go in this PR. If other files are modified, leave them alone and say so. If there is
   nothing to publish, stop.
3. **Validate.** `npm run questions:validate`. Any error: stop and report it. Warnings go into
   the "Para revisar" section of the PR.
4. **Branch.** If you are on `main`, make sure it is not behind `origin/main` and create
   `feat/questions-<slug>` from it (`<slug>` from the file name, for example
   `historia-y-geografia`; with `--no-release` use `chore/questions-<slug>`). If that branch
   name already exists locally or on `origin`, add a suffix (`-2`). If you are on another
   branch, check with `gh pr view` whether its PR is already merged or closed: if so, it is a
   leftover, so go back to `main` and branch from there; otherwise keep working on it.
5. **Commit.** Stage the question files **by name** and commit with a Conventional Commit in
   English, in the style of the history (number, category, topic; lower case, no final
   period), for example:
   `feat(questions): add 40 Historia y Geografía questions on the early Middle Ages`.
   - `feat(questions)` is the default. It makes release-please open a release PR, and that is
     what we want: `data/questions/*.json` is also bundled in the app as the offline fallback
     (`app/utils/bundled-questions.ts`), so a release is the only way to update that fallback.
   - With `--no-release` use `chore(questions)`. release-please ignores it; the fallback bank
     then updates with the next release.
   - Follow the commit attribution rules of the session.
6. **Push.** `git push -u origin <branch>`. Never force.
7. **Pull request.** If the branch already has an open PR (`gh pr view`), the push updated it:
   report it and stop. Otherwise `gh pr create --base main` with the commit title as title and
   a body in Spanish with this structure (there is no PR template):
   - `## Qué añade`: the file, how many questions per category and difficulty, the topics, how
     they were made (`add-questions`, from which file names) and the validator result.
   - `## Para revisar`: every fact flagged by `add-questions` (doubtful facts, distractors
     written from memory, difficulties lowered) and the validator warnings. "Nada" if there is
     none.
   - `## Después de fusionar`: the import is done by the person with credentials, with
     `/import-questions` or `FIREBASE_PROJECT_ID=<proyecto> npm run questions:import`.
   - Finish with the PR attribution line of the session.
8. **Report.** Branch, commit, PR URL and the checks as they are now (`gh pr checks`; do not
   wait for them). Next steps for the user: review and merge the PR on GitHub, then run
   `/import-questions`. Unless `--no-release` was used, mention that release-please will open
   or update the release PR.

## Never

- Merge, auto-merge or approve the PR. Merging is always the user's decision.
- Import to Firestore, or read or write credentials.
- Force-push, skip hooks (`--no-verify`), rewrite published commits or delete branches.
- Use `git add -A` or `git add .`, or stage anything that is not a question file. Never stage
  `question-sources/` (git-ignored on purpose) or `.env*`.
- Change the content of a question, or the git identity.
- Put local folder paths or private names in the commit or the PR: the repository is public.
