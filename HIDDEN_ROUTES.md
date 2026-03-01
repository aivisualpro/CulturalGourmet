# Hidden Routes

This file tracks all routes that exist in the codebase but have been intentionally hidden from the UI (navigation menus, sidebars, etc). The pages/files still exist — they are just not linked anywhere.

To restore a hidden route, find the relevant nav file listed below and re-add the entry.

---

## General

> To restore: re-add the item to the General group in `app/constants/menus.ts` and remove the redirect rule from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/tasks` | Tasks | `/` | 2026-02-27 |

## CRM

> To restore: re-add the item to the CRM group in `app/constants/menus.ts` and remove the redirect rule from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/crm/contacts` | Contacts | `/` | 2026-03-01 |
| `/crm/deals` | Deals Pipeline | `/` | 2026-03-01 |
| `/crm/activities` | Activities | `/` | 2026-03-01 |

## Sales & Commerce

> To restore: re-add the item to the Sales & Commerce group in `app/constants/menus.ts` and remove the redirect rule from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/sales/products` | Products | `/` | 2026-02-27 |
| `/sales/quotes` | Quotes | `/` | 2026-03-01 |

## Finance & Accounting

> To restore: re-add the menu group to `app/constants/menus.ts` and remove the redirect rules from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/finance/accounts` | Accounts | `/` | 2026-03-01 |
| `/finance/transactions` | Transactions | `/` | 2026-03-01 |
| `/finance/expenses` | Expenses | `/` | 2026-03-01 |
| `/finance/taxes` | Tax Management | `/` | 2026-03-01 |
| `/finance/balance-sheet` | Balance Sheet | `/` | 2026-03-01 |
| `/finance/income-statement` | Income Statement | `/` | 2026-03-01 |
| `/finance/ratios` | Financial Ratios | `/` | 2026-03-01 |
| `/finance/business-health` | Business Health | `/` | 2026-02-27 |

## Marketing

> To restore: re-add the menu group to `app/constants/menus.ts` and remove the redirect rules from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/marketing/emails` | Emails | `/` | 2026-02-27 |
| `/marketing/campaigns` | Campaigns | `/` | 2026-02-27 |
| `/marketing/email-blasts` | Email Blasts | `/` | 2026-02-27 |
| `/marketing/analytics` | Analytics | `/` | 2026-02-27 |

## Settings

| Route | Title | Nav File | Hidden On |
|---|---|---|---|
| `/settings/notifications` | Notifications | `app/components/settings/SidebarNav.vue` (nav hidden) + `nuxt.config.ts` routeRules (URL blocked → redirects to `/settings/profile`) | 2026-02-27 |

## HR & Workforce

> To restore: re-add the menu group to `app/constants/menus.ts` and remove the redirect rules from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/hr/employees` | Employees | `/` | 2026-02-27 |
| `/hr/attendance` | Attendance | `/` | 2026-02-27 |
| `/hr/payroll` | Payroll | `/` | 2026-02-27 |
| `/hr/recruitment` | Recruitment | `/` | 2026-02-27 |
| `/hr/leaves` | Leave Mgmt | `/` | 2026-02-27 |

## Project Management

> To restore: re-add the menu group to `app/constants/menus.ts` and remove the redirect rules from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/projects/list` | Projects | `/` | 2026-02-27 |
| `/projects/timesheets` | Timesheets | `/` | 2026-02-27 |
| `/projects/milestones` | Milestones | `/` | 2026-02-27 |

## Reports

> To restore: re-add the items to the Reports group in `app/constants/menus.ts` and remove the redirect rules from `nuxt.config.ts`.

| Route | Title | Redirects To | Hidden On |
|---|---|---|---|
| `/reports/financial` | Financial Reports | `/` | 2026-02-27 |
| `/reports/hr` | HR Reports | `/` | 2026-02-27 |
