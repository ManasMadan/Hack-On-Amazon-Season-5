"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  CreditCard,
  DollarSign,
  Search,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Badge } from "@repo/ui/badge";

import { useTRPC } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PaymentMethod } from "@repo/database/types";
import { getPaymentMethodDisplayText } from "@/utils/paymentMethods";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "backend";
// Form validation schema
const findUserSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const hasEmail = data.email && data.email.length > 0;
      const hasPhone = data.phone && data.phone.length > 0;
      return hasEmail !== hasPhone; // XOR: either email or phone, not both
    },
    {
      message: "Provide either email or phone number, not both",
      path: ["email"],
    }
  );

const paymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .max(1000000, "Amount cannot exceed $1,000,000"),
  paymentMethodId: z.string().uuid("Please select a payment method"),
  description: z.string().max(500, "Description too long").optional(),
});

type User = inferRouterOutputs<AppRouter>["users"]["findUserByEmailOrPhone"];

export default function PayUser() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [step, setStep] = useState<"find" | "pay">("find");
  const router = useRouter();
  const trpc = useTRPC();

  // Find user form
  const findUserForm = useForm<z.infer<typeof findUserSchema>>({
    resolver: zodResolver(findUserSchema),
    defaultValues: {
      email: "",
      phone: "",
    },
  });

  // Payment form
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethodId: "",
      description: "",
    },
  });

  const email = findUserForm.watch("email");
  const phone = findUserForm.watch("phone");

  // Queries
  const { data: paymentMethods } = useQuery(
    trpc.paymentMethods.listUserPaymentMethods.queryOptions({
      includeArchived: false,
    })
  );

  // Mutations
  const { mutateAsync: findUserAsync, isPending: isFindingUser } = useMutation(
    trpc.users.findUserByEmailOrPhone.mutationOptions()
  );

  const { mutateAsync: createPaymentAsync, isPending: isCreatingPayment } =
    useMutation(trpc.payments.create.mutationOptions());

  // Effects
  useEffect(() => {
    if (email) {
      findUserForm.setValue("phone", "");
    }
    if (phone) {
      findUserForm.setValue("email", "");
    }
  }, [email, phone, findUserForm]);

  // Set default payment method when payment methods load
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      const defaultMethod =
        paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0];
      if (defaultMethod) {
        paymentForm.setValue("paymentMethodId", defaultMethod.id);
      }
    }
  }, [paymentMethods, paymentForm]);

  // Handlers
  async function onFindUser(values: z.infer<typeof findUserSchema>) {
    try {
      const user = await findUserAsync(values);
      setSelectedUser(user);
      setStep("pay");
    } catch (error: any) {
      toast.error(error.message || "Failed to find user");
    }
  }

  async function onCreatePayment(values: z.infer<typeof paymentSchema>) {
    if (!selectedUser) return;

    toast.promise(
      async () => {
        await createPaymentAsync({
          toUserId: selectedUser.id,
          amount: values.amount,
          paymentMethodId: values.paymentMethodId,
          description: values.description,
        });
        router.push("/dashboard");
      },
      {
        loading: "Processing payment...",
        success: `Payment of $${values.amount.toFixed(2)} sent to ${selectedUser.name}!`,
        error: (e: Error) => e.message || "Failed to process payment",
      }
    );
  }

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    return getPaymentMethodDisplayText(method);
  };

  if (step === "find") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pay User</h1>
            <p className="text-muted-foreground">
              Find a user by their email or phone number
            </p>
          </div>
        </div>

        {/* Find User Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Recipient
            </CardTitle>
            <CardDescription>
              Enter the recipient's email address or phone number to send them
              money
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...findUserForm}>
              <form
                onSubmit={findUserForm.handleSubmit(onFindUser)}
                className="space-y-6"
              >
                <div className="grid gap-4">
                  {/* Email Field */}
                  <FormField
                    control={findUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="johndoe@example.com"
                            type="email"
                            disabled={!!phone || isFindingUser}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t"></div>
                    <span className="text-sm text-muted-foreground">OR</span>
                    <div className="flex-1 border-t"></div>
                  </div>

                  {/* Phone Field */}
                  <FormField
                    control={findUserForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="IN"
                            disabled={!!email || isFindingUser}
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isFindingUser}
                  >
                    {isFindingUser ? "Searching..." : "Find User"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment step
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setStep("find");
            setSelectedUser(null);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Send Payment</h1>
          <p className="text-muted-foreground">
            Review and send money to {selectedUser?.name}
          </p>
        </div>
      </div>

      {/* Recipient Card */}
      {selectedUser && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Recipient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{selectedUser.name}</p>
                <p className="text-muted-foreground">{selectedUser.email}</p>
                {selectedUser.phoneNumber && (
                  <p className="text-muted-foreground text-sm">
                    {selectedUser.phoneNumber}
                  </p>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Enter the amount and select your payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit(onCreatePayment)}
              className="space-y-6"
            >
              {/* Amount Field */}
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="1000000"
                          placeholder="0.00"
                          className="pl-10"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method Field */}
              <FormField
                control={paymentForm.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <SelectValue placeholder="Select payment method" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods?.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{getPaymentMethodDisplay(method)}</span>
                                {method.isDefault && (
                                  <Badge variant="secondary" className="ml-2">
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    {paymentMethods?.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        No payment methods found.{" "}
                        <Link
                          href="/dashboard/payment-methods"
                          className="text-primary underline"
                        >
                          Add one here
                        </Link>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={paymentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What's this payment for?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("find");
                    setSelectedUser(null);
                  }}
                  disabled={isCreatingPayment}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isCreatingPayment || !paymentMethods?.length}
                >
                  {isCreatingPayment
                    ? "Processing..."
                    : `Send $${paymentForm.watch("amount")?.toFixed(2) || "0.00"}`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
