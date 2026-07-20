import { Auditable } from './auditable.model';
import { UserRole, UserStatus } from './enums';

export interface User extends Auditable {
  id?: string;
  username: string;
  email: string;
  /** Write-only on the backend: send when creating a user, never present on a response. */
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: UserRole[];
  status?: UserStatus;
  lastLoginAt?: string;
  version?: number;
}
