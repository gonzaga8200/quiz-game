import type { Category } from '../../core/constants'

/**
 * Copy for the public category pages (`/preguntas/<slug>`).
 *
 * The intros describe what the bank really contains, not what the category name suggests:
 * "Historia y Geografía" is mostly the history of Spain, "Lengua e Idiomas" is Spanish grammar
 * and spelling. Update them when a batch of questions changes the mix. Counts are not written
 * here: the page shows the real number from the question files.
 */
export interface CategoryPageCopy {
  /** Page title, without the site name (the title template adds it). Keep it under 45 characters. */
  readonly title: string
  /** `<h1>` of the page. */
  readonly heading: string
  /** Meta description, 110-160 characters. */
  readonly description: string
  /** Short sentence for the hub card. */
  readonly blurb: string
  /** Two paragraphs, in this order. */
  readonly intro: readonly [string, string]
}

export const CATEGORY_COPY: Readonly<Record<Category, CategoryPageCopy>> = {
  Deportes: {
    title: 'Preguntas de deportes con respuestas',
    heading: 'Preguntas de deportes con respuestas',
    description:
      'Preguntas de deportes con respuesta y explicación: Juegos Olímpicos, Mundiales de fútbol, Tour de Francia y más. Juega gratis contra el reloj.',
    blurb: 'Juegos Olímpicos, Mundiales de fútbol, Tour de Francia, La Liga y motociclismo.',
    intro: [
      'Una selección de preguntas de deportes con su respuesta y una explicación breve. Los temas más trabajados son la historia de los Juegos Olímpicos, los Mundiales de fútbol, el Tour de Francia, La Liga y el motociclismo.',
      'Cuando te sepas las respuestas, pasa al reloj: tienes 60 segundos para ver cuántas aciertas de memoria.',
    ],
  },
  'Historia y Geografía': {
    title: 'Preguntas de historia y geografía',
    heading: 'Preguntas de historia y geografía con respuestas',
    description:
      'Preguntas de historia de España y geografía con respuesta y explicación: Segunda República, Guerra Civil y Transición. Juega gratis contra el reloj.',
    blurb: 'Sobre todo historia contemporánea de España, con algunas preguntas de geografía.',
    intro: [
      'Preguntas de historia y geografía con su respuesta y una explicación breve. La mayoría trata de la historia contemporánea de España: la Segunda República, la Guerra Civil, la dictadura, la Transición y el 23-F. También hay algunas de geografía.',
      'Si ya conoces el periodo, ponlo a prueba contra el reloj: 60 segundos y las preguntas van cayendo una tras otra.',
    ],
  },
  'Arte y Literatura': {
    title: 'Preguntas de arte y literatura con respuestas',
    heading: 'Preguntas de arte y literatura con respuestas',
    description:
      'Preguntas de arte y literatura con respuesta y explicación: Siglo de Oro, picaresca, Don Quijote y grandes autores. Juega gratis contra el reloj.',
    blurb: 'Literatura española del Siglo de Oro: Don Quijote, la picaresca, Lope y los místicos.',
    intro: [
      'Sobre todo literatura, con algo de arte: estas preguntas traen su respuesta y una explicación breve. El grueso es literatura española del Siglo de Oro: Don Quijote, la novela picaresca, Lope de Vega, Santa Teresa de Jesús o San Juan de la Cruz, con alguna pregunta de pintura clásica.',
      'Con 60 segundos en el reloj, ¿cuántos títulos y autores reconoces sin pensarlo?',
    ],
  },
  'Cine y televisión': {
    title: 'Preguntas de cine y televisión con respuestas',
    heading: 'Preguntas de cine y televisión con respuestas',
    description:
      'Preguntas de cine con respuesta y explicación: Oscar, Goya y Razzie, directores y actores. Juega gratis contra el reloj y mide cuánto sabes.',
    blurb: 'Premios Oscar, Goya y Razzie, con sus directores y actores.',
    intro: [
      'Los premios son el hilo de esta categoría, con su respuesta y una explicación breve en cada pregunta. Giran en torno a los Oscar, los Goya y hasta los Razzie, y a los directores y actores que se los llevaron.',
      '¿Sabes quién se llevó cada estatuilla? Tienes 60 segundos para demostrarlo.',
    ],
  },
  Ciencias: {
    title: 'Preguntas de ciencias con respuestas',
    heading: 'Preguntas de ciencias con respuestas',
    description:
      'Preguntas de ciencias con respuesta y explicación: cuerpo humano, microbioma, astronomía y química. Juega gratis contra el reloj.',
    blurb: 'Cuerpo humano y microbioma, astronomía y cosmología, y algo de química.',
    intro: [
      'Del cuerpo humano al universo: preguntas de ciencias con su respuesta y una explicación breve. Cubren los huesos, los músculos, las vitaminas y el microbioma, la astronomía y la cosmología, y algunos datos de química.',
      'Prueba con el reloj en marcha: son 60 segundos y el modo arcade no pide registro.',
    ],
  },
  'Lengua e Idiomas': {
    title: 'Preguntas de lengua española con respuestas',
    heading: 'Preguntas de lengua española con respuestas',
    description:
      'Preguntas de lengua española con respuesta y explicación: gramática, ortografía, verbos y prefijos. Juega gratis contra el reloj.',
    blurb: 'Gramática y ortografía del español: verbos, prefijos, acentuación y tipos de texto.',
    intro: [
      'Gramática y ortografía del español, con respuesta y una explicación breve en cada pregunta. Esta categoría se llama «Lengua e Idiomas» en el juego y trata de verbos, prefijos, palabras esdrújulas, tipos de texto y cómo se escriben las palabras.',
      'Si ya te las sabes, ponte a prueba contra el reloj: 60 segundos y niveles de dificultad mezclados.',
    ],
  },
}

export const HUB_COPY = {
  title: 'Preguntas de cultura general con respuestas',
  heading: 'Preguntas de cultura general con respuestas',
  description:
    'Preguntas de cultura general con respuesta y explicación, por categorías: deportes, historia, literatura, cine, ciencias y lengua. Juega gratis.',
  intro: [
    'Elige una categoría para ver una selección de preguntas con su respuesta y una explicación breve. Todas salen del banco de preguntas de Contrarreloj, un juego en el que tienes 60 segundos para responder todas las que puedas.',
    'Si prefieres jugar directamente, empieza una partida con todas las categorías mezcladas, sin registrarte.',
  ],
} as const
