/**
 * Repository Exports
 * Provides BaseRepository contract, runtime memory repositories (for tests/mocks),
 * and production PostgreSQL repositories.
 */
export interface BaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  find(filter?: Record<string, unknown>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

export * from './user.repository.interface';
export * from './runtime.user.repository';
export * from './postgres.user.repository';
export * from './postgres.role-permission.repository';
export * from './postgres.team.repository';

// Default repository selection: PostgreSQL for production/dev
import { postgresUserRepository } from './postgres.user.repository';
export const defaultUserRepository = postgresUserRepository;
