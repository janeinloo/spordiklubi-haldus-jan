"use client"

import { useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GlassPanelSmall } from "@/components/ui/glasspanel-small"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/auth/login")
    }, 10000) // 10 seconds

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <GlassPanelSmall className="mx-auto">
        <Card className="bg-transparent shadow-none border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl text-white text-center leading-tight">
              Thank you for signing up!
            </CardTitle>

            <CardDescription className="text-lg text-white/80 text-center leading-tight">
              Check your email to confirm
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-1">
            <p className="text-base text-white/70 text-center leading-relaxed">
              You&apos;ve successfully signed up. Please check your email to
              confirm your account before signing in.
            </p>
          </CardContent>
        </Card>
      </GlassPanelSmall>
    </div>
  )
}
