import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  spaLoadingTemplate: false,

  runtimeConfig: {
    mongodbUri: '',
    googleClientId: '',
    googleClientSecret: '',
    public: {
      googleClientId: '',
    },
  },


  watch: ['~/app.config.ts'],

  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
  },

  components: [
    {
      path: '~/components',
      extensions: ['.vue'],
    },
  ],

  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
  ],

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "~/components/ui"
     */
    componentDir: '~/components/ui',
  },

  colorMode: {
    classSuffix: '',
    preference: 'light',
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  fonts: {
    defaults: {
      weights: [300, 400, 500, 600, 700, 800],
    },
  },

  routeRules: {
    '/components': { redirect: '/components/accordion' },
    '/settings': { redirect: '/settings/profile' },
    '/settings/notifications': { redirect: '/settings/profile' },
    // HR & Workforce — hidden and URL-blocked
    '/hr/employees': { redirect: '/' },
    '/hr/attendance': { redirect: '/' },
    '/hr/payroll': { redirect: '/' },
    '/hr/recruitment': { redirect: '/' },
    '/hr/leaves': { redirect: '/' },
    // Project Management — hidden and URL-blocked
    '/projects/list': { redirect: '/' },
    '/projects/timesheets': { redirect: '/' },
    '/projects/milestones': { redirect: '/' },
    // General — partial removal
    '/tasks': { redirect: '/' },
    // Sales & Commerce — partial removal
    '/sales/products': { redirect: '/' },
    // CRM — partial removal
    '/crm/contacts': { redirect: '/' },
    '/crm/deals': { redirect: '/' },
    '/crm/activities': { redirect: '/' },
    // Sales & Commerce — partial removal
    '/sales/quotes': { redirect: '/' },
    // Finance & Accounting — fully removed
    '/finance/accounts': { redirect: '/' },
    '/finance/transactions': { redirect: '/' },
    '/finance/expenses': { redirect: '/' },
    '/finance/taxes': { redirect: '/' },
    '/finance/balance-sheet': { redirect: '/' },
    '/finance/income-statement': { redirect: '/' },
    '/finance/ratios': { redirect: '/' },
    '/finance/business-health': { redirect: '/' },
    // Marketing — hidden and URL-blocked
    '/marketing/emails': { redirect: '/' },
    '/marketing/campaigns': { redirect: '/' },
    '/marketing/email-blasts': { redirect: '/' },
    '/marketing/analytics': { redirect: '/' },
    // Reports — partial removal
    '/reports/financial': { redirect: '/' },
    '/reports/hr': { redirect: '/' },
  },

  imports: {
    dirs: [
      './lib',
    ],
  },

  compatibilityDate: '2024-12-14',
})
