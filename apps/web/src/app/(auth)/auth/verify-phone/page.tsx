"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useTRPC } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useCustomSession } from "@/hooks/useCustomSession";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@repo/ui/input-otp";
import { useEffect } from "react";

const formSchema = z.object({
  otp: z
    .string()
    .min(6, { message: "OTP must be valid" })
    .nonempty({ message: "OTP is required" }),
});

export default function VerifyPhone() {
  const trpc = useTRPC();
  const { refetch } = useCustomSession();

  const { mutateAsync: sendCodeMutateAsync } = useMutation(
    trpc.auth.sendVerificationCode.mutationOptions()
  );

  const { mutateAsync: verifyCodeMutateAsync } = useMutation(
    trpc.auth.verifyVerificationCode.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  useEffect(() => {
    sendCodeMutateAsync({ forcesend: false, type: "phone" });
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(verifyCodeMutateAsync({ otp: values.otp, type: "phone" }), {
      loading: "Verifying OTP...",
      success: "Phone number verified successfully!",
      error: (e: Error) => e.message || "Failed to verify phone number.",
    });
  }

  return (
    <div className="flex mt-12 w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Verify your phone</CardTitle>
          <CardDescription>
            Enter your verification code sent to your phone number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="otp" className="sr-only">
                      OTP
                    </FormLabel>
                    <FormControl>
                      <InputOTP maxLength={6} {...field}>
                        <InputOTPGroup className="flex justify-center w-full">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSeparator />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4 justify-between">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    sendCodeMutateAsync({ forcesend: true, type: "phone" });
                  }}
                >
                  Resend Code
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
