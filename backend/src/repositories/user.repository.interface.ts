import { AuthUser } from '../types';
import { BaseRepository } from './index';

export interface UserRecord extends AuthUser {
  passwordHash: string;
  tokenVersion: number;
}

export interface IUserRepository extends BaseRepository<AuthUser> {
  findByEmail(email: string): Promise<UserRecord | null>;
  findUserWithCredentials(id: string): Promise<UserRecord | null>;
  updateLastLogin(id: string): Promise<void>;
  updatePassword(id: string, newPasswordHash: string): Promise<void>;
  incrementTokenVersion(id: string): Promise<void>;
  findAllUsers(): Promise<AuthUser[]>;
}
