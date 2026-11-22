<script setup lang="ts">
import { LEGAL } from '~/content/legal'

// A legal page: useful to people, not something to rank. Links on it are still followed.
useHead({ title: 'Cookies y privacidad', meta: [{ name: 'robots', content: 'noindex, follow' }] })
useSeoMeta({
  description:
    'Qué cookies y almacenamiento local usa Contrarreloj, qué datos se publican en el ranking y cómo cambiar tu elección.',
})

const consent = useConsent()

const STATUS_TEXT = {
  unset: 'todavía no has elegido',
  accepted: 'has aceptado la analítica',
  rejected: 'has rechazado la analítica',
} as const

const storage = [
  {
    name: 'Sesión de Firebase Authentication (IndexedDB y localStorage, claves «firebase…»)',
    purpose: 'Mantener tu sesión iniciada con Google.',
    kind: 'Técnico, imprescindible',
    duration: 'Hasta que cierres sesión',
  },
  {
    name: 'contrarreloj.consent (localStorage)',
    purpose: 'Recordar si aceptaste o rechazaste la analítica.',
    kind: 'Técnico, imprescindible',
    duration: '24 meses',
  },
  {
    name: 'contrarreloj.muted (localStorage)',
    purpose: 'Recordar que has silenciado el sonido.',
    kind: 'Preferencia que tú eliges',
    duration: 'Hasta que lo cambies',
  },
  {
    name: 'contrarreloj.questions.v1 (localStorage)',
    purpose: 'Guardar las preguntas una hora para no volver a descargarlas en cada partida.',
    kind: 'Técnico, imprescindible',
    duration: '1 hora',
  },
  {
    name: 'contrarreloj.seen.v1 (localStorage)',
    purpose:
      'Recordar qué preguntas has visto en este dispositivo para repetirlas lo menos posible. No contiene datos personales y no se envía a ningún sitio.',
    kind: 'Funcional, solo en tu dispositivo',
    duration: 'Hasta que borres los datos del navegador',
  },
  {
    name: '_ga y _ga_<identificador> (cookies de Google Analytics)',
    purpose: 'Distinguir visitas y medir el uso del juego de forma estadística.',
    kind: 'Analítica, solo si aceptas',
    duration: '2 años',
  },
]
</script>

<template>
  <main id="main" tabindex="-1" class="policy">
    <header>
      <h1 class="policy__title">Política de cookies y privacidad</h1>
      <p class="policy__meta">Última actualización: {{ LEGAL.lastUpdated }}</p>
    </header>

    <section aria-labelledby="quien">
      <h2 id="quien">Quién es el responsable</h2>
      <p>{{ LEGAL.owner }}.</p>
      <LegalContact />
    </section>

    <section aria-labelledby="que-guardamos">
      <h2 id="que-guardamos">Qué guardamos en tu dispositivo</h2>
      <p>
        Contrarreloj usa cookies y almacenamiento local del navegador. Lo imprescindible para que el
        juego funcione no necesita tu permiso. La analítica solo se activa si la aceptas.
      </p>
      <p>
        Además, el juego recuerda en tu dispositivo qué preguntas has visto para no repetírtelas
        enseguida. Ese dato no sale de tu navegador y puedes borrarlo en cualquier momento desde los
        ajustes de datos del sitio.
      </p>
      <div class="table-wrap">
        <table class="policy__table">
          <caption class="sr-only">
            Cookies y almacenamiento que usa Contrarreloj
          </caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Para qué sirve</th>
              <th scope="col">Tipo</th>
              <th scope="col">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in storage" :key="item.name">
              <th scope="row">{{ item.name }}</th>
              <td>{{ item.purpose }}</td>
              <td>{{ item.kind }}</td>
              <td>{{ item.duration }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section aria-labelledby="login">
      <h2 id="login">Iniciar sesión con Google</h2>
      <p>
        El modo competitivo requiere iniciar sesión con tu cuenta de Google mediante Firebase
        Authentication. Para recordar tu sesión, Firebase guarda datos técnicos en tu navegador. Es
        almacenamiento imprescindible para prestar el servicio que solicitas, por eso no necesita tu
        consentimiento y
        <strong>no depende de que aceptes la analítica</strong>.
      </p>
      <p>
        Al iniciar sesión, Google trata tus datos según su propia política de privacidad. Nosotros
        recibimos tu nombre, tu foto de perfil, tu correo electrónico y un identificador de usuario.
        Firebase Authentication guarda estos datos para gestionar tu cuenta. Solo el nombre, la foto
        y las puntuaciones se publican en el ranking: el correo no se muestra ni se usa para nada
        más. No recibimos tu contraseña.
      </p>
    </section>

    <section aria-labelledby="ranking">
      <h2 id="ranking">Datos que se publican en el ranking</h2>
      <p>
        Si juegas en modo competitivo guardamos tu identificador, tu nombre, tu foto de perfil de
        Google y tus resultados (puntos, aciertos, fallos, preguntas pasadas, tiempo y dificultad).
        <strong>Tu nombre, tu foto y tu puntuación son visibles públicamente en el ranking.</strong>
        El modo arcade no guarda nada de esto.
      </p>
      <p>
        Las fotos de perfil se cargan desde los servidores de Google, que pueden recibir tu
        dirección IP cuando se muestran.
      </p>
      <p>
        Base legal: la ejecución del servicio que solicitas al jugar en modo competitivo. Los datos
        se conservan mientras mantengas tu entrada en el ranking. Puedes ejercer tus derechos de
        acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo al
        contacto indicado arriba; para borrar tu entrada y tu cuenta, dinos el nombre con el que
        apareces y las eliminaremos. Si crees que no hemos tratado bien tus datos, puedes reclamar
        ante la Agencia Española de Protección de Datos.
      </p>
      <p>
        <strong>Menores:</strong>
        el modo competitivo es solo para mayores de 14 años, la edad a partir de la cual en España
        se puede consentir el tratamiento de datos personales. Si eres más joven, puedes jugar en
        modo arcade, que no guarda ningún dato tuyo.
      </p>
    </section>

    <section aria-labelledby="alojamiento">
      <h2 id="alojamiento">Alojamiento y transferencias</h2>
      <p>
        El sitio se sirve con Firebase Hosting y los datos del ranking y de las preguntas se guardan
        en Firestore, en la región europea (eur3). Ambos son servicios de Google, que actúa como
        encargado del tratamiento. Como cualquier servidor web, Firebase Hosting puede registrar tu
        dirección IP y datos técnicos de tu visita (navegador, página solicitada, fecha) en sus
        registros de funcionamiento y seguridad.
      </p>
      <p>
        Google puede tratar datos fuera del Espacio Económico Europeo, por ejemplo en Estados
        Unidos, con las garantías que indica en sus condiciones de tratamiento de datos.
      </p>
    </section>

    <section aria-labelledby="analitica">
      <h2 id="analitica">Analítica con Google Analytics 4</h2>
      <p>
        Solo si pulsas «Aceptar» medimos las páginas que se ven y si el inicio de sesión funciona o
        falla. No enviamos tu nombre, correo ni identificador de usuario, y no usamos esos datos
        para publicidad: las señales de publicidad (ad_storage, ad_user_data y ad_personalization)
        están siempre desactivadas.
      </p>
      <p>
        Usamos Google Consent Mode v2 con todo denegado por defecto. El código de Google Analytics
        ni siquiera se descarga hasta que aceptas. Si rechazas o cambias de opinión, dejamos de
        medir y borramos las cookies de Google Analytics de este sitio. Google puede tratar estos
        datos fuera del Espacio Económico Europeo.
      </p>
    </section>

    <section aria-labelledby="cambiar" class="change">
      <h2 id="cambiar">Cambia tu elección</h2>
      <p>
        Puedes cambiar de opinión cuando quieras. Ahora mismo:
        <ClientOnly>
          <strong>{{ STATUS_TEXT[consent.state.value.status] }}</strong>
          <template #fallback>cargando…</template>
        </ClientOnly>
        .
      </p>
      <button type="button" class="btn btn--primary" @click="consent.reopen">
        Cambiar mi elección
      </button>
    </section>

    <section aria-labelledby="mas">
      <h2 id="mas">Más información</h2>
      <ul>
        <li>
          <a href="https://policies.google.com/privacy" rel="noopener">
            Política de privacidad de Google
          </a>
        </li>
        <li>
          <a href="https://www.aepd.es/guias/guia-cookies.pdf" rel="noopener">
            Guía sobre el uso de cookies de la AEPD
          </a>
        </li>
      </ul>
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

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-option);
  background: var(--papel);
  color: var(--tinta);
}

.policy__table {
  width: 100%;
  min-width: 34rem;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.policy__table th,
.policy__table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--papel-linea);
  text-align: left;
  vertical-align: top;
}

.policy__table thead th {
  border-bottom: 3px solid var(--tinta);
}

.policy__table tbody th {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.change .btn {
  justify-self: start;
}

.policy ul {
  margin: 0;
  padding-left: 1.25rem;
}
</style>
