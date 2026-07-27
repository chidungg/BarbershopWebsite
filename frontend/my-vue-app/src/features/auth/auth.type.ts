export type SendOtpResponse = {
  success: boolean;
  code:
    | "otp_sent"
    | "missing_email"
    | "invalid_email"
    | "account_not_found"
    | "account_lookup_failed"
    | "otp_rate_limited"
    | "email_not_authorized"
    | "otp_send_failed"
    | "otp_send_internal_error";
  message: string;
  data?: {
    email: string;
  };
};
export type ForgotPasswordStep = "request" | "verify" | "reset";
export type MessageKind = "error" | "success" | "info";

export type StatusMessage = {
  kind: MessageKind;
  text: string;
} | null;

export type EmailLookupState = "idle" | "found" | "not-found";

export type CheckEmailResponse = {
  success: boolean;
  code:
    | "account_found"
    | "account_not_found"
    | "missing_email"
    | "invalid_email"
    | "account_lookup_failed";
  message: string;
  data?: {
    exists: boolean;
  };
};
export type VerifyOtpResponse = {
  success: boolean;
  code:
    | "otp_verified"
    | "missing_verification_data"
    | "invalid_email"
    | "invalid_otp_format"
    | "invalid_or_expired_otp"
    | "otp_verification_rate_limited"
    | "otp_verification_failed"
    | "invalid_verification_response"
    | "recovery_email_mismatch"
    | "otp_verification_internal_error";
  message: string;
  data?: {
    userId?: string;
    email?: string;
  };
};