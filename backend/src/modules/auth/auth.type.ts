export type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
};

export type SignupRequestBody = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type ForgotPasswordCheckEmailBody = {
  email?: unknown;
};
