"use client";

import Link from "next/link";
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
import { Input } from "@repo/ui/input";
import { PasswordInput } from "@repo/ui/password-input";
import { PhoneInput } from "@repo/ui/phone-input";
import { authClient } from "@repo/auth/client";
import { useTRPC } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";

// Define validation schema using Zod
const formSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters long" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().min(10, { message: "Phone number must be valid" }),
    image: z
      .any()
      .refine((file) => file instanceof File, {
        message: "Image file is required",
      })
      .optional(),
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

export default function Register() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      image: undefined,
    },
  });
  const trpc = useTRPC();
  const { mutateAsync: uploadImage } = useMutation(
    trpc.avatar.uploadImage.mutationOptions()
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(
      async () => {
        if (!values.image) {
          toast.error("Please upload a profile image.");
          return;
        }
        const arrayBuffer = await values.image.arrayBuffer();
        const uploadResult = await uploadImage({
          arrayBuffer: arrayBuffer,
          filename: values.image.name,
        });
        const result = await authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: values.name,
          phoneNumber: values.phone,
          image: uploadResult.fileKey,
          profileComplete: true,
        });
        if (result.error) throw new Error(result.error.message);
      },
      {
        loading: "Creating account...",
        success: "Account created successfully!",
        error: (e) => e.message || "Failed to create account",
      }
    );
  }

  return (
    <div className="flex mt-12 w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>
            Create a new account by filling out the form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-4">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="name">Full Name</FormLabel>
                      <FormControl>
                        <Input id="name" placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <PhoneInput {...field} defaultCountry="IN" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="image">Profile Image</FormLabel>
                      <FormControl>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              form.setValue("image", file, {
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
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
                  Register
                </Button>
              </div>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
