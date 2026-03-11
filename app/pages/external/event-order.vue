<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'blank' })
useHead({ title: 'New Event Order — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'New Event Order', icon: 'i-lucide-calendar-plus', description: 'Submit a new event & catering inquiry' })

// ─── Form State ───────────────────────────────────────────────
const activeStep = ref(0)
const submitted = ref(false)
const submitting = ref(false)

interface OrderForm {
  Name: string
  Phone: string
  Email: string
  Company: string
  ContactMethod: string
  OtherContactMethod: string
  TypeOfEvent: string
  OtherTypeOfEvent: string
  EventDetails: string
  Date: string
  StartTime: string
  EndTime: string
  Venue: string
  Guests: string
  Setting: string
  Preferences: string
  ServiceStyle: string
  OtherStyle: string
  Theme: string
  Allergies: string
  ServicesNeeded: string
  OtherServicesNeeded: string
  Budget: string
  BudgetAdditionalInfo: string
  MenuRecommendations: string
  NeedSetup: string
  HowDoYouKnow: string
  OtherHowToKnow: string
  Comments: string
}

const form = reactive<OrderForm>({
  Name: '',
  Phone: '',
  Email: '',
  Company: '',
  ContactMethod: '',
  OtherContactMethod: '',
  TypeOfEvent: '',
  OtherTypeOfEvent: '',
  EventDetails: '',
  Date: '',
  StartTime: '',
  EndTime: '',
  Venue: '',
  Guests: '',
  Setting: '',
  Preferences: '',
  ServiceStyle: '',
  OtherStyle: '',
  Theme: '',
  Allergies: '',
  ServicesNeeded: '',
  OtherServicesNeeded: '',
  Budget: '',
  BudgetAdditionalInfo: '',
  MenuRecommendations: '',
  NeedSetup: '',
  HowDoYouKnow: '',
  OtherHowToKnow: '',
  Comments: '',
})

const steps = [
  { id: 'client', label: 'Your Details', icon: 'i-lucide-user', subtitle: 'Tell us about you' },
  { id: 'event', label: 'Event Info', icon: 'i-lucide-calendar-heart', subtitle: 'Describe your event' },
  { id: 'budget', label: 'Budget & Menu', icon: 'i-lucide-wallet', subtitle: 'Budget & preferences' },
  { id: 'final', label: 'Final Details', icon: 'i-lucide-check-circle', subtitle: 'Almost done' },
]

function canProceed(): boolean {
  if (activeStep.value === 0) return !!form.Name && !!form.Email
  if (activeStep.value === 1) return !!form.TypeOfEvent && !!form.Date && !!form.Venue
  return true
}

function nextStep() {
  if (activeStep.value < steps.length - 1) activeStep.value++
}

function prevStep() {
  if (activeStep.value > 0) activeStep.value--
}

// ─── Generate Order ID ────────────────────────────────────────
function generateOrderId(): string {
  const year = new Date().getFullYear()
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `ORD-${year}-${rand}`
}

// ─── Submit to localStorage (same store as orders page) ───────
async function handleSubmit() {
  if (!form.Name || !form.Email) {
    toast.error('Please fill in your name and email')
    activeStep.value = 0
    return
  }
  if (!form.TypeOfEvent || !form.Date) {
    toast.error('Please fill in the event type and date')
    activeStep.value = 1
    return
  }

  submitting.value = true

  // Simulate a brief delay for UX
  await new Promise(resolve => setTimeout(resolve, 800))

  const storageKey = 'tcg-orders-v1'
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')

  const newOrder = {
    id: `ord-${Date.now()}`,
    OrderID: generateOrderId(),
    ClientId: '',
    Name: form.Name,
    Phone: form.Phone,
    Email: form.Email,
    Company: form.Company,
    ContactMethod: form.ContactMethod || 'Website Form',
    OtherContactMethod: form.OtherContactMethod,
    TypeOfEvent: form.TypeOfEvent,
    OtherTypeOfEvent: form.OtherTypeOfEvent,
    EventDetails: form.EventDetails,
    Date: form.Date,
    StartTime: form.StartTime,
    EndTime: form.EndTime,
    Venue: form.Venue,
    Guests: form.Guests,
    Setting: form.Setting,
    Preferences: form.Preferences,
    ServiceStyle: form.ServiceStyle,
    OtherStyle: form.OtherStyle,
    Theme: form.Theme,
    Allergies: form.Allergies,
    ServicesNeeded: form.ServicesNeeded,
    OtherServicesNeeded: form.OtherServicesNeeded,
    Budget: form.Budget,
    BudgetAdditionalInfo: form.BudgetAdditionalInfo,
    MenuRecommendations: form.MenuRecommendations,
    NeedSetup: form.NeedSetup,
    HowDoYouKnow: form.HowDoYouKnow,
    OtherHowToKnow: form.OtherHowToKnow,
    Comments: form.Comments,
    TimeStamp: new Date().toISOString(),
    Status: 'New',
  }

  existing.unshift(newOrder)
  localStorage.setItem(storageKey, JSON.stringify(existing))

  submitting.value = false
  submitted.value = true
  toast.success('Your event order has been submitted!')
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto">
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
          <h2 class="text-2xl font-bold tracking-tight">Order Submitted!</h2>
          <p class="text-muted-foreground max-w-md">
            Thank you for your inquiry! Our team will review your event details and get back to you shortly.
          </p>
        </div>
        <div class="flex gap-3 pt-4">
          <NuxtLink to="/culture-gourmet-customer-portal">
            <Button variant="outline" size="lg" class="gap-2">
              <Icon name="i-lucide-arrow-left" class="size-4" />
              Back to Links
            </Button>
          </NuxtLink>
          <Button size="lg" class="gap-2" @click="submitted = false; Object.keys(form).forEach(k => (form as any)[k] = ''); activeStep = 0">
            <Icon name="i-lucide-plus" class="size-4" />
            Submit Another
          </Button>
        </div>
      </div>
    </template>

    <!-- Form -->
    <template v-else>
      <!-- Stepper Header -->
      <Card class="p-6 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-violet-500/[0.03] via-transparent to-emerald-500/[0.03]" />
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-bold tracking-tight">Event Order Form</h2>
              <p class="text-xs text-muted-foreground mt-0.5">Fill out the details for your event</p>
            </div>
            <Badge variant="outline" class="text-xs tabular-nums">
              Step {{ activeStep + 1 }} of {{ steps.length }}
            </Badge>
          </div>

          <!-- Step Indicators -->
          <div class="flex items-center gap-2">
            <template v-for="(step, i) in steps" :key="step.id">
              <button
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 text-left flex-1 min-w-0"
                :class="[
                  i === activeStep
                    ? 'bg-primary/10 border border-primary/20 shadow-sm'
                    : i < activeStep
                      ? 'bg-emerald-500/5 border border-emerald-500/10'
                      : 'bg-muted/40 border border-transparent hover:bg-muted/60',
                ]"
                @click="i <= activeStep ? activeStep = i : null"
              >
                <div
                  class="flex items-center justify-center size-8 rounded-lg shrink-0 transition-colors"
                  :class="[
                    i === activeStep
                      ? 'bg-primary text-primary-foreground'
                      : i < activeStep
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground',
                  ]"
                >
                  <Icon v-if="i < activeStep" name="i-lucide-check" class="size-4" />
                  <Icon v-else :name="step.icon" class="size-4" />
                </div>
                <div class="min-w-0 hidden sm:block">
                  <p class="text-xs font-semibold truncate" :class="i === activeStep ? 'text-foreground' : 'text-muted-foreground'">
                    {{ step.label }}
                  </p>
                  <p class="text-[10px] text-muted-foreground truncate">{{ step.subtitle }}</p>
                </div>
              </button>
              <div v-if="i < steps.length - 1" class="hidden lg:block">
                <Icon name="i-lucide-chevron-right" class="size-4 text-muted-foreground/40" />
              </div>
            </template>
          </div>
        </div>
      </Card>

      <!-- Step Content -->
      <Card class="overflow-hidden">
        <div class="p-6 md:p-8">
          <!-- Step 1: Client Info -->
          <div v-show="activeStep === 0" class="space-y-5">
            <div class="flex items-center gap-3 mb-6">
              <div class="flex items-center justify-center size-10 rounded-xl bg-violet-500/10">
                <Icon name="i-lucide-user" class="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 class="font-semibold">Your Information</h3>
                <p class="text-xs text-muted-foreground">Tell us who you are</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <Label>Full Name <span class="text-destructive">*</span></Label>
                <Input v-model="form.Name" placeholder="Jane Smith" required />
              </div>
              <div class="space-y-1.5">
                <Label>Email <span class="text-destructive">*</span></Label>
                <Input v-model="form.Email" type="email" placeholder="jane@example.com" required />
              </div>
              <div class="space-y-1.5">
                <Label>Phone</Label>
                <Input v-model="form.Phone" placeholder="+1 (555) 000-0000" />
              </div>
              <div class="space-y-1.5">
                <Label>Company</Label>
                <Input v-model="form.Company" placeholder="Acme Corp" />
              </div>
              <div class="space-y-1.5">
                <Label>How did you find us?</Label>
                <Select v-model="form.HowDoYouKnow">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Google Search">Google Search</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Friend Referral">Friend Referral</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>Preferred Contact Method</Label>
                <Select v-model="form.ContactMethod">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div v-if="form.HowDoYouKnow === 'Other'" class="space-y-1.5">
                <Label>Please specify</Label>
                <Input v-model="form.OtherHowToKnow" placeholder="How you found us..." />
              </div>
              <div v-if="form.ContactMethod === 'Other'" class="space-y-1.5">
                <Label>Other Contact Method</Label>
                <Input v-model="form.OtherContactMethod" placeholder="Specify..." />
              </div>
            </div>
          </div>

          <!-- Step 2: Event Info -->
          <div v-show="activeStep === 1" class="space-y-5">
            <div class="flex items-center gap-3 mb-6">
              <div class="flex items-center justify-center size-10 rounded-xl bg-pink-500/10">
                <Icon name="i-lucide-calendar-heart" class="size-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 class="font-semibold">Event Details</h3>
                <p class="text-xs text-muted-foreground">Tell us about the event</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <Label>Type of Event <span class="text-destructive">*</span></Label>
                <Select v-model="form.TypeOfEvent">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wedding Reception">Wedding Reception</SelectItem>
                    <SelectItem value="Corporate Dinner">Corporate Dinner</SelectItem>
                    <SelectItem value="Birthday Party">Birthday Party</SelectItem>
                    <SelectItem value="Bridal Shower">Bridal Shower</SelectItem>
                    <SelectItem value="Baby Shower">Baby Shower</SelectItem>
                    <SelectItem value="Conference Lunch">Conference Lunch</SelectItem>
                    <SelectItem value="Gala">Gala</SelectItem>
                    <SelectItem value="Cocktail Party">Cocktail Party</SelectItem>
                    <SelectItem value="Graduation">Graduation</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div v-if="form.TypeOfEvent === 'Other'" class="space-y-1.5">
                <Label>Other Event Type</Label>
                <Input v-model="form.OtherTypeOfEvent" placeholder="Specify..." />
              </div>
              <div class="space-y-1.5">
                <Label>Event Date <span class="text-destructive">*</span></Label>
                <Input v-model="form.Date" type="date" />
              </div>
              <div class="space-y-1.5">
                <Label>Start Time</Label>
                <Input v-model="form.StartTime" placeholder="6:00 PM" />
              </div>
              <div class="space-y-1.5">
                <Label>End Time</Label>
                <Input v-model="form.EndTime" placeholder="10:00 PM" />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Venue <span class="text-destructive">*</span></Label>
                <Input v-model="form.Venue" placeholder="The Grand Ball, Downtown..." />
              </div>
              <div class="space-y-1.5">
                <Label>Number of Guests</Label>
                <Input v-model="form.Guests" type="number" placeholder="100" />
              </div>
              <div class="space-y-1.5">
                <Label>Setting</Label>
                <Select v-model="form.Setting">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indoor">Indoor</SelectItem>
                    <SelectItem value="Outdoor">Outdoor</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>Service Style</Label>
                <Select v-model="form.ServiceStyle">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plated">Plated</SelectItem>
                    <SelectItem value="Buffet">Buffet</SelectItem>
                    <SelectItem value="Stations">Stations</SelectItem>
                    <SelectItem value="Family Style">Family Style</SelectItem>
                    <SelectItem value="Cocktail">Cocktail</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>Theme</Label>
                <Input v-model="form.Theme" placeholder="Black & Gold, Garden Floral..." />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Allergies / Dietary Requirements</Label>
                <Input v-model="form.Allergies" placeholder="Nuts, Gluten, Dairy..." />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Services Needed</Label>
                <Input v-model="form.ServicesNeeded" placeholder="Catering, Bar Service, Waitstaff, Setup..." />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Event Details</Label>
                <Textarea v-model="form.EventDetails" rows="3" placeholder="Additional details about the event..." />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Preferences</Label>
                <Textarea v-model="form.Preferences" rows="2" placeholder="Dietary preferences, style notes..." />
              </div>
            </div>
          </div>

          <!-- Step 3: Budget -->
          <div v-show="activeStep === 2" class="space-y-5">
            <div class="flex items-center gap-3 mb-6">
              <div class="flex items-center justify-center size-10 rounded-xl bg-amber-500/10">
                <Icon name="i-lucide-wallet" class="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 class="font-semibold">Budget & Menu</h3>
                <p class="text-xs text-muted-foreground">Your budget and menu preferences</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <Label>Budget</Label>
                <Input v-model="form.Budget" placeholder="$10,000" />
              </div>
              <div class="space-y-1.5">
                <Label>Need Setup?</Label>
                <Select v-model="form.NeedSetup">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Budget Additional Info</Label>
                <Input v-model="form.BudgetAdditionalInfo" placeholder="Flexible for upgrades, strict budget..." />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-1.5">
                <Label>Menu Recommendations</Label>
                <Textarea v-model="form.MenuRecommendations" rows="4" placeholder="Mediterranean spread, custom cake, taco bar..." />
              </div>
            </div>
          </div>

          <!-- Step 4: Final -->
          <div v-show="activeStep === 3" class="space-y-5">
            <div class="flex items-center gap-3 mb-6">
              <div class="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10">
                <Icon name="i-lucide-check-circle" class="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 class="font-semibold">Almost Done!</h3>
                <p class="text-xs text-muted-foreground">Any additional comments or notes</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-1.5">
                <Label>Comments / Special Requests</Label>
                <Textarea v-model="form.Comments" rows="5" placeholder="Any additional notes, special requests, or things we should know..." />
              </div>

              <!-- Summary Preview -->
              <div class="rounded-xl bg-muted/40 border p-5 space-y-4">
                <h4 class="text-sm font-semibold flex items-center gap-2">
                  <Icon name="i-lucide-clipboard-check" class="size-4 text-primary" />
                  Order Summary
                </h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-xs text-muted-foreground">Name</p>
                    <p class="font-medium">{{ form.Name || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Email</p>
                    <p class="font-medium break-all">{{ form.Email || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Event Type</p>
                    <p class="font-medium">{{ form.TypeOfEvent || form.OtherTypeOfEvent || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Event Date</p>
                    <p class="font-medium">{{ form.Date || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Venue</p>
                    <p class="font-medium">{{ form.Venue || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Guests</p>
                    <p class="font-medium">{{ form.Guests || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Budget</p>
                    <p class="font-medium text-primary">{{ form.Budget || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Service Style</p>
                    <p class="font-medium">{{ form.ServiceStyle || '—' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Footer -->
        <div class="border-t px-6 md:px-8 py-4 flex items-center justify-between bg-muted/20">
          <Button
            v-if="activeStep > 0"
            variant="outline"
            class="gap-2"
            @click="prevStep"
          >
            <Icon name="i-lucide-arrow-left" class="size-4" />
            Back
          </Button>
          <div v-else />

          <div class="flex gap-2">
            <NuxtLink to="/culture-gourmet-customer-portal">
              <Button variant="ghost" class="text-muted-foreground">Cancel</Button>
            </NuxtLink>
            <Button
              v-if="activeStep < steps.length - 1"
              :disabled="!canProceed()"
              class="gap-2"
              @click="nextStep"
            >
              Continue
              <Icon name="i-lucide-arrow-right" class="size-4" />
            </Button>
            <Button
              v-else
              class="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="i-lucide-loader-2" class="size-4 animate-spin" />
              <Icon v-else name="i-lucide-send" class="size-4" />
              {{ submitting ? 'Submitting...' : 'Submit Order' }}
            </Button>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>
