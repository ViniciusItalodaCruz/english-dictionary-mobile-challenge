import { AxiosError } from "axios";

export type SignInErrorResponse = {
  code?: number;
  msg?: string;
  error_code?: string;
};

export function getErrorType(error: AxiosError<SignInErrorResponse>): string {
  const code = error.response?.data?.error_code;
  const status = error.response?.status;

  if (code === "invalid_credentials") {
    return "Invalid email or password.";
  }

  if (status === 429) {
    return "Too many attempts. Please try again later.";
  }

  return "Unable to sign in. Please try again later.";
}
