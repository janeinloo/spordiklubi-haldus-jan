import type { ReactNode } from "react"
import { MainNavbar } from "@/components/ui/main-navbar"

// flip this to true once auth is working
const PROTECT_DASHBOARD = true

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ clubslug: string }>
}) {
  const { clubslug } = await params

  if (PROTECT_DASHBOARD) {
    return (
      <div className="bg-[#f7f6fb] min-h-screen">
        <MainNavbar clubslug={clubslug} />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </div>
    )
  }

  // --- real protection below (turn back on later) ---
  // import redirect, cookies, createServerComponentClient at the top

  // const supabase = createServerComponentClient({ cookies })
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession()
  // if (!session) redirect("/login")

  // return (
  //   <div className="bg-[#f7f6fb] min-h-screen">
  //     <MainNavbar />
  //     <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
  //   </div>
  // )

}
