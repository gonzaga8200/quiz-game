<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LEGAL } from '~/content/legal'
import { questionReportHref } from '~/utils/feedback'

const props = defineProps<{ open: boolean; questionId: string; questionText: string }>()
const emit = defineEmits<{ close: [] }>()

// The link opens the mail app with the question already in the message. The dialog closes as
// the link is followed, and the game carries on.
const href = computed(() =>
  questionReportHref(LEGAL.email, { id: props.questionId, text: props.questionText }),
)

// A native <dialog>: it traps focus and closes with Escape. The parent learns about every close
// through `close`, so the game resumes whichever way the dialog is dismissed.
const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    const el = dialog.value
    if (!el) return
    if (isOpen && !el.open) {
      if (typeof el.showModal === 'function') el.showModal()
      else el.setAttribute('open', '')
    } else if (!isOpen && el.open) {
      if (typeof el.close === 'function') el.close()
      else el.removeAttribute('open')
    }
  },
)
</script>

<template>
  <dialog
    ref="dialog"
    class="report"
    aria-labelledby="report-title"
    aria-describedby="report-hint"
    @close="emit('close')"
  >
    <div class="report__body">
      <h2 id="report-title" class="report__title">Reportar esta pregunta</h2>
      <p id="report-hint" class="report__hint">
        La partida está en pausa. Se abrirá tu correo con la pregunta ya escrita: añade lo que veas
        y envíalo desde allí.
      </p>
      <blockquote class="report__question">{{ questionText }}</blockquote>
      <div class="report__actions">
        <a class="btn btn--primary btn--large report__send" :href="href" @click="emit('close')">
          Abrir mi correo
        </a>
        <button type="button" class="btn btn--secondary" @click="emit('close')">Cancelar</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.report {
  width: min(34rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  margin: auto;
  padding: 0;
  border: 2px solid var(--oro-sombra);
  border-radius: var(--radius-card);
  background: var(--nogal-alto);
  color: var(--crema);
  box-shadow: 0 24px 60px rgb(0 0 0 / 0.55);
}

.report:not([open]) {
  display: none;
}

.report::backdrop {
  background: rgb(10 5 2 / 0.65);
}

.report__body {
  display: grid;
  gap: 0.875rem;
  padding: 1.25rem;
}

.report__title {
  font-size: 1.75rem;
  color: var(--oro-claro);
}

.report__hint {
  font-size: 0.9375rem;
  color: var(--crema-suave);
}

.report__question {
  margin: 0;
  padding: 0.625rem 0.875rem;
  border-left: 3px solid var(--oro);
  color: var(--crema);
  font-family: var(--font-display);
  font-style: italic;
  font-size: 1.0625rem;
  line-height: 1.4;
}

.report__actions {
  display: grid;
  gap: 0.75rem;
}

.report__send {
  text-decoration: none;
}

@media (min-width: 30rem) {
  .report__actions {
    grid-template-columns: auto auto;
    justify-content: start;
  }
}
</style>
