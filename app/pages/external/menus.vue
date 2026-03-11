<script setup lang="ts">
definePageMeta({ layout: 'blank' })
useHead({ title: 'Our Menus — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'Our Menus', icon: 'i-lucide-book-open', description: 'Explore our curated menus for every occasion' })

interface MenuItem {
  name: string
  description: string
  price?: string
}

interface MenuCategory {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  gradient: string
  iconBg: string
  iconColor: string
  coverPattern: string
  items: MenuItem[]
}

const menus: MenuCategory[] = [
  {
    id: 'holiday',
    title: 'Holiday Menu',
    subtitle: 'Festive celebrations',
    description: 'Celebrate the festive season with our curated holiday selections. From elegant appetizers to show-stopping mains and decadent desserts.',
    icon: 'i-lucide-gift',
    color: 'rose',
    gradient: 'from-rose-500/20 via-pink-500/10 to-red-500/5',
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-600 dark:text-rose-400',
    coverPattern: 'radial-gradient(circle at 20% 50%, rgba(244,63,94,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236,72,153,0.06) 0%, transparent 40%)',
    items: [
      { name: 'Roasted Herb Crusted Prime Rib', description: 'Slow-roasted with garlic, rosemary, and thyme. Served with au jus and horseradish cream.', price: '$45' },
      { name: 'Honey Glazed Ham', description: 'Brown sugar and honey glaze, studded with cloves. A holiday classic.', price: '$35' },
      { name: 'Lobster Thermidor', description: 'Lobster tails in a rich brandy cream sauce topped with Gruyère and baked golden.', price: '$55' },
      { name: 'Cranberry Brie Crostini', description: 'Crispy baguette rounds topped with warm brie, cranberry compote, and candied pecans.', price: '$18' },
      { name: 'Yule Log Cake', description: 'Chocolate sponge rolled with chestnut cream, decorated with meringue mushrooms.', price: '$28' },
      { name: 'Spiced Eggnog Panna Cotta', description: 'Silky vanilla eggnog custard with fresh nutmeg and a caramel drizzle.', price: '$15' },
    ],
  },
  {
    id: 'thanksgiving',
    title: 'Thanksgiving Menu',
    subtitle: 'Gratitude & great food',
    description: 'Give thanks with a feast that brings everyone together. Traditional favorites elevated with our signature touch.',
    icon: 'i-lucide-leaf',
    color: 'amber',
    gradient: 'from-amber-500/20 via-orange-500/10 to-yellow-500/5',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    coverPattern: 'radial-gradient(circle at 30% 40%, rgba(245,158,11,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(234,88,12,0.06) 0%, transparent 40%)',
    items: [
      { name: 'Herb Brined Turkey', description: 'Whole turkey brined for 24 hours with sage, thyme, and citrus. Roasted to golden perfection.', price: '$85' },
      { name: 'Classic Stuffing', description: 'Sourdough bread stuffing with celery, onion, sage, and turkey drippings.', price: '$16' },
      { name: 'Maple Glazed Sweet Potatoes', description: 'Whipped sweet potatoes with brown butter, maple syrup, and toasted marshmallow.', price: '$14' },
      { name: 'Green Bean Casserole', description: 'Fresh green beans in a creamy mushroom sauce with crispy fried onions.', price: '$12' },
      { name: 'Cranberry Orange Relish', description: 'Fresh cranberries simmered with orange zest and cinnamon. Sweet and tangy.', price: '$8' },
      { name: 'Pumpkin Pie', description: 'Classic pumpkin pie with cinnamon, nutmeg, and a buttery flaky crust. Served with whipped cream.', price: '$22' },
    ],
  },
  {
    id: 'other-events',
    title: 'Other Events',
    subtitle: 'Custom celebrations',
    description: 'From corporate galas to intimate gatherings, our versatile menu selections can be customized for any occasion.',
    icon: 'i-lucide-party-popper',
    color: 'violet',
    gradient: 'from-violet-500/20 via-purple-500/10 to-indigo-500/5',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    coverPattern: 'radial-gradient(circle at 60% 30%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.06) 0%, transparent 40%)',
    items: [
      { name: 'Mediterranean Mezze Platter', description: 'Hummus, baba ganoush, falafel, tabbouleh, feta, olives, and warm pita bread.', price: '$24' },
      { name: 'Seared Salmon Fillets', description: 'Atlantic salmon with lemon dill butter sauce, served on a bed of wild rice.', price: '$38' },
      { name: 'Beef Tenderloin Sliders', description: 'Mini brioche buns with seared beef tenderloin, caramelized onions, and horseradish aioli.', price: '$28' },
      { name: 'Caprese Skewers', description: 'Fresh mozzarella, cherry tomatoes, and basil with balsamic glaze reduction.', price: '$16' },
      { name: 'Assorted Mini Dessert Tower', description: 'Macarons, chocolate truffles, fruit tarts, and cream puffs beautifully arranged.', price: '$32' },
      { name: 'Seasonal Fruit & Cheese Board', description: 'Artisan cheeses, seasonal fruits, honeycomb, and premium crackers.', price: '$26' },
    ],
  },
]

const expandedMenu = ref<string | null>(null)

function toggleMenu(id: string) {
  expandedMenu.value = expandedMenu.value === id ? null : id
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-5xl mx-auto">
    <!-- Hero -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/[0.06] via-rose-500/[0.04] to-violet-500/[0.06] border border-amber-500/10 p-8 md:p-10">
      <div class="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 20px 20px;" />
      <div class="absolute -top-20 -right-20 size-72 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl" />
      <div class="absolute -bottom-16 -left-16 size-56 rounded-full bg-gradient-to-tr from-violet-500/10 to-transparent blur-3xl" />
      <div class="relative z-10 flex items-center gap-5">
        <div class="flex items-center justify-center size-16 rounded-2xl bg-amber-500/10 border border-amber-500/10 shrink-0">
          <Icon name="i-lucide-book-open" class="size-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 class="text-xl font-bold tracking-tight">Our Curated Menus</h2>
          <p class="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
            Browse our carefully crafted menus designed for every special occasion. Each menu can be customized to your preferences and dietary requirements.
          </p>
        </div>
      </div>
    </div>

    <!-- Menu Cards -->
    <div class="space-y-5">
      <div
        v-for="menu in menus"
        :key="menu.id"
        class="group"
      >
        <Card
          class="relative overflow-hidden transition-all duration-500 border-2"
          :class="[
            expandedMenu === menu.id
              ? `border-${menu.color}-500/30 shadow-lg`
              : `border-border/50 hover:border-${menu.color}-500/20 shadow-sm hover:shadow-md`,
          ]"
        >
          <!-- Card Header (clickable) -->
          <button
            class="w-full text-left p-6 md:p-8 relative overflow-hidden"
            @click="toggleMenu(menu.id)"
          >
            <!-- Background pattern -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" :style="{ background: menu.coverPattern }" />
            <div
              class="absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500"
              :class="[menu.gradient, expandedMenu === menu.id ? 'opacity-100' : 'group-hover:opacity-60']"
            />

            <div class="relative z-10 flex items-center gap-5">
              <!-- Icon -->
              <div
                class="flex items-center justify-center size-16 rounded-2xl border transition-all duration-300 shrink-0"
                :class="[
                  menu.iconBg,
                  `border-${menu.color}-500/10`,
                  expandedMenu === menu.id ? 'scale-110 shadow-lg' : 'group-hover:scale-105',
                ]"
              >
                <Icon :name="menu.icon" class="size-8" :class="menu.iconColor" />
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="text-lg font-bold tracking-tight">{{ menu.title }}</h3>
                  <Badge
                    variant="outline"
                    class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                    :class="`text-${menu.color}-600 dark:text-${menu.color}-400 border-${menu.color}-500/20`"
                  >
                    {{ menu.items.length }} items
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground mb-1.5">{{ menu.subtitle }}</p>
                <p class="text-sm text-muted-foreground leading-relaxed line-clamp-2">{{ menu.description }}</p>
              </div>

              <!-- Expand indicator -->
              <div
                class="flex items-center justify-center size-10 rounded-xl shrink-0 transition-all duration-300"
                :class="[
                  expandedMenu === menu.id
                    ? `${menu.iconBg} rotate-180`
                    : 'bg-muted/60 group-hover:bg-muted',
                ]"
              >
                <Icon
                  name="i-lucide-chevron-down"
                  class="size-5 transition-colors"
                  :class="expandedMenu === menu.id ? menu.iconColor : 'text-muted-foreground'"
                />
              </div>
            </div>
          </button>

          <!-- Expanded Content -->
          <div
            class="overflow-hidden transition-all duration-500 ease-in-out"
            :style="{
              maxHeight: expandedMenu === menu.id ? '2000px' : '0px',
              opacity: expandedMenu === menu.id ? 1 : 0,
            }"
          >
            <Separator />
            <div class="p-6 md:p-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(item, i) in menu.items"
                  :key="i"
                  class="group/item relative rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                  :class="`hover:border-${menu.color}-500/20`"
                >
                  <!-- Item number -->
                  <div
                    class="absolute top-4 right-4 flex items-center justify-center size-6 rounded-full text-[10px] font-bold"
                    :class="[menu.iconBg, menu.iconColor]"
                  >
                    {{ i + 1 }}
                  </div>

                  <div class="pr-8">
                    <div class="flex items-center gap-2 mb-2">
                      <div class="size-1.5 rounded-full shrink-0" :class="`bg-${menu.color}-500`" />
                      <h4 class="font-semibold text-sm">{{ item.name }}</h4>
                    </div>
                    <p class="text-xs text-muted-foreground leading-relaxed mb-3">{{ item.description }}</p>
                    <div v-if="item.price" class="flex items-center gap-1.5">
                      <span
                        class="text-sm font-bold"
                        :class="menu.iconColor"
                      >
                        {{ item.price }}
                      </span>
                      <span class="text-[10px] text-muted-foreground">per serving</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Menu Footer -->
              <div class="mt-6 flex items-center justify-between pt-4 border-t border-dashed">
                <div class="flex items-center gap-2">
                  <Icon name="i-lucide-info" class="size-3.5 text-muted-foreground/60" />
                  <span class="text-[11px] text-muted-foreground/60">Prices are per serving. Custom packages available.</span>
                </div>
                <NuxtLink to="/external/event-order">
                  <Button size="sm" variant="outline" class="gap-2 text-xs h-8">
                    <Icon name="i-lucide-calendar-plus" class="size-3.5" />
                    Order This Menu
                  </Button>
                </NuxtLink>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Back Link -->
    <div class="flex justify-center pt-2">
      <NuxtLink to="/culture-gourmet-customer-portal">
        <Button variant="ghost" class="gap-2 text-muted-foreground hover:text-foreground">
          <Icon name="i-lucide-arrow-left" class="size-4" />
          Back to Customer Portal
        </Button>
      </NuxtLink>
    </div>
  </div>
</template>
