"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Home,
  CalendarDays,
  ClipboardList,
  MessageCircle,
  ChevronDown,
  LogOut,
  Settings,
  Shuffle,
} from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { LogoutButton } from "../logout-button"
import type { UserProfile, UserRole } from "@/types/profile"

export function MainNavbar({ clubslug }: { clubslug: string }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const toggleMenu = () => setMenuOpen(prev => !prev)

  // 👉 reusable fetch function
  const fetchProfile = useCallback(async () => {
    if (!clubslug) return

    setProfileLoading(true)
    try {
      const res = await fetch(
        `/api/profile?clubSlug=${encodeURIComponent(clubslug)}`,
      )

      if (!res.ok) {
        console.error(
          "Failed to fetch profile in navbar:",
          res.status,
          await res.text(),
        )
        return
      }

      const data = (await res.json()) as UserProfile
      setProfile(data)
    } catch (err) {
      console.error("Error fetching profile in navbar", err)
    } finally {
      setProfileLoading(false)
    }
  }, [clubslug])

  // initial load + on club change
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // 🔵 listen for profile updates from settings
  useEffect(() => {
    const handler = () => {
      fetchProfile()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("profile-updated", handler)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("profile-updated", handler)
      }
    }
  }, [fetchProfile])

  const userRole: UserRole = profile?.role ?? null
  const clubName = !profileLoading ? (profile?.club?.name ?? "Your club") : ""

  const clubLogoSrc =
    !profileLoading && profile?.club?.club_logo ? profile.club.club_logo : null

  const userFullName = !profileLoading ? (profile?.name ?? "") : ""

  const roleLabel =
    userRole === "coach" ? "coach" : userRole === "player" ? "player" : ""

  const roleBgClass =
    userRole === "coach"
      ? "bg-orange-400"
      : userRole === "player"
        ? "bg-[#16A34A]"
        : "bg-gray-300"

  function getNavItems(clubslug: string) {
    return [
      { href: `/${clubslug}/dashboard`, label: "dashboard", icon: Home },
      { href: `/${clubslug}/calendar`, label: "Calendar", icon: CalendarDays },
      {
        href: `/${clubslug}/sportevents`,
        label: "Events",
        icon: ClipboardList,
      },
      { href: `/${clubslug}/forum`, label: "Forum", icon: MessageCircle },
    ]
  }

  const navItems = getNavItems(clubslug)

  return (
    <header className="w-full shadow-sm">
      {/* Top blue bar */}
      <div className="flex items-center justify-between px-6 py-4 md:py-4 bg-[#2563EB] text-white">
        {/* Left: logo, club name */}
        <div className="flex items-center gap-4">
          {/* While loading: skeleton circle + bar */}
          {profileLoading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-16 w-16 rounded-full bg-white/20" />
              <div className="h-6 w-40 rounded bg-white/20" />
            </div>
          ) : (
            <>
              <div className="relative h-16 w-16 overflow-hidden">
                <Image
                  src={clubLogoSrc ?? "/images/syncc.png"}
                  fill
                  alt={`${clubName || "Club"} logo`}
                  className="object-contain"
                />
              </div>

              <p className="font-semibold text-sm sm:text-base md:text-2xl leading-tight">
                {clubName}
              </p>
            </>
          )}
        </div>

        {/* Right: role badge, user name, dropdown */}
        <div className="relative flex items-center gap-4">
          {profileLoading ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-20 rounded-full bg-white/20" />
              <div className="h-8 w-24 rounded-full bg-white/20" />
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleMenu}
              className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 transition"
            >
              {roleLabel && (
                <span
                  className={`rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold ${roleBgClass}`}
                >
                  {roleLabel}
                </span>
              )}

              <span className="text-sm sm:text-base font-medium whitespace-nowrap">
                {userFullName}
              </span>

              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          )}

          {!profileLoading && menuOpen && (
            <div className="absolute right-0 top-[110%] mt-1 w-44 rounded-xl bg-white text-gray-800 shadow-lg border border-gray-100 z-50">
              <ul className="py-1 text-sm">
                <li>
                  <Link
                    href={`/${clubslug}/settings`}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href={`/${clubslug}/switch-team`}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shuffle className="h-4 w-4" />
                    <span>Switch club</span>
                  </Link>
                </li>

                <li>
                  <LogoutButton className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </LogoutButton>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav tabs bar */}
      <nav className="w-full bg-[#f3f0f4] px-4 py-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <div
                key={item.href}
                className="relative flex-1"
              >
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs sm:text-sm capitalize transition"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-sm border border-blue-300"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}

                  <div
                    className={[
                      "relative z-10 flex items-center gap-2",
                      isActive ? "text-gray-900" : "text-gray-600",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
