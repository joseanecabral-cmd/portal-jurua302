import type { NextApiRequest, NextApiResponse } from 'next'
import createAdminClient from '@/lib/supabase/admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, full_name } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

  try {
    const admin = createAdminClient()

    // Check if any owner exists
    const { data: owners, error: qerr } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .limit(1)

    if (qerr) throw qerr
    if (owners && owners.length > 0) {
      return res.status(409).json({ error: 'Owner already exists' })
    }

    // Create user in Auth
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (createErr) throw createErr

    const user = (createData as any).user
    if (!user) return res.status(500).json({ error: 'Failed to create user' })

    // Insert profile with role owner
    const { error: piErr } = await admin
      .from('profiles')
      .insert([{ id: user.id, email, full_name: full_name ?? email.split('@')[0], role: 'owner' }])

    if (piErr) throw piErr

    return res.status(201).json({ ok: true })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
