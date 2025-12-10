"use client"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { SignupButton } from "@/components/ui/signupbutton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { PasswordInfo } from "./password-info"
import { GlassPanel } from "@/components/ui/glasspanel"

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Password must be at least 8 characters long."
    if (!/[A-Z]/.test(pw))
      return "Password must contain at least one uppercase letter."
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number."
    if (!/[^A-Za-z0-9]/.test(pw))
      return "Password must contain at least one special character."
    return null
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setIsLoading(false)
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      router.push("/auht/login")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full",
        className,
      )}
      {...props}
    >
      <GlassPanel heading="Reset Your Password">
        <form onSubmit={handleForgotPassword}>
          <div className="flex flex-col gap-6">
            {/* New Password */}
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="password"
                  className="text-white/90 text-base"
                >
                  New password
                </Label>
                <PasswordInfo />
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-400"
                />

                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70"
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2">
              <Label
                htmlFor="confirmPassword"
                className="text-white/90 text-base"
              >
                Confirm password
              </Label>

              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-400"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70"
                  onClick={() => setShowConfirm(prev => !prev)}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-red-300">{error}</p>}

            {/* Submit */}
            <SignupButton
              type="submit"
              isLoading={isLoading}
              label="Save password"
              className="w-[35%] h-[45px] mx-auto py-2 text-xl"
            />
          </div>
        </form>
      </GlassPanel>
    </div>
  )
}
