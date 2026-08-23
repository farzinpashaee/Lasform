import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { UserStatus } from '../../../core/models/enums';
import { Role } from '../../../core/models/role.model';
import { User } from '../../../core/models/user.model';
import { RoleService } from '../../../core/services/role.service';
import { UserService } from '../../../core/services/user.service';
import { HasPermissionDirective } from '../../../core/auth/has-permission.directive';

const USER_STATUSES: UserStatus[] = ['ACTIVE', 'DISABLED'];

/**
 * Deliberately minimal: no search/sort/pagination like Locations/Devices/Categories — there's no
 * reason yet to expect enough users for that to matter, and the backend's GET /api/users doesn't
 * paginate either (see core/README.md on the backend).
 */
@Component({
  selector: 'app-users-page',
  imports: [FormsModule, DatePipe, TranslocoPipe, HasPermissionDirective],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly transloco = inject(TranslocoService);

  protected readonly users = signal<User[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly createOpen = signal(false);
  protected readonly createEmail = signal('');
  protected readonly createPassword = signal('');
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly roleAssignmentTarget = signal<User | null>(null);
  protected readonly selectedRoleId = signal('');
  protected readonly assigningRole = signal(false);
  protected readonly assignRoleError = signal<string | null>(null);
  protected readonly assignRoleSuccess = signal(false);

  protected readonly userStatuses = USER_STATUSES;
  protected readonly editTarget = signal<User | null>(null);
  protected readonly editDisplayName = signal('');
  protected readonly editStatus = signal<UserStatus>('ACTIVE');
  protected readonly savingEdit = signal(false);
  protected readonly editError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUsers();
    // Loaded eagerly (rather than only when the role-assignment modal opens) so the modal can
    // open instantly instead of showing its own loading state on first use.
    this.roleService.list().subscribe({ next: (roles) => this.roles.set(roles) });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.userService.list().subscribe({
      next: (users) => {
        this.loading.set(false);
        this.users.set(users);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.transloco.translate('users.loadFailed'));
      },
    });
  }

  protected openCreateModal(): void {
    this.createEmail.set('');
    this.createPassword.set('');
    this.createError.set(null);
    this.createOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.createOpen.set(false);
    this.creating.set(false);
  }

  protected submitCreate(): void {
    const email = this.createEmail().trim();
    const temporaryPassword = this.createPassword();
    if (!email || temporaryPassword.length < 8 || this.creating()) {
      return;
    }
    this.creating.set(true);
    this.createError.set(null);

    this.userService.create({ email, temporaryPassword }).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.closeCreateModal();
        this.users.update((current) => [created, ...current]);
      },
      error: () => {
        this.creating.set(false);
        this.createError.set(this.transloco.translate('users.createFailed'));
      },
    });
  }

  protected openRoleAssignmentModal(user: User): void {
    this.selectedRoleId.set('');
    this.assignRoleError.set(null);
    this.assignRoleSuccess.set(false);
    this.roleAssignmentTarget.set(user);
  }

  protected closeRoleAssignmentModal(): void {
    this.roleAssignmentTarget.set(null);
    this.assigningRole.set(false);
  }

  protected submitRoleAssignment(): void {
    const user = this.roleAssignmentTarget();
    const roleId = this.selectedRoleId();
    if (!user || !roleId || this.assigningRole()) {
      return;
    }
    this.assigningRole.set(true);
    this.assignRoleError.set(null);

    this.userService.assignRole(user.id, roleId).subscribe({
      next: () => {
        this.assigningRole.set(false);
        this.assignRoleSuccess.set(true);
      },
      error: () => {
        this.assigningRole.set(false);
        this.assignRoleError.set(this.transloco.translate('users.assignRoleFailed'));
      },
    });
  }

  protected openEditModal(user: User): void {
    this.editDisplayName.set(user.displayName ?? '');
    this.editStatus.set(user.status);
    this.editError.set(null);
    this.editTarget.set(user);
  }

  protected closeEditModal(): void {
    this.editTarget.set(null);
    this.savingEdit.set(false);
  }

  protected submitEdit(): void {
    const user = this.editTarget();
    if (!user || this.savingEdit()) {
      return;
    }
    this.savingEdit.set(true);
    this.editError.set(null);

    const displayName = this.editDisplayName().trim() || null;
    this.userService.update(user.id, { displayName, status: this.editStatus() }).subscribe({
      next: (updated) => {
        this.savingEdit.set(false);
        this.closeEditModal();
        this.users.update((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      },
      error: () => {
        this.savingEdit.set(false);
        this.editError.set(this.transloco.translate('users.editFailed'));
      },
    });
  }
}
