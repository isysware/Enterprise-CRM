import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../config';
import { JwtAccessPayload, JwtRefreshPayload, AuthTokens } from '../types';
import { AUTH_COOKIES } from '../constants';
import { AppError } from '../utils';

export class TokenService {
  /**
   * Generates a short-lived JWT Access Token
   */
  public static generateAccessToken(payload: Omit<JwtAccessPayload, 'type'>): string {
    const fullPayload: JwtAccessPayload = {
      ...payload,
      type: 'access',
    };

    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    };

    return jwt.sign(fullPayload, env.JWT_ACCESS_SECRET, options);
  }

  /**
   * Generates a long-lived JWT Refresh Token
   */
  public static generateRefreshToken(payload: Omit<JwtRefreshPayload, 'type'>): string {
    const fullPayload: JwtRefreshPayload = {
      ...payload,
      type: 'refresh',
    };

    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    };

    return jwt.sign(fullPayload, env.JWT_REFRESH_SECRET, options);
  }

  /**
   * Verifies and decodes a JWT Access Token
   */
  public static verifyAccessToken(token: string): JwtAccessPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
      if (decoded.type !== 'access') {
        throw AppError.unauthorized('Invalid token type');
      }
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Access token has expired');
      }
      throw AppError.unauthorized('Invalid or malformed access token');
    }
  }

  /**
   * Verifies and decodes a JWT Refresh Token
   */
  public static verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
      if (decoded.type !== 'refresh') {
        throw AppError.unauthorized('Invalid token type');
      }
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Refresh token has expired');
      }
      throw AppError.unauthorized('Invalid or malformed refresh token');
    }
  }

  /**
   * Issues both Access and Refresh tokens
   */
  public static generateAuthTokens(
    user: Omit<JwtAccessPayload, 'type'>,
    tokenVersion = 1
  ): AuthTokens {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken({
      userId: user.userId,
      tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
  }

  /**
   * Attaches secure HttpOnly cookies to the HTTP response
   */
  public static setAuthCookies(res: Response, tokens: AuthTokens): void {
    const isProduction = env.NODE_ENV === 'production';

    // Access Token Cookie (15m)
    res.cookie(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Refresh Token Cookie (7 days)
    res.cookie(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth', // Scoped strictly to auth endpoints
    });
  }

  /**
   * Clears auth cookies upon logout
   */
  public static clearAuthCookies(res: Response): void {
    const isProduction = env.NODE_ENV === 'production';
    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    };

    res.clearCookie(AUTH_COOKIES.ACCESS_TOKEN, { ...baseOptions, path: '/' });
    res.clearCookie(AUTH_COOKIES.REFRESH_TOKEN, { ...baseOptions, path: '/api/v1/auth' });
  }
}
