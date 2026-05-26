import type { RankTier } from '../types'

export const DEFAULT_RANKS: RankTier[] = [
  { id: 'rank-1', name: 'Rookie', minLevel: 1, imageUrl: null },
  { id: 'rank-2', name: 'Bronze Grinder', minLevel: 3, imageUrl: null },
  { id: 'rank-3', name: 'Iron Grinder', minLevel: 5, imageUrl: null },
  { id: 'rank-4', name: 'Steel Grinder', minLevel: 8, imageUrl: null },
  { id: 'rank-5', name: 'Gold Grinder', minLevel: 12, imageUrl: null },
  { id: 'rank-6', name: 'Platinum Grinder', minLevel: 16, imageUrl: null },
  { id: 'rank-7', name: 'Diamond Grinder', minLevel: 20, imageUrl: null },
]

export function normalizeRanks(ranks: RankTier[] | undefined): RankTier[] {
  const source = ranks?.length ? ranks : DEFAULT_RANKS
  return source
    .map((rank, index) => ({
      id: rank.id || `rank-${index + 1}`,
      name: rank.name?.trim() || `Rank ${index + 1}`,
      minLevel: Math.max(1, Math.round(rank.minLevel || index + 1)),
      imageUrl: rank.imageUrl ?? null,
    }))
}

export function getRankForLevel(
  level: number,
  ranks: RankTier[] = DEFAULT_RANKS,
): string {
  const normalized = normalizeRanks(ranks).slice().sort((a, b) => a.minLevel - b.minLevel)
  let rank = normalized[0]?.name ?? 'Rookie'
  for (const tier of normalized) {
    if (level >= tier.minLevel) rank = tier.name
  }
  return rank
}

export function getRankTierForLevel(
  level: number,
  ranks: RankTier[] = DEFAULT_RANKS,
): RankTier | null {
  const normalized = normalizeRanks(ranks).slice().sort((a, b) => a.minLevel - b.minLevel)
  let match: RankTier | null = normalized[0] ?? null
  for (const tier of normalized) {
    if (level >= tier.minLevel) match = tier
  }
  return match
}
