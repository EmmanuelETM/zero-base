export type AuthState =
  | {
      error?: string;
      fieldErrors?: {
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
        fullName?: string[];
      };
      message?: string;
    }
  | undefined;
