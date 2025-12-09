// app/api/events/[id]/rsvp/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { RsvpStatus, RsvpProfile } from "@/types/events"

type RouteContext = {
  params: { id: string }
}

// POST /api/events/:id/rsvp
export async function POST(req: NextRequest, context: RouteContext) {
  const supabase = await createClient()
  const eventId = Number(context.params.id)

  const body = (await req.json()) as { status: RsvpStatus; note?: string }
  const { status, note } = body

  if (!["going", "not_going", "maybe"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profileId = user.id

  const { data, error } = await supabase
    .from("event_rsvp")
    .upsert(
      {
        event_id: eventId,
        profile_id: profileId,
        status,
        note,
      },
      { onConflict: "profile_id,event_id" }
    )
    .select(
      "id, event_id, profile_id, status, note, created_at, updated_at"
    )
    .single()

  if (error) {
    console.error("[POST /api/events/:id/rsvp] error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}

// GET /api/events/:id/rsvp
export async function GET(_req: NextRequest, context: RouteContext) {
  const supabase = await createClient()
  const eventId = Number(context.params.id)

  const { data, error } = await supabase
    .from("event_rsvp")
    .select(
      `
      status,
      note,
      profile:profile_id (
        id,
        name,
        email,
        role:role_id (
          name
        )
      )
    `
    )
    .eq("event_id", eventId)

  if (error) {
    console.error("[GET /api/events/:id/rsvp] error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const rows = (data ?? []) as unknown as RsvpProfile[]

  const grouped: Record<RsvpStatus, RsvpProfile[]> = {
    going: [],
    not_going: [],
    maybe: [],
  }

  for (const r of rows) {
    grouped[r.status].push(r)
  }

  return NextResponse.json(grouped)
}