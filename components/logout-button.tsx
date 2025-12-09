"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface LogoutButtonProps {
  children?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function LogoutButton({
  children,
  className = "",
  onClick,
}: LogoutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = useCallback(async () => {
    if (onClick) onClick()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }, [router, supabase, onClick])

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
    >
      {children}
    </button>
  )
}
