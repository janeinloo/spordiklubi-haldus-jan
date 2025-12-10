// app/api/invite/[clubId]/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

type RouteContext = {
  params: Promise<{ clubId: string }>
}

// GET /api/invite/:clubId
export async function GET(_req: NextRequest, context: RouteContext) {
  const supabase = await createClient()

  const { clubId } = await context.params
  const club_id = parseInt(clubId)

  const { data: existingInviteRow, error: fetchError } = await supabase
    .from("club")
    .select("club_invite_id")
    .eq("id", club_id)
    .maybeSingle()

  if (fetchError || !existingInviteRow) {
    return NextResponse.json({ inviteLink: null })
  }

  const { data: existingToken } = await supabase
    .from("club_invite")
    .select("token")
    .eq("id", existingInviteRow.club_invite_id)
    .maybeSingle()

  return NextResponse.json({ token: existingToken?.token ?? null })
}

// POST /api/invite/:clubId
export async function POST(req: NextRequest, context: RouteContext) {
  const supabase = await createClient()

  const { clubId } = await context.params
  const club_id = parseInt(clubId)

  const token = randomUUID()

  // Insert new invite
  const { data: newInvite, error } = await supabase
    .from("club_invite")
    .insert({ token })
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Update club with new invite ID
  const { error: updateError } = await supabase
    .from("club")
    .update({ club_invite_id: newInvite.id })
    .eq("id", club_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ token })
}