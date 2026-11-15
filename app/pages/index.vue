<script setup lang="ts">
const { user } = useAuth()
const sound = useSound()
</script>

<template>
  <main id="main" tabindex="-1" class="menu">
    <div class="menu__bar">
      <ClientOnly>
        <p v-if="user" class="who">
          <img
            v-if="user.photoURL"
            class="who__avatar"
            :src="user.photoURL"
            alt=""
            width="36"
            height="36"
          />
          <span class="who__name">{{ user.displayName }}</span>
        </p>
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
      </ClientOnly>
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
  margin: 0 auto 0 0;
  font-weight: 700;
}

.who__avatar {
  border: 2px solid var(--asfalto);
  border-radius: 50%;
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
</style>
