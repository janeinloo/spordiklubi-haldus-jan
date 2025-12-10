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

  // 1) Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("[GET /api/clubs/by-slug] auth error:", userError)
  }

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 },
    )
  }

  // 2) Load club by slug
  const { data: club, error: clubError } = await supabase
    .from("club")
    .select("id, name, slug, club_logo")
    .eq("slug", slug) // use .ilike if you want case-insensitive
    .maybeSingle()

  if (clubError) {
    console.error("[GET /api/clubs/by-slug] db error:", clubError)
    return NextResponse.json(
      { error: "Failed to load club by slug" },
      { status: 500 },
    )
  }

  if (!club) {
    console.warn("[GET /api/clubs/by-slug] no club found for slug:", slug)
    return NextResponse.json(
      { error: "Club not found" },
      { status: 404 },
    )
  }

  // 3) Check membership in this club (member table: id, profile_id, club_id)
  const { data: membership, error: membershipError } = await supabase
    .from("member")
    .select("id")
    .eq("club_id", club.id)
    .eq("profile_id", user.id) // profile_id is UUID matching auth.uid()
    .maybeSingle()

  if (membershipError) {
    console.error(
      "[GET /api/clubs/by-slug] membership check error:",
      membershipError,
    )
    return NextResponse.json(
      { error: "Failed to verify membership" },
      { status: 500 },
    )
  }

  if (!membership) {
    console.warn(
      "[GET /api/clubs/by-slug] user is not a member of this club:",
      { slug, userId: user.id },
    )
    return NextResponse.json(
      { error: "You are not a member of this club." },
      { status: 403 },
    )
  }

  // 4) All good → user is a member, return club data
  return NextResponse.json(club)
}
