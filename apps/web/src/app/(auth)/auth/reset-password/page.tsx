"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { PhoneInput } from "@repo/ui/phone-input";
import Link from "next/link";
import { useCustomSession } from "@/hooks/useCustomSession";
import { Skeleton } from "@repo/ui/skeleton";
import { useTRPC } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "@repo/ui/password-input";

const formSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" })
      .regex(/[a-zA-Z0-9]/, { message: "Password must be alphanumeric" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export default function ForgetPassword() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { data, isPending } = useCustomSession();

  const params = useSearchParams();
  const code = params.get("code") || "";

  const trpc = useTRPC();
  const { mutateAsync: updatePasswordFromResetLinkAsync } = useMutation(
    trpc.auth.updatePasswordFromResetLink.mutationOptions({
      onSuccess: () => {
        // refetch();
      },
    })
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(updatePasswordFromResetLinkAsync({ ...values, code: code }), {
      loading: "Updating password...",
      success: "Password updated successfully!",
      error: (e: Error) =>
        e.message || "Failed to update password. Please try again.",
    });
  }

  return (
    <div className="flex mt-12 w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Update Password</CardTitle>
          <CardDescription>
            Enter your <strong>updated passwords</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-4">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="password">Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="password"
                          placeholder="******"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password Field */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="confirmPassword">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="confirmPassword"
                          placeholder="******"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Update Password
                </Button>
              </div>
            </form>
          </Form>

          {isPending ? (
            <Skeleton />
          ) : data && data.session && data.user ? (
            <div className="mt-4 text-center text-sm">
              <Link href="/dashboard" className="underline">
                Go back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="mt-4 text-center text-sm">
              Remember it?{" "}
              <Link href="/auth/sign-in" className="underline">
                Sign In
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
