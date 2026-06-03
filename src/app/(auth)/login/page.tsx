'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await supabase.auth.signInWithPassword({ email, password })
    console.log('handleLogin: signInWithPassword result', result)
    setLoading(false)

    if (result.error) {
      console.error('handleLogin: auth error', result.error.message)
      let msg = 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.'
      if (result.error.message?.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos.'
      } else if (result.error.message?.includes('Email not confirmed')) {
        msg = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.'
      } else if (result.error.message?.includes('User not found')) {
        msg = 'Usuário não encontrado.'
      }
      setError(msg)
      return
    }

    // Get user and profile to decide redirect
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    console.log('handleLogin: current user', user?.id)
    if (!user) {
      console.error('handleLogin: user not found after login')
      router.replace('/login')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    console.log('handleLogin: profile role', profile?.role)
    const role = profile?.role ?? 'applicant'
    
    if (role === 'owner' || role === 'admin' || role === 'tenant') {
      console.log('handleLogin: redirecting to /dashboard')
      router.replace('/dashboard')
    } else if (role === 'applicant') {
      console.log('handleLogin: redirecting to /documentos')
      router.replace('/documentos')
    } else {
      console.log('handleLogin: redirecting to /dashboard (default)')
      router.replace('/dashboard')
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    })
    console.log('handleReset: resetPasswordForEmail result', { error })
    setLoading(false)

    if (error) {
      console.error('handleReset: error', error.message)
      setError('Não foi possível enviar o e-mail de recuperação. Verifique se o e-mail existe e tente novamente.')
      return
    }

    setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada (e a pasta de spam).')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Juruá302</h1>
          <p className="mt-1 text-sm text-slate-400">
            Portal Juruá302 · Joinville SC
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {mode === 'login' ? (
            <>
              <h2 className="mb-6 text-center text-lg font-semibold text-gray-900">Entrar</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>

              <button
                onClick={() => { setMode('reset'); setError('') }}
                className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-center text-lg font-semibold text-gray-900">Recuperar senha</h2>
              <p className="mb-6 text-center text-sm text-gray-500">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              {success ? (
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="label">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="input pl-9"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? 'Enviando…' : 'Enviar link de recuperação'}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
              >
                Voltar ao login
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Acesso privado. Entre em contato com a administração para solicitar acesso.
        </p>
      </div>
    </main>
  )
}
