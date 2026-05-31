"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icons } from "@repo/ui/components/icons";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { verifyEmail } from "@/services/auth.service";

type VerifyState = "loading" | "success" | "error" | "missing";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>(
    token ? "loading" : "missing",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    verifyEmail(token)
      .then(() => setState("success"))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Verification failed. Please try again.";
        setErrorMessage(message);
        setState("error");
      });
  }, [token]);

  if (state === "missing") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-destructive/10 p-3">
              <Icons.warning className="size-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-center">Invalid Link</CardTitle>
          <CardDescription className="text-center">
            This verification link is invalid. Please check your email for the
            correct link.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-primary hover:underline font-medium text-sm"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Icons.spinner className="size-8 animate-spin text-muted-foreground" />
          </div>
          <CardTitle className="text-center">Verifying your email…</CardTitle>
          <CardDescription className="text-center">
            Please wait a moment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-destructive/10 p-3">
              <Icons.warning className="size-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-center">Verification Failed</CardTitle>
          <CardDescription className="text-center">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-3">
          <Link href="/forgot-password" className="w-full">
            <Button variant="outline" className="w-full cursor-pointer">
              Request a new link
            </Button>
          </Link>
          <Link
            href="/login"
            className="text-primary hover:underline font-medium text-sm"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // success
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
            <Icons.circleCheck className="size-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <CardTitle className="text-center">Email Verified!</CardTitle>
        <CardDescription className="text-center">
          Your email has been verified successfully. You can now access all
          features.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Link href="/dashboard">
          <Button className="cursor-pointer">Go to Dashboard</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
