import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../types/auth";

const API_URL = import.meta.env.VITE_API_URL;

export async function login(
  credentials: LoginRequest
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
}

export async function verifyOTP(
  userId: number,
  code: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      code,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "OTP verification failed"
    );
  }

  return data;
}

export async function register(
  userData: RegisterRequest
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
}