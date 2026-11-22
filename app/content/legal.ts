export interface LegalInfo {
  /** Name the copyright is held under. Matches the LICENSE file. */
  readonly holder: string
  readonly owner: string
  /** The site's domain name, which the legal notice must name. Matches `SEO.defaultSiteUrl`. */
  readonly domain: string
  /** Year the site was first published; the footer shows it as the copyright year. */
  readonly copyrightYear: number
  /**
   * Public contact email, the channel for people who want to exercise their data rights. If it
   * is ever left empty, the pages fall back to the GitHub issues link below (which is public and
   * stops working if the repository goes private).
   */
  readonly email: string
  readonly contact: string
  readonly contactHint: string
  readonly lastUpdated: string
}

/**
 * Who is behind the site, shown in the footer, the legal notice and the cookie and privacy
 * page. Spanish law (LSSI) expects the owner of a website to be identifiable: replace these
 * values with your own details before launching publicly.
 */
export const LEGAL: LegalInfo = {
  holder: 'Gonzalo Moreno Minguito',
  owner: 'Gonzalo Moreno Minguito (titular del proyecto, gonzaga8200 en GitHub)',
  domain: 'contrarreloj-quiz.com',
  copyrightYear: 2026,
  email: 'informacion@contrarreloj-quiz.com',
  contact: 'https://github.com/gonzaga8200/quiz-game/issues',
  contactHint:
    'Abre una incidencia con el título «Privacidad» y no incluyas datos personales en ella.',
  lastUpdated: '22 de noviembre de 2026',
}

/** The notice shown in the footer: "© 2026 Gonzalo Moreno Minguito". */
export const COPYRIGHT_NOTICE = `© ${LEGAL.copyrightYear} ${LEGAL.holder}`
