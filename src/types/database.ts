export type UserRole = "employee" | "admin";

export type ShiftStatus = "ACTIVE" | "COMPLETED" | "AUTO_CLOSED" | "REVIEWED";

export type PayrollStatus = "DRAFT" | "APPROVED";

export type SalaryStatus = "pending" | "approved" | "paid";

export interface Location {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface User {
  id: string;
  telegram_id: number;
  full_name: string;
  role: UserRole;
  position: string | null;
  hourly_rate: number;
  shift_start_time: string;
  location_id: string;
  created_at: string;
}

export type UserWithPosition = Pick<User, "id" | "full_name" | "position" | "hourly_rate">;

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

export interface SalaryPayment {
  id: string;
  user_id: string;
  hours_worked: number;
  hourly_rate: number;
  total_amount: number;
  status: SalaryStatus;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

export interface ShiftWithUser extends Shift {
  users: Pick<User, "id" | "full_name" | "telegram_id" | "position">;
}

export interface PayrollWithUser extends Payroll {
  users: Pick<User, "id" | "full_name" | "position">;
}

export interface SalaryPaymentWithUser extends SalaryPayment {
  users: Pick<User, "id" | "full_name" | "position">;
}

export interface ActiveShiftCard {
  shift: Shift;
  user: Pick<User, "id" | "full_name" | "position">;
}

export interface EmployeeHours {
  name: string;
  hours: number;
}

export interface MonthRevenue {
  month: string;
  amount: number;
}

export interface DashboardStats {
  activeShifts: ActiveShiftCard[];
  autoClosedShifts: ShiftWithUser[];
  draftPayrolls: PayrollWithUser[];
  totalEmployees: number;
  employeeHours: EmployeeHours[];
  monthRevenue: MonthRevenue[];
  thisMonthPayroll: number;
}

export interface SalaryStats {
  payments: SalaryPaymentWithUser[];
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
}

export interface MonthlyReportEmployee {
  id: string;
  full_name: string;
  position: string | null;
  totalHours: number;
  totalAmount: number;
  totalShifts: number;
}

export interface EmployeeStats {
  hoursThisWeek: number;
  hoursThisMonth: number;
  expectedSalary: number;
  totalShifts: number;
  hourlyRate: number;
  weeklyHours: { day: string; hours: number }[];
}

export type ScheduleType = "work" | "off" | "vacation" | "sick";

export interface Schedule {
  id: string;
  user_id: string;
  date: string;
  type: ScheduleType;
  created_at: string;
}

export interface ScheduleWithUser extends Schedule {
  users: Pick<User, "id" | "full_name" | "position">;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Fine {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface FineWithUser extends Fine {
  users: Pick<User, "id" | "full_name" | "position">;
}
