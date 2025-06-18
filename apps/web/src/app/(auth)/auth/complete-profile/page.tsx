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
import { PhoneInput } from "@repo/ui/phone-input";
import { useTRPC } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useCustomSession } from "@/hooks/useCustomSession";

// Zod schema for phone number
const formSchema = z.object({
  phone: z
    .string()
    .min(10, { message: "Phone number must be valid" })
    .nonempty({ message: "Phone number is required" }),
});

export default function CompleteProfile() {
  const trpc = useTRPC();
  const { refetch } = useCustomSession();

  const { mutateAsync } = useMutation(
    trpc.auth.completeProfile.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(mutateAsync(values), {
      loading: "Updating profile...",
      success: "Profile Updated successfully!",
      error: (e: Error) =>
        e.message || "Failed to update profile. Please try again.",
    });
  }

  return (
    <div className="flex mt-12 w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Enter your phone number to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="phone">Phone Number</FormLabel>
                    <FormControl>
                      <PhoneInput id="phone" defaultCountry="IN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
