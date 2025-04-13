import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { type User } from '@supabase/supabase-js'
import { StateCreator } from 'zustand'

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

const initialState = {
  user: null,
  isLoading: true, // Start as loading until session is checked
  error: null,
}

// Define the slice creator with explicit types
const createAuthSlice: StateCreator<AuthState, [["zustand/persist", unknown]]> = (set) => ({
  ...initialState,
  setUser: (user: User | null) => set({ user, isLoading: false, error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error, isLoading: false }),
  clearAuth: () => set({ ...initialState, isLoading: false }),
})

// Note: Persisting the entire user object might not be ideal
// due to size and potential stale data. Consider persisting only
// essential info like user ID or session status, and fetching the
// full user object when needed. For simplicity now, we persist the user.
export const useAuthStore = create<AuthState>()(
  persist(
    createAuthSlice, // Use the typed slice creator
    {
      name: 'auth-storage', // unique name
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
      // Optionally, only persist parts of the state:
      // partialize: (state) => ({ user: state.user }),
    }
  )
)

// Optional: Add a hook to initialize the store with the current session on mount
// This would typically be used in a root layout or provider
import { useEffect } from 'react'
import { createClient } from '@/core/supabase/client'

export const useInitializeAuthStore = () => {
  const { setUser, setLoading, user } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    // Only run if user isn't already set (e.g., from storage)
    if (!user) {
      setLoading(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      }).catch((error) => {
        console.error("Error getting session:", error);
        // Handle error appropriately, maybe set an error state in the store
        setUser(null); // Ensure user is null on error
      }).finally(() => {
        setLoading(false);
      })
    } else {
      setLoading(false); // Already have user, not loading
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase, setUser, setLoading, user]) // Add user to dependency array
} 