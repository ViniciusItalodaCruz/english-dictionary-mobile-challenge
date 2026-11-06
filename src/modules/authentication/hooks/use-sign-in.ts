import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { signIn } from "../services/sign-in.service";
import { useAuthStore } from "../stores";
import {
  getErrorType,
  SignInErrorResponse,
  signInSchema,
  type SignInSchema,
} from "../util";

export function useSignIn() {
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  const router = useRouter();
  const completeSignIn = useAuthStore((state) => state.completeSignIn);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setErrorSubmit(null);

    try {
      const result = await signIn(email, password);

      await completeSignIn(result);

      if (useAuthStore.getState().status !== "authenticated") return;

      router.replace("/");
    } catch (error: unknown) {
      if (axios.isAxiosError<SignInErrorResponse>(error)) {
        setErrorSubmit(getErrorType(error));
        return;
      }

      setErrorSubmit("Unable to sign in. Please try again later.");
    }
  });

  useEffect(() => {
    if (!errorSubmit) return;

    const timeout = setTimeout(() => {
      setErrorSubmit(null);
    }, 8000);

    return () => {
      clearTimeout(timeout);
    };
  }, [errorSubmit]);

  return {
    control,
    errors,
    onSubmit,
    isSubmitting,
    isValid,
    errorSubmit,
  };
}
