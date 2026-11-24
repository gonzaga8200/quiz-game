import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppHeader from '../../app/components/AppHeader.vue'

// NuxtLink is a Nuxt component: a plain anchor stands in for it here.
const stubs = {
  NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  // Nuxt's client-only wrapper: the sound toggle renders inside it.
  ClientOnly: { template: '<div><slot /></div>' },
}

describe('AppHeader', () => {
  beforeEach(() => {
    vi.stubGlobal('useRoute', () => ({ path: '/' }))
    // The sound state is global in the app; the header only shows its toggle.
    vi.stubGlobal('useSound', () => ({ muted: ref(false), toggle: () => {} }))
    // Phone width: the side panel is in use.
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.style.overflow = ''
  })

  it('offers the three places of the site', () => {
    const wrapper = mount(AppHeader, { global: { stubs }, attachTo: document.body })
    const links = wrapper.findAll('nav a').map((a) => a.text())
    expect(links).toEqual(['Inicio', 'Contacto', 'Social Media'])
    wrapper.unmount()
  })

  it('opens and closes the panel from the button, and says so to assistive tech', async () => {
    const wrapper = mount(AppHeader, { global: { stubs }, attachTo: document.body })
    const toggle = wrapper.find('.site-header__toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-label')).toBe('Abrir menú')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('nav').classes()).toContain('is-open')
    expect(document.body.style.overflow).toBe('hidden')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('nav').classes()).not.toContain('is-open')
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })

  it('closes with Escape while focus is in the panel', async () => {
    const wrapper = mount(AppHeader, { global: { stubs }, attachTo: document.body })
    await wrapper.find('.site-header__toggle').trigger('click')
    await wrapper.find('nav').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('nav').classes()).not.toContain('is-open')
    wrapper.unmount()
  })

  it('closes when the veil behind the panel is tapped', async () => {
    const wrapper = mount(AppHeader, { global: { stubs }, attachTo: document.body })
    await wrapper.find('.site-header__toggle').trigger('click')
    await wrapper.find('.site-header__veil').trigger('click')
    expect(wrapper.find('nav').classes()).not.toContain('is-open')
    wrapper.unmount()
  })
})
