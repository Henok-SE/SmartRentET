export type UserRole = "SUPER_ADMIN" | "OFFICE_ADMIN" | "OFFICER";

export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  username: string;
  role: UserRole;
  mfaEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  username: string;
  password: string;
  role: UserRole;
  profileData?: {
    address?: string;
    houseNumber?: string;
    businessLicense?: string;
    bankAccountNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    employer?: string;
    employeeId?: string;
    subCity?: string;
    assignedTo?: string;
  };
}

export interface AuthResponse {
  message: string;
  requiresOTP?: boolean;
  userId?: number;
  debugOTP?: string;
  data?: {
    user: User;
    token: string;
  };
}