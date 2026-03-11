import { User } from '../../models/User'
import { hashPassword } from '../../utils/auth'

/**
 * Seeds the two super admin accounts.
 * Idempotent — safe to call multiple times.
 */
export default defineEventHandler(async () => {
  const admins = [
    {
      name: 'Adeel Jabbar',
      email: 'admin@aivisualpro.com',
      password: hashPassword('Abc123***'),
      role: 'super_admin',
      provider: 'email',
      emailVerified: true,
      approvalStatus: 'approved',
      isActive: true,
    },
    {
      name: 'Aaron Gadson',
      email: 'aaron@crab-cab.com',
      password: hashPassword('Abc123***'),
      role: 'super_admin',
      provider: 'email',
      emailVerified: true,
      approvalStatus: 'approved',
      isActive: true,
    },
  ]

  const results = []

  for (const admin of admins) {
    const existing = await User.findOne({ email: admin.email })
    if (existing) {
      // Update to ensure super_admin role and correct password
      existing.role = 'super_admin'
      existing.name = admin.name
      existing.password = admin.password
      existing.emailVerified = true
      existing.approvalStatus = 'approved'
      existing.isActive = true
      await existing.save()
      results.push({ email: admin.email, status: 'updated' })
    }
    else {
      await User.create(admin)
      results.push({ email: admin.email, status: 'created' })
    }
  }

  return {
    success: true,
    message: 'Super admin accounts seeded successfully',
    results,
  }
})
