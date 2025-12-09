export interface Club {
  id?: number
  name: string
  slug: string
  club_logo?: string | null
}

export interface MemberWithClub {
  club: Club | null
}