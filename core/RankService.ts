import type { RankId } from './models.ts';

export const RANKS: ReadonlyArray<{ id: RankId; requiredExp: number }> = [
    { id: 'apprentice', requiredExp: 0 },
    { id: 'scribe', requiredExp: 1_000 },
    { id: 'ritualist', requiredExp: 3_000 },
    { id: 'high-priest', requiredExp: 6_000 },
    { id: 'chief-diviner', requiredExp: 12_000 },
];

export function rankForExp(exp: number): RankId {
    let rank: RankId = RANKS[0].id;
    for (const item of RANKS) if (exp >= item.requiredExp) rank = item.id;
    return rank;
}
