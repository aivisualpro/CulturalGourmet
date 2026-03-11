<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'blank' })
useHead({ title: 'New Catering Order — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'New Catering Order', icon: 'i-lucide-utensils-crossed', description: 'Quick catering request form' })

// ─── State ────────────────────────────────────────────────────
const submitted = ref(false)
const submitting = ref(false)

const form = reactive({
  TypeOfEvent: '',
  OtherTypeOfEvent: '',
  Date: '',
  StartTime: '',
  Venue: '',
  Guests: '',
})

const eventTypes = [
  { value: 'Wedding Reception', label: 'Wedding Reception', icon: 'i-lucide-heart' },
  { value: 'Corporate Dinner', label: 'Corporate Dinner', icon: 'i-lucide-briefcase' },
  { value: 'Birthday Party', label: 'Birthday Party', icon: 'i-lucide-cake' },
  { value: 'Bridal Shower', label: 'Bridal Shower', icon: 'i-lucide-sparkles' },
  { value: 'Baby Shower', label: 'Baby Shower', icon: 'i-lucide-baby' },
  { value: 'Conference Lunch', label: 'Conference Lunch', icon: 'i-lucide-presentation' },
  { value: 'Gala', label: 'Gala', icon: 'i-lucide-crown' },
  { value: 'Cocktail Party', label: 'Cocktail Party', icon: 'i-lucide-wine' },
  { value: 'Graduation', label: 'Graduation', icon: 'i-lucide-graduation-cap' },
  { value: 'Other', label: 'Other', icon: 'i-lucide-more-horizontal' },
]

// ─── Validation ───────────────────────────────────────────────
const isValid = computed(() => {
  return !!form.TypeOfEvent && !!form.Date && !!form.StartTime && !!form.Venue && !!form.Guests
})

// ─── Generate Order ID ────────────────────────────────────────
function generateOrderId(): string {
  const year = new Date().getFullYear()
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `CAT-${year}-${rand}`
}

// ─── Submit ───────────────────────────────────────────────────
async function handleSubmit() {
  if (!isValid.value) {
    toast.error('Please fill in all required fields')
    return
  }

  submitting.value = true
  await new Promise(resolve => setTimeout(resolve, 800))

  const storageKey = 'tcg-orders-v1'
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')

  const newOrder = {
    id: `ord-${Date.now()}`,
    OrderID: generateOrderId(),
    ClientId: '',
    Name: '',
    Phone: '',
    Email: '',
    Company: '',
    ContactMethod: 'Website Form',
    OtherContactMethod: '',
    TypeOfEvent: form.TypeOfEvent,
    OtherTypeOfEvent: form.OtherTypeOfEvent,
    EventDetails: '',
    Date: form.Date,
    StartTime: form.StartTime,
    EndTime: '',
    Venue: form.Venue,
    Guests: form.Guests,
    Setting: '',
    Preferences: '',
    ServiceStyle: '',
    OtherStyle: '',
    Theme: '',
    Allergies: '',
    ServicesNeeded: 'Catering',
    OtherServicesNeeded: '',
    Budget: '',
    BudgetAdditionalInfo: '',
    MenuRecommendations: '',
    NeedSetup: '',
    HowDoYouKnow: '',
    OtherHowToKnow: '',
    Comments: `Quick catering order submitted via external form`,
    TimeStamp: new Date().toISOString(),
    Status: 'New',
  }

  existing.unshift(newOrder)
  localStorage.setItem(storageKey, JSON.stringify(existing))

  submitting.value = false
  submitted.value = true
  toast.success('Catering order submitted successfully!')
}

function resetForm() {
  Object.keys(form).forEach(k => (form as any)[k] = '')
  submitted.value = false
}

function formatSelectedDate(d: string) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }
  catch { return d }
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-3xl mx-auto">
    <!-- Success State -->
    <template v-if="submitted">
      <div class="flex flex-col items-center justify-center py-20 gap-6">
        <div class="relative">
          <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
          <div class="relative flex items-center justify-center size-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20">
            <Icon name="i-lucide-check-circle-2" class="size-12 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-bold tracking-tight">Catering Request Submitted!</h2>
          <p class="text-muted-foreground max-w-md">
            Thank you! We've received your catering request. Our team will prepare a proposal and contact you soon.
          </p>
        </div>

        <!-- Summary Card -->
        <Card class="w-full max-w-sm border-emerald-500/20">
          <div class="p-5 space-y-3">
            <h4 class="text-sm font-semibold text-center flex items-center justify-center gap-2">
              <Icon name="i-lucide-receipt" class="size-4 text-emerald-600" />
              Request Summary
            </h4>
            <Separator />
            <div class="space-y-2.5 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Event</span>
                <span class="font-medium">{{ form.TypeOfEvent || form.OtherTypeOfEvent }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Date</span>
                <span class="font-medium">{{ formatSelectedDate(form.Date) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Time</span>
                <span class="font-medium">{{ form.StartTime }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Venue</span>
                <span class="font-medium">{{ form.Venue }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Guests</span>
                <span class="font-medium">{{ form.Guests }}</span>
              </div>
            </div>
          </div>
        </Card>

        <div class="flex gap-3 pt-2">
          <NuxtLink to="/culture-gourmet-customer-portal">
            <Button variant="outline" size="lg" class="gap-2">
              <Icon name="i-lucide-arrow-left" class="size-4" />
              Back to Links
            </Button>
          </NuxtLink>
          <Button size="lg" class="gap-2" @click="resetForm">
            <Icon name="i-lucide-plus" class="size-4" />
            New Request
          </Button>
        </div>
      </div>
    </template>

    <!-- Form -->
    <template v-else>
      <!-- Hero -->
      <Card class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-teal-500/[0.03] to-transparent" />
        <div class="absolute -top-16 -right-16 size-48 rounded-full bg-emerald-500/5 blur-2xl" />
        <div class="relative z-10 p-6 md:p-8 flex items-center gap-5">
          <div class="flex items-center justify-center size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 shrink-0">
            <Icon name="i-lucide-utensils-crossed" class="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 class="text-xl font-bold tracking-tight">Quick Catering Request</h2>
            <p class="text-sm text-muted-foreground mt-1 leading-relaxed">
              Fill out these 5 essential details and we'll get started on your catering proposal right away.
            </p>
          </div>
        </div>
      </Card>

      <!-- Form Card -->
      <Card class="overflow-hidden">
        <form @submit.prevent="handleSubmit">
          <div class="p-6 md:p-8 space-y-8">

            <!-- 1. Type of Event -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-7 rounded-lg bg-violet-500/10 text-sm font-bold text-violet-600 dark:text-violet-400">1</div>
                <Label class="text-sm font-semibold">Type of Event <span class="text-destructive">*</span></Label>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                <button
                  v-for="type in eventTypes"
                  :key="type.value"
                  type="button"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-center group/btn"
                  :class="[
                    form.TypeOfEvent === type.value
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                      : 'border-border/50 hover:border-border hover:bg-muted/40',
                  ]"
                  @click="form.TypeOfEvent = type.value"
                >
                  <Icon
                    :name="type.icon"
                    class="size-5 transition-colors"
                    :class="form.TypeOfEvent === type.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover/btn:text-foreground'"
                  />
                  <span
                    class="text-[11px] font-medium leading-tight transition-colors"
                    :class="form.TypeOfEvent === type.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground group-hover/btn:text-foreground'"
                  >
                    {{ type.label }}
                  </span>
                </button>
              </div>
              <div v-if="form.TypeOfEvent === 'Other'" class="max-w-sm pt-1">
                <Input v-model="form.OtherTypeOfEvent" placeholder="Please specify the event type..." />
              </div>
            </div>

            <Separator />

            <!-- 2. Event Date -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-7 rounded-lg bg-pink-500/10 text-sm font-bold text-pink-600 dark:text-pink-400">2</div>
                <Label class="text-sm font-semibold">Event Date <span class="text-destructive">*</span></Label>
              </div>
              <div class="max-w-xs">
                <Input v-model="form.Date" type="date" />
              </div>
              <p v-if="form.Date" class="text-xs text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-calendar-check" class="size-3.5 text-emerald-500" />
                {{ formatSelectedDate(form.Date) }}
              </p>
            </div>

            <Separator />

            <!-- 3. Start Time -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-sm font-bold text-amber-600 dark:text-amber-400">3</div>
                <Label class="text-sm font-semibold">Event Start Time <span class="text-destructive">*</span></Label>
              </div>
              <div class="max-w-xs">
                <Input v-model="form.StartTime" type="time" />
              </div>
            </div>

            <Separator />

            <!-- 4. Venue -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-7 rounded-lg bg-sky-500/10 text-sm font-bold text-sky-600 dark:text-sky-400">4</div>
                <Label class="text-sm font-semibold">Venue <span class="text-destructive">*</span></Label>
              </div>
              <Input v-model="form.Venue" placeholder="Enter the venue name and address..." class="max-w-lg" />
            </div>

            <Separator />

            <!-- 5. Guests -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400">5</div>
                <Label class="text-sm font-semibold">Estimated Number of Guests <span class="text-destructive">*</span></Label>
              </div>
              <div class="max-w-xs">
                <Input v-model="form.Guests" type="number" placeholder="e.g. 100" min="1" />
              </div>
              <p v-if="Number(form.Guests) > 0" class="text-xs text-muted-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-users" class="size-3.5 text-emerald-500" />
                {{ Number(form.Guests).toLocaleString() }} {{ Number(form.Guests) === 1 ? 'guest' : 'guests' }}
              </p>
            </div>
          </div>

          <!-- Completion Indicator + Submit -->
          <div class="border-t bg-muted/20">
            <!-- Progress bar -->
            <div class="h-1 bg-muted">
              <div
                class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out rounded-r-full"
                :style="{
                  width: `${[form.TypeOfEvent, form.Date, form.StartTime, form.Venue, form.Guests].filter(Boolean).length * 20}%`
                }"
              />
            </div>

            <div class="px-6 md:px-8 py-4 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">
                  {{ [form.TypeOfEvent, form.Date, form.StartTime, form.Venue, form.Guests].filter(Boolean).length }} of 5 fields filled
                </span>
                <Badge
                  v-if="isValid"
                  variant="outline"
                  class="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  Ready to submit
                </Badge>
              </div>
              <div class="flex gap-2">
                <NuxtLink to="/culture-gourmet-customer-portal">
                  <Button variant="ghost" type="button" class="text-muted-foreground">Cancel</Button>
                </NuxtLink>
                <Button
                  type="submit"
                  :disabled="!isValid || submitting"
                  class="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                >
                  <Icon v-if="submitting" name="i-lucide-loader-2" class="size-4 animate-spin" />
                  <Icon v-else name="i-lucide-send" class="size-4" />
                  {{ submitting ? 'Submitting...' : 'Submit Request' }}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </template>
  </div>
</template>
