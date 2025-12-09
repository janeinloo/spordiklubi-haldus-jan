// app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("event")
    .select(`
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
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("[GET /api/events/:id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from("event")
    .update(body)
    .eq("id", id)
    .select(`
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
    `)
    .single()

  if (error) {
    console.error("[PATCH /api/events/:id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const { error } = await supabase.from("event").delete().eq("id", id)

  if (error) {
    console.error("[DELETE /api/events/:id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}