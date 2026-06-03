'use server'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import createAdminClient from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function buildServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // no-op in route handler
      },
    },
  })
}

function generateTempPassword() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  try {
    const bytes = randomBytes(16)
    return Array.from({ length: 12 })
      .map((_, index) => alphabet[bytes[index] % alphabet.length])
      .join('')
  } catch (err) {
    // fallback to Math.random-based generation in environments where crypto may fail
    console.error('generateTempPassword: crypto.randomBytes failed, using fallback', err)
    return Array.from({ length: 12 })
      .map(() => Math.random().toString(36).slice(-2))
      .join('')
      .slice(0, 12)
  }
}

function buildPublicSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  if (!rawUrl) return ''
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl.replace(/\/$/, '')
  }
  return `https://${rawUrl.replace(/\/$/, '')}`
}

export async function POST(request: Request) {
  const serverSupabase = buildServerSupabase()
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[invite:POST] Owner/Admin autenticado:', { userId: user.id, email: user.email })

  const { data: profile, error: profileError } = await serverSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['admin', 'owner'].includes(profile.role)) {
    console.error('[invite:POST] Acesso negado:', { profileError, profile })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const name = typeof (body as any).name === 'string' ? (body as any).name.trim() : ''
  const email = typeof (body as any).email === 'string' ? (body as any).email.trim().toLowerCase() : ''
  const role = (body as any).role === 'tenant' ? 'tenant' : 'applicant'
  const mode = (body as any).mode === 'email' ? 'email' : 'password'

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 })
  }

  console.log('[invite:POST] Dados do novo usuário:', { name, email, role, mode })

  const publicSiteUrl = buildPublicSiteUrl()

  if (mode === 'email' && !publicSiteUrl) {
    return NextResponse.json({
      error: 'Convite por e-mail ainda não está configurado. Use senha temporária ou configure uma URL pública em Vercel.',
    }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({
      error: 'Configuração de serviço incompleta. Contate o administrador.'
    }, { status: 500 })
  }

  const tempPassword = mode === 'password' ? generateTempPassword() : null
  const payload: Record<string, unknown> = {
    email,
    user_metadata: { full_name: name },
  }

  if (mode === 'password') {
    payload.password = tempPassword
    payload.email_confirm = true
  } else {
    payload.email_confirm = false
    payload.email_redirect_to = `${publicSiteUrl}/login`
  }

  const { data: createData, error: createError } = await admin.auth.admin.createUser(payload)
  if (createError) {
    console.error('[invite:POST] Erro ao criar usuário Auth:', createError)
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const userId = (createData as any).user?.id
  console.log('[invite:POST] Novo usuário criado no Auth:', { userId, email, tempPassword })

  if (!userId) {
    console.error('[invite:POST] Falha: userId é null/undefined após createUser')
    return NextResponse.json({ error: 'Falha ao criar usuário.' }, { status: 500 })
  }

  // Verificar se profile já existe
  const { data: existingProfile, error: checkError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  console.log('[invite:POST] Verificando profile existente:', { userId, exists: !!existingProfile, checkError })

  let upsertError
  if (existingProfile) {
    // UPDATE se já existir
    const { error: updateErr } = await admin.from('profiles').update({
      email,
      full_name: name,
      role,
    }).eq('id', userId)
    upsertError = updateErr
    console.log('[invite:POST] Profile atualizado (UPDATE):', { userId, email, role, error: updateErr })
  } else {
    // INSERT se não existir
    const { error: insertErr } = await admin.from('profiles').insert([
      { id: userId, email, full_name: name, role },
    ])
    upsertError = insertErr
    console.log('[invite:POST] Profile criado (INSERT):', { userId, email, role, error: insertErr })
  }

  if (upsertError) {
    console.error('[invite:POST] Erro ao salvar profile:', { userId, email, error: upsertError })
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  console.log('[invite:POST] Sucesso completo:', { userId, email, role, tempPassword })

  if (mode === 'email') {
    return NextResponse.json({ ok: true, inviteByEmail: true, role, email, userId })
  }

  return NextResponse.json({ ok: true, tempPassword, email, role, userId })
}
