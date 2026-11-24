<script setup lang="ts">
import ContactOptions from '~/components/feedback/ContactOptions.vue'
import { LEGAL } from '~/content/legal'

useHead({ title: 'Contacto' })
useSeoMeta({
  description:
    'Escríbenos una sugerencia o avísanos de una pregunta con una respuesta incorrecta. Se abre tu correo con el asunto listo.',
})
</script>

<template>
  <main id="main" tabindex="-1" class="contact">
    <header class="contact__intro">
      <h1 class="contact__title">¿Tienes una sugerencia o has visto algo raro?</h1>
      <p>
        Nos importa lo que opinas. Elige el motivo: se abrirá tu correo con el asunto ya escrito y
        tú pones el resto. Lo leemos todo.
      </p>
    </header>

    <ContactOptions />

    <p class="contact__mail">
      ¿Prefieres escribir tú el asunto? Escríbenos a
      <a :href="`mailto:${LEGAL.email}`">{{ LEGAL.email }}</a>.
    </p>
  </main>
</template>

<style scoped>
.contact {
  display: grid;
  gap: 1.75rem;
  margin-top: 0.75rem;
}

.contact__intro {
  display: grid;
  gap: 0.75rem;
  max-width: 36rem;
}

.contact__title {
  font-size: clamp(2rem, 8vw, 2.75rem);
  color: var(--oro-claro);
  text-shadow: 0 2px 0 rgb(0 0 0 / 0.5);
}

.contact__intro p {
  color: var(--crema-suave);
  font-size: 1.0625rem;
}

.contact__mail {
  color: var(--crema-suave);
}

.contact__mail a {
  color: var(--oro-claro);
  font-weight: 700;
}
</style>
