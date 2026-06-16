export type UserRole = "employee" | "admin";

export type ShiftStatus = "ACTIVE" | "COMPLETED" | "AUTO_CLOSED" | "REVIEWED";

export type PayrollStatus = "DRAFT" | "APPROVED";

export interface User {
  id: string;
  telegram_id: number;
  full_name: string;
  role: UserRole;
  hourly_rate: number;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  status: ShiftStatus;
  hours_worked: number | null;
  created_at: string;
}

export interface Payroll {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  total_amount: number;
  status: PayrollStatus;
  created_at: string;
}

export interface ShiftWithUser extends Shift {
  users: Pick<User, "id" | "full_name" | "telegram_id">;
}

export interface PayrollWithUser extends Payroll {
  users: Pick<User, "id" | "full_name">;
}

export interface ActiveShiftCard {
  shift: Shift;
  user: Pick<User, "id" | "full_name">;
}

export interface DashboardStats {
  activeShifts: ActiveShiftCard[];
  autoClosedShifts: ShiftWithUser[];
  draftPayrolls: PayrollWithUser[];
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
