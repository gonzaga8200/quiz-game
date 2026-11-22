<script setup lang="ts">
import { COPYRIGHT_NOTICE, LEGAL } from '~/content/legal'

// A legal page: useful to people, not something to rank. Links on it are still followed.
useHead({ title: 'Aviso legal', meta: [{ name: 'robots', content: 'noindex, follow' }] })
useSeoMeta({
  description:
    'Quién es el titular de Contrarreloj, a quién pertenecen sus contenidos y las condiciones de uso del juego.',
})
</script>

<template>
  <main id="main" tabindex="-1" class="policy">
    <header>
      <h1 class="policy__title">Aviso legal</h1>
      <p class="policy__meta">Última actualización: {{ LEGAL.lastUpdated }}</p>
    </header>

    <section aria-labelledby="titular">
      <h2 id="titular">Titular del sitio</h2>
      <p>{{ LEGAL.owner }}.</p>
      <LegalContact />
      <p>
        Contrarreloj es un juego de preguntas gratuito, sin publicidad y sin ánimo comercial. Para
        saber cómo tratamos tus datos y qué guardamos en tu navegador, consulta la
        <NuxtLink to="/cookies">política de cookies y privacidad</NuxtLink>.
      </p>
    </section>

    <section aria-labelledby="propiedad">
      <h2 id="propiedad">Propiedad intelectual</h2>
      <p>
        <strong>{{ COPYRIGHT_NOTICE }}. Todos los derechos reservados.</strong>
        El nombre Contrarreloj, su diseño, sus textos, sus ilustraciones, su código y el conjunto de
        preguntas y explicaciones del juego son obra de {{ LEGAL.holder }}, que conserva su autoría.
      </p>
      <p>
        No se permite copiar, reproducir, modificar ni distribuir el sitio o sus contenidos, ni
        presentarlos como propios, sin autorización previa y por escrito del titular. Sí puedes
        jugar, compartir tus resultados y citar fragmentos breves indicando la fuente.
      </p>
      <p>
        Los componentes de terceros, como Nuxt, Vue o Firebase, conservan sus propias licencias. Los
        nombres y marcas de terceros que aparezcan, como Google, pertenecen a sus respectivos
        titulares.
      </p>
    </section>

    <section aria-labelledby="uso">
      <h2 id="uso">Condiciones de uso</h2>
      <p>
        Puedes jugar gratis y sin registro. El modo competitivo requiere iniciar sesión con Google y
        publica tu nombre, tu foto y tu puntuación en el ranking; es solo para mayores de 14 años.
        Te pedimos que no uses el sitio para falsear el ranking, sobrecargar el servicio o intentar
        acceder a lo que no es público.
      </p>
      <p>
        Las preguntas se revisan con cuidado, pero pueden contener errores o quedarse desfasadas. El
        juego se ofrece tal cual, sin garantías, y no nos hacemos responsables de los daños que
        pudieran derivarse de su uso o de una interrupción del servicio.
      </p>
    </section>

    <section aria-labelledby="errores">
      <h2 id="errores">Errores y contenidos</h2>
      <p>
        Si encuentras una pregunta incorrecta, un contenido que vulnera tus derechos o cualquier
        otro problema, avísanos por el contacto indicado arriba y lo revisaremos lo antes posible.
      </p>
    </section>

    <section aria-labelledby="ley">
      <h2 id="ley">Legislación aplicable</h2>
      <p>
        Este sitio se rige por la legislación española. Para cualquier conflicto serán competentes
        los juzgados y tribunales que correspondan según la normativa vigente.
      </p>
    </section>

    <NuxtLink class="btn btn--secondary" to="/">Volver al menú</NuxtLink>
  </main>
</template>

<style scoped>
.policy {
  display: grid;
  gap: 1.75rem;
}

.policy__title {
  margin-bottom: 0.375rem;
  font-size: clamp(2.25rem, 9vw, 3.25rem);
}

.policy__meta {
  color: var(--crema-suave);
}

.policy h2 {
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.policy section {
  display: grid;
  gap: 0.75rem;
  max-width: 65ch;
}
</style>
