import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { current, next } = await req.json()

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: current,
  })

  if (reauthError) {
    return NextResponse.json({ error: "Incorrect current password" }, { status: 400 })
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: next,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
