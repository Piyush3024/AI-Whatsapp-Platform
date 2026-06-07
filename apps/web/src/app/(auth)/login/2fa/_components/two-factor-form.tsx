"use client";

import { useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { handleApiError } from "@/lib/handle-error";
import { useAuthStore } from "@/stores/auth.store";
import {
  twoFactorSchema,
  TwoFactorFormValues,
} from "../schema/two-factor.schema";
import { useVerifyTwoFactorLogin } from "../hooks/use-verify-2fa-login";

export function TwoFactorForm() {
  const router = useRouter();

  const pendingTwoFactorToken = useAuthStore((s) => s.pendingTwoFactorToken);
  const isAuthenticated = useAuthStore((s) => s.accessToken !== null);
  const clearPendingTwoFactor = useAuthStore((s) => s.clearPendingTwoFactor);

  const { mutate: verifyLogin, isPending } = useVerifyTwoFactorLogin();

  const form = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { token: "" },
  });

  useEffect(() => {
    if (!pendingTwoFactorToken && !isAuthenticated) {
      router.replace("/login");
    }
  }, [pendingTwoFactorToken, isAuthenticated, router]);

  const onSubmit = (values: TwoFactorFormValues) => {
    if (!pendingTwoFactorToken) return;

    verifyLogin(
      { twoFactorToken: pendingTwoFactorToken, token: values.token },
      {
        onError: (error) => {
          handleApiError({
            error,
            fallbackMessage: "Invalid verification code. Please try again.",
          });
        },
      },
    );
  };

  if (!pendingTwoFactorToken && !isAuthenticated) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit verification code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      autoFocus
                      className="text-center text-lg tracking-widest font-semibold h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-center" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full cursor-pointer h-10 font-medium"
              disabled={isPending}
            >
              {isPending ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t pt-4">
        <Link
          href="/login"
          onClick={clearPendingTwoFactor}
          className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
        >
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
}
