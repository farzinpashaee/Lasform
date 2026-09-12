/** Mirrors com.csl.lasform.auth.infrastructure.web.dto.TokenResponse. refreshToken is null on the /refresh response. */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number;
}

/** The decoded payload of an access token — mirrors the claims JwtService.generateAccessToken puts in it. */
export interface JwtClaims {
  /** userId */
  sub: string;
  orgId: string;
  permissions: string[];
  mustResetPassword: boolean;
  email: string;
  /** null until the user sets one via the profile page. */
  displayName: string | null;
  /** Set from Google's `picture` claim on Google sign-up; null for password accounts. */
  avatarUrl: string | null;
  /** True once the user has uploaded a custom avatar (see UserService.uploadOwnAvatar) — takes priority over avatarUrl. */
  hasCustomAvatar: boolean;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/** Derived from the current access token's claims. */
export interface CurrentUser {
  userId: string;
  orgId: string;
  mustResetPassword: boolean;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  hasCustomAvatar: boolean;
}

/** Mirrors com.csl.lasform.auth.infrastructure.web.dto.GoogleAuthResponse. Token fields are absent when pendingApproval is true. */
export interface GoogleAuthResponse {
  pendingApproval: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}
