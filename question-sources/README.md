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
