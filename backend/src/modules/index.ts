/**
 * Domain Modules Foundation
 * Holds domain logic, models, controllers, and services per business module:
 * - auth
 * - users
 * - leads
 * - clients
 * - follow-ups
 */
export const DOMAIN_MODULES = [
  'auth',
  'users',
  'leads',
  'clients',
  'follow-ups',
] as const;

export type DomainModule = (typeof DOMAIN_MODULES)[number];
