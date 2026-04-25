export type Role = 'ADMIN' | 'EMPLOYEE';

export interface BaseUser {
  id: string;
  name: string;
  role: Role;
  companyId: string;
}

export interface AdminUser extends BaseUser {
  role: 'ADMIN';
}

export interface EmployeeUser extends BaseUser {
  role: 'EMPLOYEE';
  weeklyHours: number; // Por exemplo, 44h semanais pra calcular o banco de horas
}

export type User = AdminUser | EmployeeUser;
