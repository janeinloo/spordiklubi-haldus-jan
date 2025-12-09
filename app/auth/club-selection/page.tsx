import { ClubSelectForm } from "@/components/clubSelectForm"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MemberWithClub } from "@/types/clubs"

export default async function ClubSelectionPage() {
  const supabase = await createClient()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError

  if (!session?.user) {
    redirect("/auth/login")
  }

  const { data: clubs, error } = (await supabase
    .from("member")
    .select("club(slug, name)")
    .eq("profile_id", session.user.id)) as {
    data: MemberWithClub[] | null
    error: unknown
  }

  if (error) throw error

  return <ClubSelectForm clubs={clubs || []} />
}