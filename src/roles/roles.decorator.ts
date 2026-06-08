import { SetMetadata } from '@nestjs/common';

export enum Role {
  SUPER_ADMIN = 'Super Admin',
  STANDARD_USER = 'Standard User',
  SYSTEM = 'System',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
