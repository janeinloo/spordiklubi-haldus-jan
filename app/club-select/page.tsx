"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

const supabase = createClient()

type Club = {
  id: number
  name: string
  slug: string
  club_logo: string | null
}

type MemberWithClub = {
  club: Club | null
}

export default function SwitchTeamPage() {
  const router = useRouter()
  const params = useParams<{ clubslug: string }>()
  const activeSlug = params.clubslug

  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        console.error("Not authenticated")
        return
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("role_id")
        .eq("id", user.id)
        .single()

      setIsCoach(profile?.role_id === 1)

      const { data: memberships } = await supabase
        .from("member")
        .select(
          `
          club:club_id (
            id,
            name,
            slug,
            club_logo
          )
        `,
        )
        .eq("profile_id", user.id)
        .returns<MemberWithClub[]>()

      const clubList = (memberships ?? [])
        .map(row => row.club)
        .filter((c): c is Club => c !== null)

      setClubs(clubList)
      setLoading(false)
    }

    loadData()
  }, [])

  function handleSelectClub(slug: string) {
    router.push(`/${slug}/dashboard`)
  }

  function getLogoSrc(logo: string | null) {
    return logo && logo.length > 0 ? logo : "/images/syncc.png"
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-10 text-gray-600">
        Loading your clubs...
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-4 pt-[196px] bg-[#f7f6fb] min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
        Switch Club
      </h1>

      <p className="text-gray-500 mb-10 text-center">
        Choose which club you want to manage
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
        {clubs.map(club => (
          <div
            key={club.id}
            onClick={() => handleSelectClub(club.slug)}
            className="
              cursor-pointer flex flex-col items-center
              transition-transform hover:scale-105
            "
          >
            <div
              className="
              relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl overflow-hidden 
              border-2 border-transparent hover:border-blue-500
              transition
            "
            >
              <Image
                src={getLogoSrc(club.club_logo)}
                fill
                alt={club.name}
                className="object-contain p-2"
              />
            </div>

            <p className="mt-3 text-sm sm:text-base font-medium text-gray-800">
              {club.name}
            </p>

            {club.slug === activeSlug && (
              <span className="mt-1 text-xs text-blue-600 font-semibold">
                Active
              </span>
            )}
          </div>
        ))}

        {isCoach && (
          <Link
            href="/auth/sign-up/createclub"
            className="
              flex flex-col items-center justify-center
              rounded-3xl border-2 border-dashed border-blue-400 
              h-28 w-28 sm:h-32 sm:w-32
              hover:bg-blue-50 hover:border-blue-500
              transition cursor-pointer
            "
          >
            <span className="text-4xl text-blue-600">＋</span>
            <p className="mt-1 font-medium text-blue-600 text-sm">
              Create Club
            </p>
          </Link>
        )}
      </div>
    </div>
  )
}
