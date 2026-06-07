"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Icons } from "@repo/ui/components/icons";
import { useAuthStore } from "@/stores/auth.store";
import {
  useSetup2fa,
  useEnable2fa,
  useDisable2fa,
} from "../hooks/use-two-factor";

const tokenSchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, "Code must be exactly 6 digits.")
    .regex(/^\d+$/, "Code must contain digits only."),
});

type TokenFormValues = z.infer<typeof tokenSchema>;

export function TwoFactorSettings() {
  const { user } = useAuthStore();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const {
    mutate: startSetup,
    isPending: isStarting,
    setupData,
  } = useSetup2fa();
  const { mutate: enableTwoFactor, isPending: isEnabling } = useEnable2fa(
    () => {
      setShowSetup(false);
    },
  );
  const { mutate: disableTwoFactor, isPending: isDisabling } = useDisable2fa(
    () => {
      setShowDisable(false);
    },
  );

  const enableForm = useForm<TokenFormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: "" },
  });

  const disableForm = useForm<TokenFormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: "" },
  });

  const isEnabled = user?.twoFactorEnabled ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator
          app like Google Authenticator, Authy, or 1Password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status */}
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <>
              <div className="size-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                2FA is enabled
              </span>
            </>
          ) : (
            <>
              <div className="size-2 rounded-full bg-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                2FA is not enabled
              </span>
            </>
          )}
        </div>

        {/* Setup flow */}
        {!isEnabled && !showSetup && (
          <Button
            onClick={() => {
              setShowSetup(true);
              startSetup(false);
            }}
            disabled={isStarting}
            className="cursor-pointer"
          >
            {isStarting ? (
              <>
                <Icons.spinner className="mr-2 size-4 animate-spin" />
                Generating QR Code…
              </>
            ) : (
              "Enable 2FA"
            )}
          </Button>
        )}

        {showSetup && setupData && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                1. Scan this QR code with your authenticator app
              </p>
              <div className="inline-block rounded-lg border p-2 bg-white">
                <Image
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  width={180}
                  height={180}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                2. Or enter this secret manually
              </p>
              <code className="text-xs bg-muted px-3 py-1.5 rounded-md font-mono block break-all">
                {setupData.secret}
              </code>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                3. Enter the 6-digit code from your app to confirm
              </p>
              <Form {...enableForm}>
                <form
                  onSubmit={enableForm.handleSubmit((values) =>
                    enableTwoFactor(values.token),
                  )}
                  className="flex items-end gap-2"
                >
                  <FormField
                    control={enableForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">TOTP Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000000"
                            maxLength={6}
                            className="w-36 font-mono text-center tracking-widest"
                            autoComplete="one-time-code"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isEnabling}
                    className="cursor-pointer"
                  >
                    {isEnabling ? (
                      <Icons.spinner className="size-4 animate-spin" />
                    ) : (
                      "Verify & Enable"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startSetup(true)}
                    disabled={isStarting}
                    className="cursor-pointer"
                  >
                    {isStarting ? (
                      <>
                        <Icons.spinner className="mr-2 size-4 animate-spin" />
                        Regenerating…
                      </>
                    ) : (
                      "Regenerate QR"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSetup(false)}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Disable flow */}
        {isEnabled && !showDisable && (
          <Button
            variant="destructive"
            onClick={() => setShowDisable(true)}
            className="cursor-pointer"
          >
            Disable 2FA
          </Button>
        )}

        {isEnabled && showDisable && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to confirm.
            </p>
            <Form {...disableForm}>
              <form
                onSubmit={disableForm.handleSubmit((values) =>
                  disableTwoFactor(values.token),
                )}
                className="flex items-end gap-2"
              >
                <FormField
                  control={disableForm.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">TOTP Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000000"
                          maxLength={6}
                          className="w-36 font-mono text-center tracking-widest"
                          autoComplete="one-time-code"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDisabling}
                  className="cursor-pointer"
                >
                  {isDisabling ? (
                    <Icons.spinner className="size-4 animate-spin" />
                  ) : (
                    "Confirm Disable"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDisable(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
