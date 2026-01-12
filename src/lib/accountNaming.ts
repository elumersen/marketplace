import { EntityType } from '@/types/api.types';

/**
 * Returns the appropriate Retained Earnings account name based on entity type
 * This is primarily for documentation and UI display purposes
 * The actual account name is managed by the backend
 */
export function getRetainedEarningsName(entityType: EntityType): string {
  switch (entityType) {
    case EntityType.SOLE_PROPRIETORSHIP:
      return "Owner's Equity";
    case EntityType.PARTNERSHIP:
      return "Partners' Capital";
    case EntityType.LIMITED_LIABILITY_COMPANY:
      return "Member's Equity";
    case EntityType.S_CORPORATION:
      return "Retained Earnings";
    case EntityType.C_CORPORATION:
      return "Retained Earnings";
    case EntityType.NONPROFIT:
      return "Net Assets";
    default:
      return "Retained Earnings";
  }
}

/**
 * Returns a description of how the entity type affects account naming
 */
export function getEntityTypeAccountDescription(entityType: EntityType): string {
  const accountName = getRetainedEarningsName(entityType);
  return `The Retained Earnings account will be named "${accountName}" for this entity type.`;
}


