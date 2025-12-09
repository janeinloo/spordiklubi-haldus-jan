// app/api/clubs/[clubId]/invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

type RouteContext = {
  params: { clubId: string }
}

// GET endpoint to get invite token for a club
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()
  const club_id = parseInt(context.params.clubId)

  const { data: existingInvite_id, error: fetchError } = await supabase
    .from("club")
    .select("club_invite_id")
    .eq("id", club_id)
    .maybeSingle()

  if (fetchError || !existingInvite_id) {
    return NextResponse.json({ inviteLink: null })
  }

  const { data: existingToken } = await supabase
    .from("club_invite")
    .select("token")
    .eq("id", existingInvite_id.club_invite_id)
    .maybeSingle()

  return NextResponse.json({ token: existingToken?.token })
}

// POST endpoint to generate a new invite token for a club
export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()

  const club_id = parseInt(context.params.clubId)
  const token = randomUUID()

  const { data: newInvite, error } = await supabase
    .from("club_invite")
    .insert({ token })
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from("club")
    .update({ club_invite_id: newInvite.id })
    .eq("id", club_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ token })
}