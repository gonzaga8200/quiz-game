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
      <h1 class="wordmark">Contrarreloj</h1>
      <p class="tagline">
        Responde todas las preguntas que puedas antes de que se acabe el tiempo.
      </p>
      <!-- The start line of a time trial: the whole road is still ahead. -->
      <RoadTimer :duration-ms="1" :remaining-ms="1" />
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
              <span class="btn__hint">60 o 120 segundos, tú eliges la dificultad</span>
            </span>
          </NuxtLink>
          <template v-else>
            <GoogleSignInButton @click="signIn" />
            <p class="note">
              Entra con Google para jugar en modo competitivo y aparecer en el ranking.
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
.menu {
  display: grid;
  gap: 2rem;
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
  border: 2px solid var(--asfalto);
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
  color: var(--azul);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.hero {
  display: grid;
  gap: 1rem;
}

.wordmark {
  font-size: clamp(3.5rem, 17vw, 6rem);
  line-height: 0.9;
  letter-spacing: -0.01em;
}

.tagline {
  max-width: 30ch;
  font-size: 1.1875rem;
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
  color: var(--asfalto-suave);
}

.note--error {
  color: var(--fallo);
  font-weight: 700;
}
</style>
