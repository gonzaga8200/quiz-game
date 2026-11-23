<script setup lang="ts">
const { user, ready, available, error, signIn, signOut } = useAuth()
const sound = useSound()
</script>

<template>
  <main id="main" tabindex="-1" class="menu">
    <div class="menu__bar">
      <ClientOnly>
        <div v-if="user" class="who">
          <img
            v-if="user.photoURL"
            class="who__avatar"
            :src="user.photoURL"
            alt=""
            width="36"
            height="36"
            referrerpolicy="no-referrer"
          />
          <span class="who__name">{{ user.displayName }}</span>
          <button type="button" class="who__out" @click="signOut">Cerrar sesión</button>
        </div>
      </ClientOnly>
      <SoundToggle class="menu__sound" />
    </div>

    <header class="hero">
      <!-- The pocket watch is the signature of the game: the hand never stops on the cover. -->
      <!-- data-nosnippet keeps the dial numerals (XII, I, II...) out of search snippets. -->
      <ClockFace class="hero__clock" data-nosnippet :duration-ms="1" :remaining-ms="1" idle />
      <!-- The visible wordmark stays the brand; the hidden words tell search engines what it is. -->
      <h1 class="wordmark">
        Contrarreloj<span class="sr-only">: juego de preguntas contra el tiempo</span>
      </h1>
      <p class="tagline">
        Responde todas las preguntas que puedas antes de que se acabe el tiempo.
      </p>
    </header>

    <nav class="actions" aria-label="Menú principal">
      <NuxtLink class="btn btn--primary btn--large" to="/jugar?modo=arcade" @click="sound.unlock()">
        <span>
          Jugar arcade
          <span class="btn__hint">60 segundos, dificultad aleatoria, sin registro</span>
        </span>
      </NuxtLink>

      <ClientOnly>
        <template v-if="available && ready">
          <NuxtLink
            v-if="user"
            class="btn btn--secondary btn--large"
            to="/competitivo"
            @click="sound.unlock()"
          >
            <span>
              Modo competitivo
              <span class="btn__hint">60 o 120 segundos, tú eliges dificultad y categoría</span>
            </span>
          </NuxtLink>
          <template v-else>
            <GoogleSignInButton @click="signIn" />
            <p class="note">
              Entra con Google para jugar en modo competitivo (mayores de 14 años). Tu nombre, tu
              foto de Google y tu puntuación serán visibles en el ranking.
              <NuxtLink to="/cookies">Más información sobre privacidad</NuxtLink>.
            </p>
            <p v-if="error" class="note note--error" role="alert">{{ error }}</p>
          </template>
        </template>
      </ClientOnly>

      <NuxtLink v-if="available" class="btn btn--secondary btn--large" to="/ranking">
        Ranking
      </NuxtLink>
    </nav>
  </main>
</template>

<style scoped>
/*
 * Phone: the watch and the title fill the top, the buttons rest at the bottom, in reach
 * of the thumb. Desktop: watch and title on the left, the menu on the right.
 */
.menu {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1.5rem;
  /* The shell adds 1rem on top and 3rem below. */
  min-height: calc(100dvh - 4rem);
}

.menu__bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  min-height: 3rem;
}

.who {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin-right: auto;
}

.who__avatar {
  flex: none;
  border: 2px solid var(--oro);
  border-radius: 50%;
}

.who__name {
  min-width: 0;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.who__out {
  flex: none;
  padding: 0.5rem;
  border: 0;
  background: none;
  color: var(--oro-claro);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.hero {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.875rem;
  text-align: center;
}

.hero__clock {
  width: min(58vw, 14rem);
}

.wordmark {
  color: var(--oro-claro);
  font-size: clamp(2.75rem, 13vw, 5rem);
  line-height: 1;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 0 rgb(0 0 0 / 0.5);
}

.tagline {
  max-width: 28ch;
  color: var(--crema-suave);
  font-size: 1.125rem;
}

.actions {
  display: grid;
  gap: 0.875rem;
}

.actions .btn {
  justify-content: flex-start;
  padding-block: 0.875rem;
  text-align: left;
}

.note {
  font-size: 0.9375rem;
  color: var(--crema-suave);
}

.note a {
  color: var(--oro-claro);
  font-weight: 700;
}

.note--error {
  color: var(--fallo-suelo);
  font-weight: 700;
}

@media (min-width: 56rem) {
  .menu {
    grid-template-columns: 1fr minmax(0, 26rem);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'bar bar'
      'hero actions';
    align-items: center;
    column-gap: 4rem;
  }

  .menu__bar {
    grid-area: bar;
  }

  .hero {
    grid-area: hero;
  }

  .actions {
    grid-area: actions;
  }

  .hero__clock {
    width: min(100%, 20rem);
  }

  .wordmark {
    font-size: 4.75rem;
  }
}
</style>
