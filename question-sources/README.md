# question-sources

Drop here the material you want the `add-questions` skill to build questions from:

- **images** (`.png`, `.jpg`, `.webp`): notes, slides, book pages, tables, infographics;
- **PDFs** (`.pdf`);
- **plain text** (`.txt`, `.md`).

Then ask Claude Code, for example:

- "Crea 15 preguntas con `apuntes-historia.pdf`"
- "Usa la carpeta `question-sources` y hazme 20 preguntas de Ciencias"
- "10 preguntas difíciles a partir de `tabla-reyes.png`"

Everything is optional except the number of questions. If you do not give a difficulty, each
question gets its own, picked at random across the five levels. If you do not give a category,
it is inferred from the content.

Everything in this folder except this file is **git-ignored**: the material may be copyrighted
and the repository is public. The skill reads the files and never changes or deletes them. The
questions it writes go to `data/questions/`, and the `source` field only keeps the file name
(and page), never the file itself.

## Ready-made questions (JSON)

If you drop a `.json` file here whose questions already have their category, difficulty and
explanation (see `preguntas_cuerpo_humano.json` for the format), run `/question-pipeline` with
**no arguments**: nothing is generated or rebalanced, the file is converted as it is and each
question goes to the file of its own category. `npm run questions:convert -- --dry-run` shows
what would be written.

You can keep adding JSON files to the folder: each run converts only the ones that were not
converted before, and skips the rest (a file counts as converted when a question in
`data/questions/` has its file name as `source`). To convert a file again, rename it, or run
`npm run questions:convert -- --force`.
