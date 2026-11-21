---
name: question-pipeline
description: Run the whole Contrarreloj question workflow in order - generate questions (add-questions), publish them as a pull request (publish-questions) and load them into Firestore (import-questions) - pausing for the user at each point that matters. Use when asked for "el pipeline de preguntas", "crea las preguntas y súbelas" or "haz todo el flujo". Without arguments it converts the ready-made JSON in question-sources/ (questions that already carry their category, difficulty and explanation). With arguments it takes the same ones as add-questions, plus --no-release.
argument-hint: '[none: use the ready-made JSON in question-sources/] | [same arguments as add-questions] [--no-release]'
allowed-tools: Read, Glob, Bash(git status:*), Bash(git branch:*), Bash(git remote:*), Bash(git config user.name), Bash(gh auth status:*), Bash(gh pr view:*)
---

# Question pipeline

Chains three skills, each one doing one job:

| Step     | Skill               | What it does                                    | Writes outside the repo? |
| -------- | ------------------- | ----------------------------------------------- | ------------------------ |
| Generate | `add-questions`     | Writes and validates the JSON, shows the review | No                       |
| Publish  | `publish-questions` | Branch, commit, push and open the PR            | GitHub (a PR)            |
| Import   | `import-questions`  | Loads the merged questions into Firestore       | Firestore (production)   |

## Two ways to start

- **No arguments** (the user just runs `/question-pipeline`, or only `--no-release`): the
  questions already exist. They are in a JSON file in `question-sources/`, each one with its
  own category, difficulty and explanation. Nothing is generated and no difficulty is worked
  out: step 1 only converts that file (add-questions style E, `--prepared`) and each question
  lands in the file of its own category. If `question-sources/` has no `.json` file, say so and
  ask the user what they want; do not make up questions.
- **With arguments** (a number, a category, a difficulty, source material...): as before, step 1
  generates the questions with `add-questions`.

This skill only coordinates. It runs in the main conversation on purpose, so the user can
answer, edit and stop between steps. Run each step with the Skill tool, passing the arguments
that belong to it.

There are **three pauses**, and none of them can be skipped, not even when the user says "hazlo
todo": the repository's rule is that a person reviews the questions before they go live.

## Workflow

0. **Preflight.** Stop before generating anything if one of these fails, and say which:
   - `gh auth status` shows an active account and it matches the owner of `origin` and
     `git config user.name` (the same check as `publish-questions`).
   - `.firebaserc` exists and has a default project. Tell the user which one will be the target.
   - `FIRESTORE_EMULATOR_HOST` is not set in the environment. If it is, warn that the import
     would go to the emulator.
   - Remind the user that the import needs `gcloud auth application-default login` done with
     the account that owns the project, so they can do it now instead of at the end.
1. **Generate.** Run `add-questions` with the user's arguments; with no arguments, run it with
   `--prepared` (convert only, see above). It writes `data/questions/<date>-<category>.json`
   (one file per category when converting a JSON that mixes several), validates it and prints
   the review table. If it wrote nothing (it asked a question, found problems in the JSON, or
   no question survived), stop here and tell the user what is needed.
2. **Pause 1: review.** Ask (AskUserQuestion): publish, "I want to edit the JSON first" or stop.
   If the user edits, wait, run `npm run questions:validate` again, and ask again.
3. **Publish.** Run `publish-questions` (pass `--no-release` if it was given). It ends with an
   open PR and its URL. When the questions came from a ready-made JSON, the PR body should say
   so, and its "Para revisar" section lists the validator warnings (the content is the
   author's, not checked by Claude).
4. **Pause 2: merge.** Tell the user to review and merge the PR on GitHub, and ask whether it is
   already merged or whether to stop and import later with `/import-questions`. When they say
   it is merged, check it with `gh pr view <number> --json state,mergedAt`. If it is not
   `MERGED`, say so and ask again. Never merge it yourself.
5. **Pause 3: import.** Run `import-questions`. It does the dry run and asks the user for the
   explicit confirmation before writing to the real project. Do not ask a second time here, and
   do not answer for the user.
6. **Final report.** In a few lines: the file, the PR, the project and the number of questions
   written. Unless `--no-release` was used, remind them that release-please will open or update
   the release PR, and that merging it deploys the web with the updated fallback bank (players
   already get the questions from Firestore).

## If it stops halfway

Every step can be run on its own, so the user resumes where it stopped: a PR already open or
merged goes straight to `/import-questions`, an unpublished file goes to `/publish-questions`.
Say which one in the final message when the pipeline is cancelled.

## Never

- Skip, merge or answer a pause on the user's behalf.
- Do the work of a step yourself. The rules of each step live in its own skill; run the skill.
- Run `npm run questions:import` outside `import-questions`.
