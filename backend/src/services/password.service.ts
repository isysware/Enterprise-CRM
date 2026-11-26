import bcrypt from 'bcryptjs';

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hashes a plaintext password using bcrypt with 12 salt rounds
   */
  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compares a plaintext candidate password against a stored bcrypt hash
   */
  public static async verify(candidate: string, hash: string): Promise<boolean> {
    if (!candidate || !hash) return false;
    return bcrypt.compare(candidate, hash);
  }

  /**
   * Validates password complexity:
   * - At least 8 characters
   * - Contains at least one uppercase letter
   * - Contains at least one lowercase letter
   * - Contains at least one number
   */
  public static validateStrength(password: string): boolean {
    if (!password || password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    return hasUpper && hasLower && hasDigit;
  }
}
