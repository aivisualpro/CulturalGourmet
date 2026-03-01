import { Category } from '../models/Category'
import { Consumption } from '../models/Consumption'
import { Vendor } from '../models/Vendor'

export default defineEventHandler(async () => {
    // ─── Parallel data fetch ────────────────────────────────────
    const [categories, vendors, allConsumptions] = await Promise.all([
        Category.find().lean(),
        Vendor.find().lean(),
        Consumption.find().sort({ date: -1 }).lean(),
    ])

    // ─── Summary KPIs ──────────────────────────────────────────
    const totalCategories = categories.length
    const activeCategories = categories.filter((c: any) => c.status === 'active').length
    const totalVendors = vendors.length
    const totalConsumptions = allConsumptions.length
    const totalSpend = allConsumptions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

    // ─── Date helpers ──────────────────────────────────────────
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prev month

    // This month spend
    const thisMonthSpend = allConsumptions
        .filter((c: any) => new Date(c.date) >= currentMonthStart && new Date(c.date) <= today)
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

    // Last month spend
    const lastMonthSpend = allConsumptions
        .filter((c: any) => new Date(c.date) >= lastMonthStart && new Date(c.date) <= lastMonthEnd)
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

    // Monthly trend percentage
    const monthlyTrend = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend * 100) : 0

    // ─── Today's spend ─────────────────────────────────────────
    const todayEnd = new Date(today)
    todayEnd.setDate(todayEnd.getDate() + 1)
    const todaySpend = allConsumptions
        .filter((c: any) => new Date(c.date) >= today && new Date(c.date) < todayEnd)
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

    // ─── Spend by category (all time) ─────────────────────────
    const spendByCategory: Record<string, number> = {}
    allConsumptions.forEach((c: any) => {
        spendByCategory[c.category] = (spendByCategory[c.category] || 0) + (c.amount || 0)
    })
    const categoryBreakdown = Object.entries(spendByCategory)
        .map(([name, total]) => {
            const cat = categories.find((c: any) => c.name === name)
            return { name, total, color: (cat as any)?.color || 'blue' }
        })
        .sort((a, b) => b.total - a.total)

    // ─── Daily spend trend (last 30 days) ─────────────────────
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyMap: Record<string, number> = {}
    allConsumptions
        .filter((c: any) => new Date(c.date) >= thirtyDaysAgo)
        .forEach((c: any) => {
            const d = new Date(c.date)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            dailyMap[key] = (dailyMap[key] || 0) + (c.amount || 0)
        })

    // Fill all 30 days
    const dailyTrend: { date: string, amount: number }[] = []
    for (let i = 30; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        dailyTrend.push({ date: key, amount: dailyMap[key] || 0 })
    }

    // ─── Weekly spend (last 12 weeks) ─────────────────────────
    const twelveWeeksAgo = new Date(today)
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84) // 12 * 7

    const weeklyMap: Record<string, number> = {}
    allConsumptions
        .filter((c: any) => new Date(c.date) >= twelveWeeksAgo)
        .forEach((c: any) => {
            const d = new Date(c.date)
            // Get the ISO week start (Monday)
            const dayOfWeek = d.getDay()
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
            const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
            weeklyMap[key] = (weeklyMap[key] || 0) + (c.amount || 0)
        })

    const weeklyTrend = Object.entries(weeklyMap)
        .map(([weekStart, amount]) => ({ weekStart, amount }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

    // ─── Category spend by month (last 6 months) ──────────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthlyCategoryMap: Record<string, Record<string, number>> = {}

    allConsumptions
        .filter((c: any) => new Date(c.date) >= sixMonthsAgo)
        .forEach((c: any) => {
            const d = new Date(c.date)
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (!monthlyCategoryMap[monthKey]) monthlyCategoryMap[monthKey] = {}
            monthlyCategoryMap[monthKey]![c.category] = (monthlyCategoryMap[monthKey]![c.category] || 0) + (c.amount || 0)
        })

    // Get unique categories from the data
    const allCatNames = [...new Set(allConsumptions.map((c: any) => c.category))]
    const monthlyBreakdown = Object.entries(monthlyCategoryMap)
        .map(([month, cats]) => {
            const row: Record<string, any> = { month }
            allCatNames.forEach((cat) => { row[cat] = cats[cat] || 0 })
            return row
        })
        .sort((a, b) => a.month.localeCompare(b.month))

    // ─── Recent consumptions (last 10) ────────────────────────
    const recentConsumptions = allConsumptions.slice(0, 10).map((c: any) => ({
        _id: c._id,
        date: c.date,
        category: c.category,
        subCategory: c.subCategory,
        amount: c.amount,
        remarks: c.remarks,
    }))

    // ─── Top sub-categories ───────────────────────────────────
    const subCatMap: Record<string, number> = {}
    allConsumptions.forEach((c: any) => {
        const key = `${c.category} → ${c.subCategory}`
        subCatMap[key] = (subCatMap[key] || 0) + (c.amount || 0)
    })
    const topSubCategories = Object.entries(subCatMap)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)

    // ─── Vendor summary ───────────────────────────────────────
    const totalContacts = vendors.reduce((sum: number, v: any) => sum + (v.contacts?.length || 0), 0)

    return {
        kpis: {
            totalCategories,
            activeCategories,
            totalVendors,
            totalContacts,
            totalConsumptions,
            totalSpend,
            thisMonthSpend,
            lastMonthSpend,
            monthlyTrend,
            todaySpend,
        },
        categoryBreakdown,
        dailyTrend,
        weeklyTrend,
        monthlyBreakdown,
        allCatNames,
        recentConsumptions,
        topSubCategories,
    }
})
