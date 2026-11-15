import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CookieBanner from '../../app/components/consent/CookieBanner.vue'

// NuxtLink is a Nuxt component; a plain anchor stands in for it here.
const stubs = { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

describe('CookieBanner', () => {
  const mountBanner = () => mount(CookieBanner, { global: { stubs } })

  it('explains the choice in Spanish, including that login does not depend on it', () => {
    const text = mountBanner().text()
    expect(text).toContain('Cookies y almacenamiento')
    expect(text).toContain('inicio de sesión con Google')
    expect(text).toContain('no depende de lo que elijas')
    expect(text).toContain('Google Analytics')
  })

  it('offers Aceptar and Rechazar with identical prominence', () => {
    const buttons = mountBanner().findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['Aceptar', 'Rechazar'])
    // Same classes means same size, colour and weight.
    expect(buttons[0]?.classes()).toEqual(buttons[1]?.classes())
  })

  it("emits the player's decision", async () => {
    const wrapper = mountBanner()
    const [accept, reject] = wrapper.findAll('button')
    await accept?.trigger('click')
    await reject?.trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)
    expect(wrapper.emitted('reject')).toHaveLength(1)
  })

  it('links to the cookie and privacy policy', () => {
    expect(mountBanner().find('a').attributes('href')).toBe('/cookies')
  })

  it('is a labelled region that does not trap focus', () => {
    const section = mountBanner().find('section')
    expect(section.attributes('aria-labelledby')).toBe('cookie-banner-title')
    expect(section.attributes('aria-modal')).toBeUndefined()
  })
})
