"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  ChevronDown,
  Clock,
  MapPin,
  Check,
  X,
  HelpCircle,
  Minus,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react"
import {
  EventRsvpModal,
  type RsvpEvent,
  type RSVPStatus,
} from "@/components/event-rsvp-modal"
import { EventEditModal } from "@/components/event-edit-modal"
import { type EventType } from "@/types/events"
import { type UserProfile, type UserRole } from "@/types/profile"
import { useParams } from "next/navigation"

// RSVP stored locally for now
type MyRsvp = {
  status: RSVPStatus
  note: string
}

// for hydrating from /api/events/my-rsvps
type MyRsvpRow = {
  event_id: number
  status: RSVPStatus
  note: string | null
}

// Map between DB event_type_id and UI event.type
const EVENT_TYPE_ID_TO_KEY: Record<number, RsvpEvent["type"]> = {
  1: "training",
  2: "game",
  3: "analysis",
  4: "other",
}

const EVENT_TYPE_KEY_TO_ID: Record<RsvpEvent["type"], number> = {
  training: 1,
  game: 2,
  analysis: 3,
  other: 4,
}

// Build initials from full name
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

type EventFilter = "upcoming" | "past"

// helpers for consistent sorting by date + time
function getEventDateTime(ev: RsvpEvent) {
  // ev.date is YYYY-MM-DD and ev.time is HH:mm
  return new Date(`${ev.date}T${ev.time || "00:00"}`)
}

function sortEventsByDateTime(list: RsvpEvent[]): RsvpEvent[] {
  return [...list].sort(
    (a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime(),
  )
}

// explicit error type for club / slug (codes, not messages)
type ClubError = "not-found" | "not-member" | "failed" | "error" | null

export default function EventsPage() {
  // read slug from URL params (matches [clubslug] in folder)
  const { clubslug } = useParams() as { clubslug?: string }

  const [events, setEvents] = useState<RsvpEvent[]>([])
  const [myRsvps, setMyRsvps] = useState<Record<number, MyRsvp>>({})
  const [filter, setFilter] = useState<EventFilter>("upcoming")
  const [isManaging, setIsManaging] = useState(false)

  const [activeRsvpEvent, setActiveRsvpEvent] = useState<RsvpEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<RsvpEvent | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // active club ID comes from slug lookup, not from profile
  const [activeClubId, setActiveClubId] = useState<number | null>(null)

  // error specifically for club / slug
  const [clubError, setClubError] = useState<ClubError>(null)
  const [clubLoading, setClubLoading] = useState(true)

  const currentUserName = profile?.name ?? ""
  const currentUserRole: UserRole = profile?.role ?? null
  const currentUserInitials = getInitials(currentUserName)

  // --- Helpers to map between API events and UI events ---

  function mapApiEventToUi(event: EventType): RsvpEvent {
    const type =
      EVENT_TYPE_ID_TO_KEY[event.event_type_id] ??
      ("other" as RsvpEvent["type"])

    return {
      id: event.id,
      title: event.title,
      date: event.date, // date column (YYYY-MM-DD)
      time: event.start_time?.slice(0, 5) ?? "00:00",
      location: event.location,
      description: event.description,
      type,
      attendees: [], // RSVP data handled by EventRsvpModal via /rsvp endpoint
    }
  }

  function buildApiPayloadFromUi(ev: RsvpEvent) {
    const event_type_id = EVENT_TYPE_KEY_TO_ID[ev.type] ?? 4

    if (!activeClubId) {
      throw new Error("No active club ID available for event payload")
    }

    return {
      title: ev.title,
      description: ev.description,
      date: ev.date,
      start_time: ev.time,
      end_time: null, // you can extend UI later to handle end time
      location: ev.location,
      event_type_id,
      club_id: activeClubId,
    }
  }

  // Load profile from API (once)
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true)
      setProfileError(null)
      try {
        const res = await fetch("/api/profile")

        if (!res.ok) {
          const text = await res.text()
          console.error("Failed to fetch profile:", text)
          setProfileError("Failed to load profile")
          return
        }

        const data = (await res.json()) as UserProfile
        setProfile(data)
      } catch (err) {
        console.error("Error fetching profile", err)
        setProfileError("Error loading profile")
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Resolve activeClubId from URL slug
  useEffect(() => {
    if (!clubslug) {
      setActiveClubId(null)
      setEvents([])
      setClubError("not-found")
      setClubLoading(false)
      return
    }

    // 🔹 Immediately reset state when slug changes
    setActiveClubId(null)
    setEvents([])
    setClubError(null)
    setClubLoading(true)

    const fetchClubBySlug = async () => {
      try {
        const res = await fetch(
          `/api/clubs/by-slug?slug=${encodeURIComponent(clubslug)}`,
        )

        if (res.status === 404) {
          console.warn("Club not found for slug:", clubslug)
          setClubError("not-found")
          return
        }

        if (res.status === 403) {
          console.warn("Access denied for club slug:", clubslug)
          setClubError("not-member")
          return
        }

        if (!res.ok) {
          const text = await res.text()
          console.error("Failed to fetch club by slug", text)

          if (text.toLowerCase().includes("not a member of this club")) {
            setClubError("not-member")
          } else {
            setClubError("failed")
          }
          return
        }

        const club = (await res.json()) as {
          id: number
          name: string
          slug: string
        }

        setActiveClubId(club.id)
        setClubError(null)
      } catch (err) {
        console.error("Error fetching club by slug", err)
        setActiveClubId(null)
        setEvents([])
        setClubError("error")
      } finally {
        setClubLoading(false)
      }
    }

    fetchClubBySlug()
  }, [clubslug])

  // Load events from API when we know activeClubId
  useEffect(() => {
    if (!activeClubId) {
      setEvents([])
      return
    }

    const fetchEvents = async () => {
      setIsLoading(true)
      // clear previous club events so they don't "flash" for other club
      setEvents([])
      try {
        const res = await fetch(`/api/events?clubId=${activeClubId}`)
        if (!res.ok) {
          console.error("Failed to fetch events", await res.text())
          return
        }

        const data = (await res.json()) as EventType[]
        const uiEvents = data.map(mapApiEventToUi)

        // ensure events are sorted locally as well
        setEvents(sortEventsByDateTime(uiEvents))
      } catch (err) {
        console.error("Error fetching events", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [activeClubId])

  // --- Load MY RSVPs from API once profile is known ---
  useEffect(() => {
    if (!profile) return

    const fetchMyRsvps = async () => {
      try {
        const res = await fetch("/api/events/my-rsvps")

        if (!res.ok) {
          console.error("Failed to fetch my RSVPs", await res.text())
          return
        }

        const rows = (await res.json()) as MyRsvpRow[]

        const map: Record<number, MyRsvp> = {}
        for (const row of rows) {
          map[row.event_id] = {
            status: row.status,
            note: row.note ?? "",
          }
        }

        setMyRsvps(map)
      } catch (err) {
        console.error("Error fetching my RSVPs", err)
      }
    }

    fetchMyRsvps()
  }, [profile])

  // RSVP handling (local state update)
  const handleSaveRsvp = (
    eventId: number,
    data: { status: RSVPStatus; note: string },
  ) => {
    setMyRsvps(prev => ({
      ...prev,
      [eventId]: data,
    }))
  }

  // Event CRUD
  const handleDeleteEvent = async (eventId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        console.error("Failed to delete event", await res.text())
        return
      }

      setEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (err) {
      console.error("Error deleting event", err)
    }
  }

  const handleAddEvent = () => {
    const blankEvent: RsvpEvent = {
      id: 0, // temporary; real id comes from DB on create
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "18:00",
      location: "",
      description: "",
      type: "training",
      attendees: [],
    }

    setIsCreating(true)
    setEditingEvent(blankEvent)
  }

  const handleSaveEvent = async (updated: RsvpEvent) => {
    if (!activeClubId) {
      console.error("Cannot save event without active club")
      return
    }

    try {
      const payload = buildApiPayloadFromUi(updated)

      if (isCreating) {
        // CREATE
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error("Failed to create event", await res.text())
          return
        }

        const created = (await res.json()) as EventType
        const uiEvent = mapApiEventToUi(created)

        // insert + sort so 12:00 comes before 18:00 on the same day
        setEvents(prev => sortEventsByDateTime([...prev, uiEvent]))
      } else {
        // UPDATE
        const res = await fetch(`/api/events/${updated.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error("Failed to update event", await res.text())
          return
        }

        const saved = (await res.json()) as EventType
        const uiEvent = mapApiEventToUi(saved)

        // replace + sort after edit
        setEvents(prev =>
          sortEventsByDateTime(
            prev.map(e => (e.id === uiEvent.id ? uiEvent : e)),
          ),
        )
      }
    } catch (err) {
      console.error("Error saving event", err)
    } finally {
      setEditingEvent(null)
      setIsCreating(false)
    }
  }

  // Separate upcoming vs past by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    eventDate.setHours(0, 0, 0, 0)

    if (filter === "upcoming") {
      return eventDate >= today
    } else {
      return eventDate < today
    }
  })

  // Event pill (RSVP in normal mode, edit/delete in manage mode)
  const renderEventCard = (event: RsvpEvent) => {
    const myRsvp = myRsvps[event.id]

    // RSVP status icon, label
    let StatusIcon = Minus
    let statusLabel = "No response"

    if (myRsvp?.status === "going") {
      StatusIcon = Check
      statusLabel = "Going"
    } else if (myRsvp?.status === "not_going") {
      StatusIcon = X
      statusLabel = "Not going"
    } else if (myRsvp?.status === "maybe") {
      StatusIcon = HelpCircle
      statusLabel = "Maybe"
    }

    const eventDateObj = new Date(event.date)

    // COLORS MATCHING CALENDAR PILLS
    const baseLight =
      event.type === "game"
        ? "bg-[#EDE9FE]" // game purple light
        : event.type === "training"
          ? "bg-[#DBEAFE]" // training blue light
          : event.type === "analysis"
            ? "bg-[#DCFCE7]" // analysis green light
            : "bg-[#F5EDE3]" // other warm light

    const baseDark =
      event.type === "game"
        ? "bg-[#6D28D9]" // game purple dark
        : event.type === "training"
          ? "bg-[#3156ff]" // training blue dark
          : event.type === "analysis"
            ? "bg-[#16A34A]" // analysis green dark
            : "bg-[#A16207]" // other brown dark

    // Label text colors same as calendar (no pill background)
    const chipClasses =
      event.type === "training"
        ? "text-[#3156FF]"
        : event.type === "game"
          ? "text-[#6D28D9]"
          : event.type === "analysis"
            ? "text-[#16A34A]"
            : "text-[#A16207]"

    return (
      <div
        key={event.id}
        role={!isManaging ? "button" : undefined}
        tabIndex={!isManaging ? 0 : -1}
        onClick={() => {
          if (!isManaging) {
            setActiveRsvpEvent(event)
          }
        }}
        onKeyDown={e => {
          if (!isManaging && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setActiveRsvpEvent(event)
          }
        }}
        className={`relative w-full text-left outline-none ${
          isManaging ? "cursor-default" : "cursor-pointer"
        }`}
      >
        {/* Dark pill behind left arch */}
        <div
          className={`
          pointer-events-none absolute inset-0 rounded-[40px]
          ${baseDark}
        `}
        />

        {/* Light pill in front */}
        <div
          className={`
          relative ml-2 rounded-[40px] px-6 py-4 md:px-7 md:py-5
          shadow-sm hover:-translate-y-0.5 transition-transform
          ${baseLight}
        `}
        >
          {/* Main content row: left date, right all text (title, time, location, desc, footer) */}
          <div className="flex gap-3 md:gap-4">
            {/* LEFT: date block (NOV / 30) */}
            <div className="flex flex-col items-center justify-start px-2 pt-1">
              <span className="text-[12px] font-medium uppercase tracking-wide text-slate-600">
                {format(eventDateObj, "MMM")}
              </span>
              <span className="text-lg font-semibold leading-none text-slate-900">
                {format(eventDateObj, "d")}
              </span>
            </div>

            {/* RIGHT: title, time, location, description, footer */}
            <div className="flex-1">
              {/* Title + type + manage icons on same 'block' as rest of info */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900 md:text-base">
                  {event.title || "Untitled event"}
                </h2>

                <div className="flex items-center gap-2">
                  <span
                    className={`
                      shrink-0 text-[11px] font-semibold uppercase tracking-wide mr-2 mt-1
                      ${chipClasses}
                    `}
                  >
                    {event.type}
                  </span>

                  {currentUserRole === "coach" && isManaging && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setIsCreating(false)
                          setEditingEvent(event)
                        }}
                        className="rounded-full p-1 hover:bg-slate-200"
                        aria-label="Edit event"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteEvent(event.id)
                        }}
                        className="rounded-full p-1 hover:bg-slate-200"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Time, location, description */}
              <div className="mt-2 space-y-1.5 text-xs text-slate-600 md:text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {format(eventDateObj, "EEEE")}, {event.time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{event.location || "Location to be decided"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-700 md:text-sm">
                  {event.description || "Add description for this event"}
                </p>
              </div>

              {/* Divider, initials, status on right - aligned with text block */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-400 pt-3">
                {/* Left: user avatar, name */}
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-[16px] font-semibold text-slate-700">
                    {currentUserInitials || "?"}
                  </div>
                  <span className="text-sm text-slate-800 md:text-base">
                    {currentUserName ? currentUserName.split(" ")[0] : "You"}
                  </span>
                </div>

                {/* Right: RSVP status icon, label */}
                <div className="flex items-center gap-2 text-slate-700">
                  <StatusIcon className="h-5 w-5" />
                  <span className="text-xs font-medium md:text-sm">
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // While we are resolving the club (or after slug change), don't render the main UI yet
  if (clubLoading) {
    return null // or a spinner / skeleton if you prefer
  }
  // --- UI guards for clubError (use the codes) ---
  if (clubError === "not-member") {
    // user is logged in but not a member of this club
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">
            Access denied
          </h1>
          <p className="text-sm text-red-700">
            You do not have permission to view this events page because you are
            not a member of this team.
          </p>
        </div>
      </div>
    )
  } else if (clubError) {
    // not-found / failed / error → generic "club not found" message (you can branch further if you like)
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <h1 className="text-lg font-semibold text-red-800 mb-2">
            Club not found
          </h1>
          <p className="text-sm text-red-700">
            The club you tried to access doesn&apos;t exist, is no longer
            available, or could not be loaded. Please check the URL or switch to
            another team.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-2 pb-6">
      {/* Show profile error */}
      {profileError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {profileError}
        </div>
      )}

      {/* Header row: left filter, right manage buttons */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() =>
              setFilter(prev => (prev === "upcoming" ? "past" : "upcoming"))
            }
            className="flex items-center gap-2"
          >
            <h1 className="text-2xl font-semibold text-slate-900">
              {filter === "upcoming" ? "Upcoming" : "Past"}
            </h1>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${
                filter === "past" ? "rotate-180" : ""
              }`}
            />
          </button>
          <p className="text-base text-slate-500">
            {isManaging
              ? "Manage and edit your events"
              : filter === "upcoming"
                ? "View all upcoming events"
                : "View all past events"}
          </p>
        </div>

        {currentUserRole === "coach" && (
          <div className="mt-2 flex items-center gap-2">
            {isManaging && (
              <button
                type="button"
                onClick={handleAddEvent}
                className="inline-flex items-center gap-2 rounded-full bg-[#3156ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2442cc]"
                disabled={!activeClubId}
              >
                <Plus className="h-4 w-4" />
                Create event
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsManaging(prev => !prev)}
              className={`
                inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white
                ${isManaging ? "bg-[#2442cc]" : "bg-[#3156ff]"}
                hover:bg-[#2442cc]
              `}
            >
              {isManaging ? "Done" : "Manage events"}
            </button>
          </div>
        )}
      </div>

      {/* Events list */}
      <div className="space-y-4">
        {/* Do NOT show anything until both profile + events are loaded */}
        {profileLoading || isLoading ? null : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {filter === "upcoming"
              ? "No upcoming events yet."
              : "No past events to show yet."}
          </div>
        ) : (
          filteredEvents.map(event => renderEventCard(event))
        )}
      </div>

      {/* RSVP Modal */}
      {activeRsvpEvent && (
        <EventRsvpModal
          event={activeRsvpEvent}
          isOpen={!!activeRsvpEvent}
          onClose={() => setActiveRsvpEvent(null)}
          onSave={data => handleSaveRsvp(activeRsvpEvent.id, data)}
          currentUserRole={currentUserRole === "coach" ? "coach" : "player"}
          initialStatus={myRsvps[activeRsvpEvent.id]?.status}
          initialNote={myRsvps[activeRsvpEvent.id]?.note}
        />
      )}

      {/* Edit/Create Modal */}
      {editingEvent && currentUserRole === "coach" && (
        <EventEditModal
          event={editingEvent}
          isOpen={!!editingEvent}
          isNew={isCreating}
          onClose={() => {
            setEditingEvent(null)
            setIsCreating(false)
          }}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  )
}
