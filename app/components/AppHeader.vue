<script setup lang="ts">
import SoundToggle from '~/components/SoundToggle.vue'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// The three places of the site. The game itself has no header, like it has no footer.
const LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/contacto', label: 'Contacto' },
  { to: '/social-media', label: 'Social Media' },
] as const

const route = useRoute()
const open = ref(false)
const toggle = ref<HTMLButtonElement | null>(null)
const nav = ref<HTMLElement | null>(null)

// The side panel only exists below the desktop breakpoint (48rem, matches the CSS). The page is
// prerendered, so the media query is read only in the browser, once mounted.
let desktop: MediaQueryList | null = null

function openMenu(): void {
  open.value = true
  document.body.style.overflow = 'hidden'
  // Focus goes to the first link so the keyboard user is inside the panel at once.
  void nextTick(() => nav.value?.querySelector<HTMLElement>('a')?.focus())
}

/** Closes the panel. Focus goes back to the button unless the page changed under it. */
function closeMenu(restoreFocus = true): void {
  if (!open.value) return
  open.value = false
  document.body.style.overflow = ''
  if (restoreFocus) toggle.value?.focus()
}

// Following a link closes the panel and leaves focus where the new page puts it.
watch(
  () => route.path,
  () => closeMenu(false),
)

const onDesktopChange = (event: MediaQueryListEvent): void => {
  if (event.matches) closeMenu(false)
}
onMounted(() => {
  desktop = window.matchMedia('(min-width: 48rem)')
  desktop.addEventListener('change', onDesktopChange)
})
onBeforeUnmount(() => {
  desktop?.removeEventListener('change', onDesktopChange)
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="site-header">
    <NuxtLink to="/" class="site-header__brand">Contrarreloj</NuxtLink>

    <div class="site-header__tools">
      <SoundToggle />
      <button
        ref="toggle"
        type="button"
        class="site-header__toggle"
        :aria-expanded="open"
        aria-controls="site-nav"
        :aria-label="open ? 'Cerrar menú' : 'Abrir menú'"
        @click="open ? closeMenu() : openMenu()"
      >
        <span class="site-header__bars" :class="{ 'is-open': open }" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
    </div>

    <div
      class="site-header__veil"
      :class="{ 'is-open': open }"
      aria-hidden="true"
      @click="closeMenu()"
    />

    <nav
      id="site-nav"
      ref="nav"
      class="site-nav"
      :class="{ 'is-open': open }"
      aria-label="Principal"
      @keydown.esc="closeMenu()"
    >
      <NuxtLink
        v-for="link in LINKS"
        :key="link.to"
        :to="link.to"
        class="site-nav__link"
        @click="closeMenu(false)"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: var(--header-h);
}

.site-header__brand {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--oro-claro);
  text-decoration: none;
}

/* The sound toggle and the menu button share one row and one height, so their centres line up. */
.site-header__tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Phone: a parchment button with three brass bars that turn into a cross. */
.site-header__toggle {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 2px solid var(--tinta);
  border-radius: var(--radius-control);
  background: var(--papel);
  color: var(--tinta);
  cursor: pointer;
}

.site-header__toggle:hover {
  background: var(--papel-oscuro);
}

.site-header__bars {
  position: relative;
  display: block;
  width: 1.25rem;
  height: 0.875rem;
}

.site-header__bars span {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transition:
    transform 0.28s ease,
    opacity 0.2s ease;
}

.site-header__bars span:nth-child(1) {
  top: 0;
}

.site-header__bars span:nth-child(2) {
  top: 50%;
  transform: translateY(-50%);
}

.site-header__bars span:nth-child(3) {
  bottom: 0;
}

.site-header__bars.is-open span:nth-child(1) {
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.site-header__bars.is-open span:nth-child(2) {
  opacity: 0;
}

.site-header__bars.is-open span:nth-child(3) {
  top: 50%;
  bottom: auto;
  transform: translateY(-50%) rotate(-45deg);
}

/* The panel: off screen to the left until opened, then it slides in. */
.site-nav {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: min(20rem, 84vw);
  padding: 5.5rem 1.5rem 2rem;
  border-right: 2px solid var(--oro-sombra);
  background-color: var(--nogal-alto);
  background-image: var(--grano-nogal);
  box-shadow: 12px 0 32px rgb(0 0 0 / 0.45);
  transform: translateX(-100%);
  visibility: hidden;
  /* Closing: slide out first, then hide. Opening: visible at once, so focus can land in it. */
  transition:
    transform 0.32s cubic-bezier(0.2, 0.7, 0.2, 1),
    visibility 0s linear 0.32s;
}

.site-nav.is-open {
  transform: translateX(0);
  visibility: visible;
  transition:
    transform 0.32s cubic-bezier(0.2, 0.7, 0.2, 1),
    visibility 0s linear 0s;
}

.site-nav__link {
  display: block;
  padding: 0.625rem 0.25rem 0.625rem 0.875rem;
  border-left: 3px solid transparent;
  color: var(--crema);
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 800;
  font-size: 1.75rem;
  line-height: 1.15;
  text-decoration: none;
}

.site-nav__link:hover {
  color: var(--oro-claro);
}

/* The page you are on: a gold rule, not only a colour change. */
.site-nav__link[aria-current='page'] {
  border-left-color: var(--oro);
  color: var(--oro-claro);
}

.site-header__veil {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgb(10 5 2 / 0.6);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.32s ease;
}

.site-header__veil.is-open {
  opacity: 1;
  pointer-events: auto;
}

/* Desktop: a plain row of links, no button and no panel. */
@media (min-width: 48rem) {
  .site-header__toggle,
  .site-header__veil {
    display: none;
  }

  .site-header__tools {
    order: 2;
  }

  .site-nav {
    position: static;
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    width: auto;
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
    transform: none;
    visibility: visible;
    transition: none;
  }

  .site-nav__link {
    padding: 0.25rem 0;
    border-left: 0;
    border-bottom: 3px solid transparent;
    font-family: var(--font-body);
    font-style: normal;
    font-weight: 700;
    font-size: 1rem;
  }

  .site-nav__link[aria-current='page'] {
    border-bottom-color: var(--oro);
    border-left-color: transparent;
  }
}
</style>
