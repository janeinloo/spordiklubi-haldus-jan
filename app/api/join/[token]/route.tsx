import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ token: string }>
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()

  const { token } = await context.params

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 })
  }

  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }

  const userId = session.user.id

  const { data: invite, error: inviteError } = await supabase
    .from("club_invite")
    .select("*")
    .eq("token", token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 400 })
  }

  const { data: club, error: clubError } = await supabase
    .from("club")
    .select("id, slug")
    .eq("club_invite_id", invite.id)
    .single()

  if (clubError || !club) {
    console.log("Invite found:", invite)
    console.log("Club found:", club)

    return NextResponse.json(
      { error: "Club not found for this invite" },
      { status: 400 }
    )
  }

  const { error: memberError } = await supabase
    .from("member")
    .upsert({
      profile_id: userId,
      club_id: club.id,
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  return NextResponse.json({ clubSlug: club.slug })
}