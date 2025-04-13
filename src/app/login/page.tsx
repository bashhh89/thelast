'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { LoginForm } from '@/features/auth/components/login-form'
import { createClient } from '@/core/supabase/client' // Use browser client

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    setLoading(false)

    if (error) {
      console.error('Login error:', error.message)
      setError(error.message)
    } else {
      // Redirect to home page or dashboard after successful login
      router.push('/') 
      router.refresh() // Refresh server components to reflect auth state
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <LoginForm onSubmit={handleLogin} loading={loading} error={error} />
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
} 