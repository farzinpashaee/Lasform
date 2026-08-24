import { UserStatus } from './enums';

/** Mirrors com.csl.lasform.auth.infrastructure.web.dto.UserResponse — passwordHash is never sent to the client. */
export interface User {
  id: string;
  orgId: string;
  email: string;
  displayName: string | null;
  status: UserStatus;
  mustResetPassword: boolean;
  createdAt: string;
  /** Parallel to roleNames — same length, same order, so roleIds[i] is the id behind roleNames[i]. */
  roleIds: string[];
  roleNames: string[];
}
