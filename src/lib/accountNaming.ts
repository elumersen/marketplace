import { EntityType } from '@/types/api.types';

/**
 * Returns the appropriate Retained Earnings account name based on entity type.
 * This is primarily for documentation and UI display purposes.
 * The actual account name is managed by the backend.
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
 * Returns the appropriate Contributions account name based on entity type.
 * Mirrors backend naming logic for `Equity_Contributions` subtype.
 */
export function getContributionsAccountName(entityType: EntityType): string {
  switch (entityType) {
    case EntityType.SOLE_PROPRIETORSHIP:
      return 'Owner Contributions';
    case EntityType.PARTNERSHIP:
      return 'Partner Contributions';
    case EntityType.LIMITED_LIABILITY_COMPANY:
      return 'Member Contributions';
    case EntityType.S_CORPORATION:
      return 'Shareholder Contributions';
    default:
      return 'Contributions';
  }
}

/**
 * Returns the appropriate Distributions/Draws account name based on entity type.
 * Mirrors backend naming logic for `Equity_Distributions` subtype.
 */
export function getDistributionsAccountName(entityType: EntityType): string {
  switch (entityType) {
    case EntityType.SOLE_PROPRIETORSHIP:
      return 'Owner Draws';
    case EntityType.PARTNERSHIP:
      return 'Partner Distributions';
    case EntityType.LIMITED_LIABILITY_COMPANY:
      return 'Member Draws';
    case EntityType.S_CORPORATION:
      return 'Shareholder Distributions';
    default:
      return 'Distributions';
  }
}

/**
 * Returns a description of how the entity type affects account naming
 */
export function getEntityTypeAccountDescription(entityType: EntityType): string {
  const retainedEarningsName = getRetainedEarningsName(entityType);
  const contributionsName = getContributionsAccountName(entityType);
  const distributionsName = getDistributionsAccountName(entityType);

  return `For this entity type: Retained Earnings is "${retainedEarningsName}", Contributions is "${contributionsName}", and Distributions is "${distributionsName}".`;
}


