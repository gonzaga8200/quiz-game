---
name: question-stats
description: Show an on-screen report of the Contrarreloj question bank: how many questions there are in total, how many and what percentage per category, and the same per difficulty. Use whenever the user asks "cuántas preguntas tenemos", "dame el reporte / las estadísticas / el estado del banco", "cómo está el reparto por categoría o dificultad", "qué porcentaje es de cada nivel" or wants to know where the bank is unbalanced, even if they do not say "report". Read-only: it never edits questions or touches Firestore.
allowed-tools: Bash(npm run questions:stats:*)
---

# Question stats

Prints the state of the bank in `data/questions/`: the total, then the count and the share of
the total for every category and for every difficulty. It reads the repository files, not
Firestore, so it shows what `main` holds (Firestore matches it after an import).

## Workflow

1. Run `npm run questions:stats`. By default it counts only **active** questions, the ones the
   game serves, and says how many disabled ones it left out. If the user asks for the whole
   file contents, "con las desactivadas" or "todas", run `npm run questions:stats -- --all`.
2. Show the output **as it is**, in a code block, so the columns stay aligned. Do not rebuild
   the tables by hand: the script already does the math, and a second calculation can drift.
3. Add two or three lines after it, only about what the numbers say: the category or
   difficulty that dominates, and the ones that are empty or almost empty. Say that categories
   with few questions repeat more often in play. Do not propose creating questions unless the
   user asks.

If the script fails with errors about a file, show them and suggest `npm run questions:validate`;
do not fix question files from this skill.

## Never

- Edit, add or disable questions, or import anything. This skill only reads.
