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
        title: 'Users Management',
        icon: 'i-lucide-users-round',
        link: '/users-management',
      },
      {
        title: 'External Links',
        icon: 'i-lucide-external-link',
        link: '/culture-gourmet-customer-portal',
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
        title: 'Locations',
        icon: 'i-lucide-map-pin',
        link: '/inventory/locations',
      },
      {
        title: 'Categories',
        icon: 'i-lucide-tags',
        link: '/inventory/categories',
      },
      {
        title: 'Food Items',
        icon: 'i-lucide-chef-hat',
        link: '/inventory/food-items',
      },
      {
        title: 'Consumptions',
        icon: 'i-lucide-flame',
        link: '/inventory/consumptions',
      },
    ],
  },


  {
    heading: 'Sales & Commerce',
    items: [
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
