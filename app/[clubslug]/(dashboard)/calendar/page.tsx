import { ClubCalendar } from "@/components/calendar"
import { createClient } from "@/lib/supabase/server"

interface Props {
  params: { clubslug: string }
}

export default async function CalendarPage({ params }: Props) {
  const supabase = await createClient()

  const resolvedParams = await params
  const { clubslug } = resolvedParams

  // 1. Load club by slug
  const { data: club, error } = await supabase
    .from("club")
    .select("id, name")
    .eq("slug", clubslug)
    .maybeSingle()

  if (error) {
    console.error("[CalendarPage] error loading club by slug:", error)
  }

  // If club not found → show panel
  if (!club) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">
            Club not found
          </h1>
          <p className="text-sm text-red-700">
            The club you tried to access doesn&apos;t exist or is no longer
            available. Please check the URL or switch to another team.
          </p>
        </div>
      </div>
    )
  }

  // 2. Load authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // No user = no access
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">
            Access denied
          </h1>
          <p className="text-sm text-red-700">
            You must be logged in to view this calendar.
          </p>
        </div>
      </div>
    )
  }

  // 3. Check membership
  const { data: member } = await supabase
    .from("member")
    .select("id")
    .eq("club_id", club.id)
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!member) {
    // User exists, but is not a member of this club → show access denied
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">
            Access denied
          </h1>
          <p className="text-sm text-red-700">
            You do not have permission to view this calendar because you are not
            a member of this team.
          </p>
        </div>
      </div>
    )
  }

  // 4. User is a valid member → show calendar
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <ClubCalendar clubId={club.id} />
    </div>
  )
}
