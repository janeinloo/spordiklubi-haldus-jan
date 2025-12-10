import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  })

  if (reauthError) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 })
  }

  const { error: updateError } = await supabase.auth.updateUser({
    email,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

    const { error: profileError } = await supabase
    .from("profile")
    .update({ "email": email })
    .eq("id", user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
