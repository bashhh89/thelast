'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { RegisterForm } from '@/features/auth/components/register-form'
import { createClient } from '@/core/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const handleRegister = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      // Optionally add options like emailRedirectTo:
      // options: {
      //   emailRedirectTo: `${location.origin}/auth/callback`,
      // },
    })

    setLoading(false)

    if (error) {
      console.error('Registration error:', error.message)
      setError(error.message)
    } else {
      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        // This case might happen with email confirmation disabled or certain auth settings.
        // Directly redirect or show a generic success message.
        setMessage('Registration successful! Redirecting...')
        // Add a small delay before redirecting to allow message visibility
        setTimeout(() => router.push('/'), 2000) 
      } else {
        // Standard case with email confirmation likely required
        setMessage('Registration successful! Please check your email to confirm your account.')
        // Optionally redirect to login page after a delay or keep user here
        // setTimeout(() => router.push('/login'), 5000)
      }
      // router.refresh() // Refresh might not be needed immediately on signup page
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <RegisterForm onSubmit={handleRegister} loading={loading} error={error} />
        {message && (
          <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center">
            {message}
          </p>
        )}
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
} 