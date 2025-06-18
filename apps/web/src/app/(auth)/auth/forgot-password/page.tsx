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

const formSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => (data.email ? !data.phone : !!data.phone), {
    message: "Provide either email or phone, not both",
    path: ["email"],
  });

export default function ForgetPassword() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      phone: "",
    },
  });

  const email = form.watch("email");
  const phone = form.watch("phone");

  const { data, isPending } = useCustomSession();

  const trpc = useTRPC();
  const { mutateAsync: sendResetPasswordAsync } = useMutation(
    trpc.auth.sendResetPasswordLink.mutationOptions()
  );

  useEffect(() => {
    if (email) {
      form.setValue("phone", "");
    }
    if (phone) {
      form.setValue("email", "");
    }
  }, [email, phone, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(sendResetPasswordAsync(values), {
      loading: "Sending reset iink...",
      success: "Reset link sent successfully!",
      error: (e: Error) =>
        e.message || "Failed to send reset link. Please try again.",
    });
  }

  return (
    <div className="flex mt-12 w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your <strong>email</strong> or <strong>phone number</strong>{" "}
            to receive a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-4">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          placeholder="johndoe@mail.com"
                          type="email"
                          autoComplete="email"
                          disabled={!!phone}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="phone">Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="phone"
                          defaultCountry="IN"
                          disabled={!!email}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-sm text-muted-foreground">
                  Provide <strong>only one</strong> of the fields above.
                </div>

                <Button type="submit" className="w-full">
                  Send Reset Link
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
