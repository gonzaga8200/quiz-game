import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ContactOptions from '../../app/components/feedback/ContactOptions.vue'
import ReportQuestionDialog from '../../app/components/feedback/ReportQuestionDialog.vue'
import { LEGAL } from '../../app/content/legal'
import { CONTACT_REASONS, mailtoHref, questionReportHref } from '../../app/utils/feedback'

const EMAIL = 'informacion@example.com'

describe('mailtoHref', () => {
  it('is just the address when there is no subject or body', () => {
    expect(mailtoHref(EMAIL)).toBe(`mailto:${EMAIL}`)
  })

  it('encodes the subject and body so the mail app gets the text intact', () => {
    expect(mailtoHref(EMAIL, 'Hola · Contrarreloj', 'Línea uno\nLínea dos')).toBe(
      `mailto:${EMAIL}?subject=${encodeURIComponent('Hola · Contrarreloj')}&body=${encodeURIComponent('Línea uno\nLínea dos')}`,
    )
  })
})

describe('questionReportHref', () => {
  it('fills the subject with the question and leaves the body ready for the visitor to write', () => {
    const href = questionReportHref(EMAIL, { id: 'abc-123', text: '¿Capital de Francia?' })
    expect(href).toBe(
      mailtoHref(
        EMAIL,
        'Pregunta con respuesta incorrecta (pregunta abc-123)',
        'Pregunta: ¿Capital de Francia?\nIdentificador: abc-123\n\n',
      ),
    )
  })

  it('drops an identifier that is not a plain identifier', () => {
    const href = questionReportHref(EMAIL, { id: '../../etc', text: '¿Capital?' })
    expect(decodeURIComponent(href)).toContain('subject=Pregunta con respuesta incorrecta&')
    expect(decodeURIComponent(href)).not.toContain('Identificador')
  })

  it('cuts a long question text to its limit', () => {
    const href = questionReportHref(EMAIL, { id: 'abc', text: 'x'.repeat(400) })
    const body = decodeURIComponent(href.split('&body=')[1]!)
    expect(body.split('\n')[0]!.replace('Pregunta: ', '')).toHaveLength(300)
  })
})

describe('ContactOptions', () => {
  it('offers the three reasons, each opening a mail with its subject and an empty body', () => {
    const wrapper = mount(ContactOptions)
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(CONTACT_REASONS.length)
    CONTACT_REASONS.forEach((reason, i) => {
      expect(links[i]!.text()).toBe(reason.label)
      expect(links[i]!.attributes('href')).toBe(mailtoHref(LEGAL.email, reason.subject))
    })
  })

  it('has no fields to fill in', () => {
    const wrapper = mount(ContactOptions)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })
})

describe('ReportQuestionDialog', () => {
  it('shows the question and a link that opens the mail app with it', () => {
    vi.stubGlobal('useId', () => 'test')
    const wrapper = mount(ReportQuestionDialog, {
      props: { open: false, questionId: 'abc-123', questionText: '¿Capital de Francia?' },
    })
    expect(wrapper.find('blockquote').text()).toBe('¿Capital de Francia?')
    expect(wrapper.find('h2').text()).toBe('Reportar esta pregunta')
    expect(wrapper.find('a.report__send').attributes('href')).toBe(
      questionReportHref(LEGAL.email, { id: 'abc-123', text: '¿Capital de Francia?' }),
    )
    expect(wrapper.find('textarea').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('tells the game to resume when the visitor follows the link or cancels', async () => {
    vi.stubGlobal('useId', () => 'test')
    const wrapper = mount(ReportQuestionDialog, {
      props: { open: false, questionId: 'abc', questionText: '¿Capital?' },
    })
    await wrapper.find('a.report__send').trigger('click')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)
    vi.unstubAllGlobals()
  })
})
