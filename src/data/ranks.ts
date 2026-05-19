export const RANKS = [
  { name: 'Rookie', minLevel: 1 },
  { name: 'Bronze Grinder', minLevel: 3 },
  { name: 'Iron Grinder', minLevel: 5 },
  { name: 'Steel Grinder', minLevel: 8 },
  { name: 'Gold Grinder', minLevel: 12 },
  { name: 'Platinum Grinder', minLevel: 16 },
  { name: 'Diamond Grinder', minLevel: 20 },
] as const

export function getRankForLevel(level: number): string {
  let rank: string = RANKS[0].name
  for (const tier of RANKS) {
    if (level >= tier.minLevel) rank = tier.name
  }
  return rank
}
