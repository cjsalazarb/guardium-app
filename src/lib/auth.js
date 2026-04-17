import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [contractId, setContractId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUserProfile(session.user.id)
      else { setUser(null); setRole(null); setContractId(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setUser(data)
      setRole(data.role)
      setContractId(data.contract_id)
    }
    setLoading(false)
  }

  const signOut = () => supabase.auth.signOut()
  return { user, role, contractId, loading, signOut }
}
