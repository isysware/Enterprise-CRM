/**
 * Base Repository Interface Foundation
 * Contract for upcoming MongoDB Mongoose entity repositories (Step 2)
 */
export interface BaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  find(filter?: Record<string, unknown>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}
