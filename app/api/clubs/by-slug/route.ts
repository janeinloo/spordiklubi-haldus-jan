// app/api/clubs/by-slug/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")

  if (!slug) {
    return NextResponse.json(
      { error: "slug query param is required" },
      { status: 400 },
    )
  }

  console.log("[GET /api/clubs/by-slug] incoming slug:", slug)

  const { data, error } = await supabase
    .from("club")
    .select("id, name, slug, club_logo")
    .eq("slug", slug) // you can switch to .ilike("slug", slug) if you want case-insensitive
    .maybeSingle()    // <= important change

  if (error) {
    console.error("[GET /api/clubs/by-slug] db error:", error)
    return NextResponse.json(
      { error: "Failed to load club by slug" },
      { status: 500 },
    )
  }

  if (!data) {
    console.warn("[GET /api/clubs/by-slug] no club found for slug:", slug)
    return NextResponse.json(
      { error: "Club not found" },
      { status: 404 },
    )
  }

  return NextResponse.json(data)
}
