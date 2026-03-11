<script setup lang="ts">
useHead({ title: 'External Links — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'External Links', icon: 'i-lucide-external-link', description: 'Quick access portals for your external customers' })

const links = [
  {
    id: 'event-order',
    title: 'Create Event Order',
    subtitle: 'Full event & catering inquiry',
    description: 'Complete event order form with client details, event specifications, budget, and service preferences for your customers.',
    icon: 'i-lucide-calendar-plus',
    color: 'violet',
    gradient: 'from-violet-500/20 via-purple-500/10 to-fuchsia-500/5',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderAccent: 'border-violet-500/20 hover:border-violet-500/40',
    link: '/external/event-order',
    badge: 'Full Form',
    features: ['Client Information', 'Event Details', 'Budget & Logistics', 'Service Preferences'],
    cta: 'Open Form',
    ctaNote: 'Saves to Orders DB',
    ctaNoteIcon: 'i-lucide-database',
  },
  {
    id: 'catering-order',
    title: 'Create Catering Order',
    subtitle: 'Quick catering request',
    description: 'Simplified catering inquiry with essential fields — event type, date, time, venue, and estimated guests.',
    icon: 'i-lucide-utensils-crossed',
    color: 'emerald',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderAccent: 'border-emerald-500/20 hover:border-emerald-500/40',
    link: '/external/catering-order',
    badge: 'Quick Form',
    features: ['Type of Event', 'Date & Time', 'Venue', 'Guest Count'],
    cta: 'Open Form',
    ctaNote: 'Saves to Orders DB',
    ctaNoteIcon: 'i-lucide-database',
  },
  {
    id: 'menus',
    title: 'Our Menus',
    subtitle: 'Browse our curated menus',
    description: 'Explore our specially crafted menus for holidays, Thanksgiving, and other special events. Find the perfect spread for your occasion.',
    icon: 'i-lucide-book-open',
    color: 'amber',
    gradient: 'from-amber-500/20 via-orange-500/10 to-yellow-500/5',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderAccent: 'border-amber-500/20 hover:border-amber-500/40',
    link: '/external/menus',
    badge: 'Browse',
    features: ['Holiday Menus', 'Thanksgiving', 'Other Events', 'Seasonal Specials'],
    cta: 'View Menus',
    ctaNote: 'Explore options',
    ctaNoteIcon: 'i-lucide-sparkles',
  },
]

const hoveredCard = ref<string | null>(null)
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-violet-500/5 to-emerald-500/5 border border-primary/10 p-8 md:p-10">
      <div class="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 24px 24px;" />
      <div class="absolute -top-24 -right-24 size-80 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl" />
      <div class="absolute -bottom-16 -left-16 size-64 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl" />
      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center size-12 rounded-xl bg-primary/10 border border-primary/10 shadow-sm">
            <Icon name="i-lucide-globe" class="size-6 text-primary" />
          </div>
          <div>
            <h2 class="text-xl font-bold tracking-tight">Customer Portals</h2>
            <p class="text-sm text-muted-foreground">Share these links with your external customers</p>
          </div>
        </div>
        <p class="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          These streamlined order forms are designed for your customers to easily submit event and catering inquiries. Use the <strong class="text-foreground">share button</strong> on each card to send the link via email, SMS, or generate a QR code. No login required for customers.
        </p>
      </div>
    </div>

    <!-- Cards Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <NuxtLink
        v-for="item in links"
        :key="item.id"
        :to="item.link"
        class="group block"
        @mouseenter="hoveredCard = item.id"
        @mouseleave="hoveredCard = null"
      >
        <Card
          class="relative overflow-hidden transition-all duration-500 h-full border-2"
          :class="[
            item.borderAccent,
            hoveredCard === item.id ? 'shadow-xl shadow-primary/5 -translate-y-1' : 'shadow-sm',
          ]"
        >
          <!-- Background gradient -->
          <div
            class="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            :class="item.gradient"
          />

          <!-- Decorative circles -->
          <div class="absolute -top-12 -right-12 size-40 rounded-full transition-all duration-700 group-hover:scale-110"
            :class="`bg-${item.color}-500/5`"
          />
          <div class="absolute -bottom-8 -left-8 size-28 rounded-full transition-all duration-700 group-hover:scale-125"
            :class="`bg-${item.color}-500/[0.03]`"
          />

          <!-- Content -->
          <div class="relative z-10 p-6 md:p-8 space-y-6">
            <!-- Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="flex items-center justify-center size-14 rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg border"
                  :class="[item.iconBg, `border-${item.color}-500/10`, `group-hover:shadow-${item.color}-500/10`]"
                >
                  <Icon :name="item.icon" class="size-7" :class="item.iconColor" />
                </div>
                <div>
                  <h3 class="text-lg font-bold tracking-tight group-hover:text-foreground transition-colors">
                    {{ item.title }}
                  </h3>
                  <p class="text-xs text-muted-foreground mt-0.5">{{ item.subtitle }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <ShareButton
                  :url="item.link"
                  :title="item.title"
                  :description="item.description"
                />
                <Badge
                  variant="outline"
                  class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 transition-colors"
                  :class="`text-${item.color}-600 dark:text-${item.color}-400 border-${item.color}-500/20`"
                >
                  {{ item.badge }}
                </Badge>
              </div>
            </div>

            <!-- Description -->
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ item.description }}
            </p>

            <!-- Features -->
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="(feature, i) in item.features"
                :key="i"
                class="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50 transition-all duration-300 group-hover:bg-muted/60 group-hover:border-border"
              >
                <div
                  class="size-1.5 rounded-full shrink-0"
                  :class="`bg-${item.color}-500`"
                />
                <span class="text-xs font-medium text-muted-foreground">{{ feature }}</span>
              </div>
            </div>

            <!-- CTA Row -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <Icon :name="item.ctaNoteIcon" class="size-3.5 text-muted-foreground/60" />
                <span class="text-[11px] text-muted-foreground/60">{{ item.ctaNote }}</span>
              </div>
              <div
                class="flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3"
                :class="item.iconColor"
              >
                <span>{{ item.cta }}</span>
                <div
                  class="flex items-center justify-center size-8 rounded-full transition-all duration-300 group-hover:scale-110"
                  :class="item.iconBg"
                >
                  <Icon name="i-lucide-arrow-right" class="size-4 transition-transform duration-300 group-hover:translate-x-0.5" :class="item.iconColor" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </NuxtLink>
    </div>

    <!-- Info Footer -->
    <Card class="border-dashed">
      <div class="p-5 flex items-start gap-4">
        <div class="flex items-center justify-center size-10 rounded-xl bg-amber-500/10 border border-amber-500/10 shrink-0">
          <Icon name="i-lucide-info" class="size-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold">How it works</p>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Share the direct links to these forms with your customers. When they submit an order, it gets saved to your Orders database and appears in your
            <NuxtLink to="/sales/orders" class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium">Sales → Orders</NuxtLink>
            page for review and management. All orders start with "New" status.
          </p>
        </div>
      </div>
    </Card>
  </div>
</template>
