"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Receipt, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Button } from "@repo/ui/button";

import { PaymentOverview } from "@/components/payment/PaymentOverview";
import { PaymentUserDetails } from "@/components/payment/PaymentUserDetails";
import { PaymentDescription } from "@/components/payment/PaymentDescription";
import { PaymentTimeline } from "@/components/payment/PaymentTimeline";
import { PaymentMethodDetails } from "@/components/payment/PaymentMethodDetails";

import { useTRPC } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCustomSession } from "@/hooks/useCustomSession";

export default function PaymentDetailPage() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("id");
  const [isDisputing, setIsDisputing] = useState(false);
  const { data: session } = useCustomSession();
  const trpc = useTRPC();

  const { data: payment, isLoading, refetch } = useQuery({
    ...trpc.payments.getPayment.queryOptions({ id: paymentId || "" }),
    enabled: !!paymentId && !!session?.user?.id,
  });

  // Fixed mutation following your pattern
  const { mutateAsync: raiseDisputeAsync, isPending: isRaisingDispute } =
    useMutation(trpc.payments.raiseDispute.mutationOptions());

  // Replace the handleRaiseDispute function with this:
  const handleRaiseDispute = async () => {
    if (!payment?.id) return;

    setIsDisputing(true);
    try {
      await raiseDisputeAsync({ id: payment.id });
      // Refetch payment data to get updated status
      await refetch();
    } catch (error) {
      console.error("Failed to raise dispute:", error);
    } finally {
      setIsDisputing(false);
    }
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">
            Please log in to view payment details.
          </p>
        </div>
      </div>
    );
  }

  if (!paymentId) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Payment ID Required</h1>
          <p className="text-muted-foreground mb-4">
            Please provide a payment ID to view payment details.
          </p>
          <Button asChild>
            <Link href="/dashboard/payments">Back to Payments</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Payment Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The payment you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button asChild>
            <Link href="/dashboard/payments">Back to Payments</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSender = payment.fromUserId === session.user.id;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/payments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payment Details</h1>
            <p className="text-muted-foreground">ID: {payment.id}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/payments/receipt?id=${payment.id}`}>
              <Receipt className="h-4 w-4 mr-2" />
              Receipt
            </Link>
          </Button>
          {(payment.status === "pending" ||
            payment.status === "completed" ||
            payment.status === "failed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRaiseDispute}
              disabled={isDisputing || isRaisingDispute}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {isDisputing || isRaisingDispute ? "Raising Dispute..." : "Raise Dispute"}
            </Button>
          )}
        </div>
      </div>

      <PaymentOverview
        amount={payment.amount}
        status={payment.status}
        isSender={isSender}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <PaymentUserDetails user={payment.from} label="From" />
            <PaymentUserDetails user={payment.to} label="To" />
            {payment.paymentMethod && (
              <PaymentMethodDetails paymentMethod={payment.paymentMethod} />
            )}
          </div>

          <div className="space-y-4">
            <PaymentTimeline paymentId={payment.id} />
          </div>
        </div>
        {payment.description && (
          <PaymentDescription description={payment.description} />
        )}
      </PaymentOverview>
    </div>
  );
}