import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: NextRequest,
  context: { params: { clubslug: string } }
) {
  const { clubslug } = context.params

  const supabase = await createClient()

  console.log("Received slug:", clubslug)

    const { data: clubData, error: clubError } = await supabase
  .from("club")
  .select("id")
  .eq("slug", clubslug)
  .single()

if (clubError || !clubData) throw new Error("Club not found")

const clubId = clubData.id

const { data: members, error } = await supabase
  .from("member")
  .select(`
    id,
    profile:profile_id (
      id,
      name,
      role:role_id (id, name)
    )
  `)
  .eq("club_id", clubId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ members })
}