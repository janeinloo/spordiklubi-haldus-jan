// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/events?clubId=123
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const clubIdParam = searchParams.get("clubId")
  const clubId = Number(clubIdParam)

  if (!clubIdParam || Number.isNaN(clubId) || clubId <= 0) {
    return NextResponse.json(
      { error: "Valid numeric clubId query param is required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("event")
    .select(
      `
      id,
      title,
      description,
      date,
      start_time,
      end_time,
      location,
      event_type_id,
      club_id,
      created_by,
      created_at,
      updated_at
      `
    )
    .eq("club_id", clubId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })

  if (error) {
    console.error("[GET /api/events] error:", error)
    return NextResponse.json(
      { error: "Failed to load events" },
      { status: 500 }
    )
  }

  return NextResponse.json(data ?? [])
}

// POST /api/events
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    title,
    description,
    date,
    start_time,
    end_time,
    location,
    event_type_id,
    club_id,
  } = body

  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof date !== "string" ||
    typeof start_time !== "string" ||
    typeof location !== "string" ||
    typeof event_type_id !== "number" ||
    typeof club_id !== "number"
  ) {
    return NextResponse.json(
      { error: "Invalid or missing required fields" },
      { status: 400 }
    )
  }

  if (club_id <= 0) {
    return NextResponse.json(
      { error: "club_id must be a valid numeric ID" },
      { status: 400 }
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const createdBy = user.id

  const { data, error } = await supabase
    .from("event")
    .insert({
      title,
      description,
      date,
      start_time,
      end_time: end_time ?? null,
      location,
      event_type_id,
      club_id,
      created_by: createdBy,
    })
    .select(
      `
      id,
      title,
      description,
      date,
      start_time,
      end_time,
      location,
      event_type_id,
      club_id,
      created_by,
      created_at,
      updated_at
      `
    )
    .single()

  if (error) {
    console.error("[POST /api/events] error:", error)
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}