/**
 * Stone Configuration
 *
 * Static IDs for stone groups and types managed by backend.
 * These are generated from seed scripts.
 */

export const STONE_GROUPS = {
  DIAMOND: 'sgrp_06DYM1C1MJ7ZVA3TG7V3EE2BAW',
  GEMSTONE: 'sgrp_06DYM1C1NTT0M07BDZXMZAZVFM',
  PEARLS: 'sgrp_06DZ0NT03B4DR90068XNHM5SSC',
} as const

export const STONE_TYPES = {
  LAB_GROWN_DIAMOND: 'styp_06DYM62K7TVP0V66H7THWYT76R',
} as const

export type StoneGroupId = (typeof STONE_GROUPS)[keyof typeof STONE_GROUPS]
export type StoneTypeId = (typeof STONE_TYPES)[keyof typeof STONE_TYPES]
