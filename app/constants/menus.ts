import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    items: [
      {
        title: 'Dashboard',
        icon: 'i-lucide-layout-dashboard',
        link: '/',
      },
      {
        title: 'Gallery',
        icon: 'i-lucide-images',
        link: '/gallery',
      },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      {
        title: 'Vendors',
        icon: 'i-lucide-truck',
        link: '/inventory/vendors',
      },
      {
        title: 'Categories',
        icon: 'i-lucide-tags',
        link: '/inventory/categories',
      },
      {
        title: 'Consumptions',
        icon: 'i-lucide-flame',
        link: '/inventory/consumptions',
        new: true,
      },
    ],
  },

  {
    heading: 'CRM',
    items: [
      {
        title: 'Contacts',
        icon: 'i-lucide-contact',
        link: '/crm/contacts',
      },
      {
        title: 'Leads',
        icon: 'i-lucide-magnet',
        link: '/crm/leads',
      },
      {
        title: 'Deals Pipeline',
        icon: 'i-lucide-handshake',
        link: '/crm/deals',
        new: true,
      },
      {
        title: 'Companies',
        icon: 'i-lucide-building-2',
        link: '/crm/companies',
      },
      {
        title: 'Activities',
        icon: 'i-lucide-activity',
        link: '/crm/activities',
      },
    ],
  },
  {
    heading: 'Sales & Commerce',
    items: [
      {
        title: 'Quotes',
        icon: 'i-lucide-file-text',
        link: '/sales/quotes',
      },
      {
        title: 'Invoices',
        icon: 'i-lucide-receipt',
        link: '/sales/invoices',
      },
      {
        title: 'Orders',
        icon: 'i-lucide-shopping-cart',
        link: '/sales/orders',
      },

      {
        title: 'Customers',
        icon: 'i-lucide-users',
        link: '/sales/customers',
      },
    ],
  },


  {
    heading: 'Finance & Accounting',
    items: [
      {
        title: 'Accounts',
        icon: 'i-lucide-wallet',
        link: '/finance/accounts',
      },
      {
        title: 'Transactions',
        icon: 'i-lucide-arrow-right-left',
        link: '/finance/transactions',
      },
      {
        title: 'Expenses',
        icon: 'i-lucide-credit-card',
        link: '/finance/expenses',
      },
      {
        title: 'Tax Management',
        icon: 'i-lucide-percent',
        link: '/finance/taxes',
      },
      {
        title: 'Balance Sheet',
        icon: 'i-lucide-landmark',
        link: '/finance/balance-sheet',
        new: true,
      },
      {
        title: 'Income Statement',
        icon: 'i-lucide-receipt',
        link: '/finance/income-statement',
        new: true,
      },
      {
        title: 'Financial Ratios',
        icon: 'i-lucide-chart-no-axes-combined',
        link: '/finance/ratios',
        new: true,
      },

    ],
  },



  {
    heading: 'Reports',
    items: [
      {
        title: 'Sales Reports',
        icon: 'i-lucide-trending-up',
        link: '/reports/sales',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []

