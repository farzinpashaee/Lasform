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
}
