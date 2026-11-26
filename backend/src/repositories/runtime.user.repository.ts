import { AuthUser } from '../types';
import { IUserRepository, UserRecord } from './user.repository.interface';

/**
 * Runtime User Repository Foundation
 * Zero fake production users. Clean empty store awaiting PostgreSQL connection (Step 3).
 */
export class RuntimeUserRepository implements IUserRepository {
  private users: Map<string, UserRecord> = new Map();

  constructor(initialUsers: UserRecord[] = []) {
    for (const u of initialUsers) {
      this.users.set(u.id, { ...u });
    }
  }

  public async findById(id: string): Promise<AuthUser | null> {
    const record = this.users.get(id);
    if (!record) return null;
    const { passwordHash: _p, tokenVersion: _tv, ...safe } = record;
    return safe;
  }

  public async find(filter?: Record<string, unknown>): Promise<AuthUser[]> {
    const list = Array.from(this.users.values());
    if (!filter) {
      return list.map(({ passwordHash: _p, tokenVersion: _tv, ...safe }) => safe);
    }
    return list
      .filter((u) => {
        return Object.entries(filter).every(([key, val]) => (u as unknown as Record<string, unknown>)[key] === val);
      })
      .map(({ passwordHash: _p, tokenVersion: _tv, ...safe }) => safe);
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const found = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    return found ? { ...found } : null;
  }

  public async findUserWithCredentials(id: string): Promise<UserRecord | null> {
    const found = this.users.get(id);
    return found ? { ...found } : null;
  }

  public async create(data: Partial<AuthUser> & { passwordHash?: string }): Promise<AuthUser> {
    const id = data.id || `user_${Date.now()}`;
    const record: UserRecord = {
      id,
      name: data.name || 'User',
      email: data.email || '',
      role: data.role || 'Employee',
      status: data.status || 'active',
      isActive: data.status === 'active' || data.isActive === true,
      teamId: data.teamId,
      teamName: data.teamName,
      passwordHash: data.passwordHash || '',
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, record);
    const { passwordHash: _p, tokenVersion: _tv, ...safe } = record;
    return safe;
  }

  public async update(id: string, data: Partial<AuthUser>): Promise<AuthUser | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated: UserRecord = { ...existing, ...data };
    this.users.set(id, updated);
    const { passwordHash: _p, tokenVersion: _tv, ...safe } = updated;
    return safe;
  }

  public async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  public async updateLastLogin(id: string): Promise<void> {
    const existing = this.users.get(id);
    if (existing) {
      existing.lastLogin = new Date().toISOString();
      this.users.set(id, existing);
    }
  }

  public async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    const existing = this.users.get(id);
    if (existing) {
      existing.passwordHash = newPasswordHash;
      this.users.set(id, existing);
    }
  }

  public async incrementTokenVersion(id: string): Promise<void> {
    const existing = this.users.get(id);
    if (existing) {
      existing.tokenVersion = (existing.tokenVersion || 1) + 1;
      this.users.set(id, existing);
    }
  }

  public async findAllUsers(): Promise<AuthUser[]> {
    return Array.from(this.users.values()).map(
      ({ passwordHash: _p, tokenVersion: _tv, ...safe }) => safe
    );
  }
}

// Global runtime instance (empty, awaiting PostgreSQL)
export const runtimeUserRepository = new RuntimeUserRepository();
