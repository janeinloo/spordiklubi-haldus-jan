"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { generateSlug } from "@/lib/slug"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"

export default function ClubSettings({
  clubslug,
  clubData,
}: {
  clubslug: string
  clubData: { id: string; name: string; club_logo?: string }
}) {
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [clubId, setClubId] = useState<string | null>(clubData?.id)
  const [clubName, setClubName] = useState<string | null>(clubData?.name)
  const [clubLogo, setClubLogo] = useState<File | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const textToCopy = token
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  const baseBtn =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white bg-[#3156ff] hover:bg-[#2442cc] transition"

  const inputClass =
    "w-full rounded-2xl bg-gray-100 px-4 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"

  function getInitials(name?: string | null) {
    if (!name) return "??"
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  async function uploadLogo(file: File, clubId: string) {
    const filePath = `club-logos/${clubId}-${Date.now()}`

    const { data, error } = await supabase.storage
      .from("club-logos")
      .upload(filePath, file)

    if (error) {
      console.error("Upload error:", error)
      throw new Error("Failed to upload club logo.")
    }

    const { data: publicUrlData } = supabase.storage
      .from("club-logos")
      .getPublicUrl(filePath)

    return publicUrlData.publicUrl
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return

    try {
      const { error } = await supabase
        .from("member")
        .delete()
        .eq("id", memberId)

      if (error) {
        console.error("Failed to delete member:", error)
        alert("Failed to remove member. Try again.")
        return
      }

      // Update UI
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err) {
      console.error(err)
      alert("Unexpected error removing member.")
    }
  }

  const handleSaveClub = async () => {
    if (!clubName || !clubId) {
      alert("Club name is required")
      return
    }

    const newSlug = generateSlug(clubName)
    let logoUrl = clubData.club_logo || null

    if (clubLogo instanceof File && clubId) {
      try {
        logoUrl = await uploadLogo(clubLogo, clubId)
      } catch (err) {
        console.error(err)
        alert("Failed to upload club logo")
        return
      }
    }

    // Check uniqueness of club name/slug
    const { data: existing, error: existingErr } = await supabase
      .from("club")
      .select("id, name")
      .or(`name.eq.${clubName},slug.eq.${newSlug}`)
      .neq("id", clubId)
      .maybeSingle()

    if (existingErr) {
      console.error(existingErr)
      alert("Error checking existing club name.")
      return
    }

    if (existing) {
      alert("A club with this name already exists.")
      return
    }

    const res = await fetch("/api/clubs/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubId,
        name: clubName,
        logoUrl,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      alert("Error: " + data.error)
      return
    }

    // Tell navbar that club name/logo changed
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("profile-updated"))
    }

    // Navigate to (possibly) new slug
    router.push(`/${newSlug}/settings`)
  }

  useEffect(() => {
    if (!clubslug) return

    async function fetchMembers() {
      const res = await fetch(`/api/clubs/${clubslug}/members`, {
        method: "GET",
      })
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members)
      } else console.error("Error fetching members:", data.error)
    }

    fetchMembers()
  }, [clubslug])

  useEffect(() => {
    if (!clubId) return
    async function fetchToken() {
      const res = await fetch(`/api/invite/${clubId}`, { method: "GET" })
      const data = await res.json()
      if (data.token) setToken(data.token)
    }
    fetchToken()
  }, [clubId])

  const handleCopy = async () => {
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy!", err)
    }
  }

  async function generateInvite() {
    try {
      const res = await fetch(`/api/invite/${clubId}`, {
        method: "POST",
      })
      const data = await res.json()

      if (data.token) {
        setToken(data.token)
        setCopied(false)
      } else {
        console.error("No token returned", data)
      }
    } catch (err) {
      console.error("Error generating invite:", err)
    }
  }

  const memberStats = {
    total: members.length,
    coaches: members.filter(m => m.profile?.role.name === "coach").length,
    players: members.filter(m => m.profile.role.name === "player").length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-[#3156ff] px-6 py-6 text-center text-white shadow-md">
          <div className="text-3xl font-bold">{memberStats.total}</div>
          <div className="text-sm opacity-90">Total members</div>
        </div>
        <div className="rounded-3xl bg-[#16A34A] px-6 py-6 text-center text-white shadow-md">
          <div className="text-3xl font-bold">{memberStats.players}</div>
          <div className="text-sm opacity-90">Players</div>
        </div>
        <div className="rounded-3xl bg-[#FB923C] px-6 py-6 text-center text-white shadow-md">
          <div className="text-3xl font-bold">{memberStats.coaches}</div>
          <div className="text-sm opacity-90">Coaches</div>
        </div>
      </div>

      {/* Club Info */}
      <Card className="border-none bg-white shadow-sm rounded-3xl">
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Club information</h2>
          <p className="text-sm text-gray-500">
            Manage your club&apos;s name and logo
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Club name */}
          <div className="space-y-1 w-[468px]">
            <label className="text-sm font-medium text-gray-700">
              Club name
            </label>
            <input
              className={inputClass}
              value={clubName ?? ""}
              onChange={e => setClubName(e.target.value)}
            />
          </div>

          {/* Club logo */}
          <div className="space-y-2 w-[468px]">
            <label className="text-sm font-medium text-gray-700">
              Club logo
            </label>

            <div className="rounded-3xl bg-gray-100 px-5 py-5 flex items-center gap-6">
              <img
                src={
                  clubLogo
                    ? URL.createObjectURL(clubLogo)
                    : clubData.club_logo || "/images/syncc.png"
                }
                alt="Club Logo"
                className="h-24 w-24 object-contain rounded-xl"
              />

              <div className="flex flex-col pt-3">
                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => setClubLogo(e.target.files?.[0] ?? null)}
                />

                {/* Choose file button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="
                    w-fit 
                    inline-flex items-center justify-center
                    gap-2 rounded-full px-4 py-1.5
                    text-sm font-medium text-white
                    bg-[#3156ff] hover:bg-[#2442cc] 
                    transition
                  "
                >
                  Choose file
                </button>

                {/* text */}
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG or SVG. Max 5MB
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-2">
          <button
            className={baseBtn}
            onClick={handleSaveClub}
          >
            Save club settings
          </button>
        </CardFooter>
      </Card>

      {/* Invite Link */}
      <Card className="border-none bg-white shadow-sm rounded-3xl">
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Invite team members</h2>
          <p className="text-sm text-gray-500">
            Share this link to invite players to your team
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2 max-w-xl">
            <label className="text-sm font-medium text-gray-700">
              Invite link
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                readOnly
                value={token ?? ""}
                placeholder="Generate an invite link"
                className={`${inputClass} flex-1`}
              />
              {token ? (
                <button
                  onClick={handleCopy}
                  className={baseBtn}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              ) : (
                <button
                  onClick={generateInvite}
                  className={baseBtn}
                >
                  Generate invite link
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="border-none bg-white shadow-sm rounded-3xl">
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Team members</h2>
          <p className="text-sm text-gray-500">Manage your team members</p>
        </CardHeader>

        <CardContent className="pt-4">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">No members yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {members.map(m => {
                const role =
                  m.profile.role?.name === "coach" ? "coach" : "player"
                const roleLabel = role === "coach" ? "Coach" : "Player"
                const roleBg =
                  role === "coach" ? "bg-[#FB923C]" : "bg-[#16A34A]"

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-3xl bg-gray-100 px-4 py-3 w-full max-w-xl"
                  >
                    <div className="flex items-center gap-3">
                      {/* Initials circle */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-800">
                        {getInitials(m.profile.name)}
                      </div>

                      {/* Name + role pill */}
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900">
                          {m.profile.name}
                        </span>
                        <span
                          className={`inline-flex items-center w-fit rounded-full px-3 py-0.5 text-[11px] font-semibold text-white ${roleBg} whitespace-nowrap`}
                        >
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id)}
                      className="text-gray-500 hover:text-red-500 transition"
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
