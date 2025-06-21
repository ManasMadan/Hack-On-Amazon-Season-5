"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  Building,
  CheckCircle,
} from "lucide-react";

import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import {
  PaymentOverview,
  PaymentUserDetails,
  PaymentDescription,
  PaymentTimeline,
  PaymentMethodDetails,
} from "@/components/payment";

import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useCustomSession } from "@/hooks/useCustomSession";

export default function PaymentReceiptPage() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("id");
  const { data: session } = useCustomSession();
  const trpc = useTRPC();

  const { data: payment, isPending: paymentLoading } = useQuery({
    ...trpc.payments.getPayment.queryOptions({ id: paymentId || "" }),
    enabled: !!paymentId && !!session?.user?.id,
  });

  const handlePrint = () => {
    // TODO
  };

  const handleDownload = () => {
    // TODO
  };

  const isSender = payment?.fromUserId === session?.user?.id;

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        Please log in to view payment receipt.
      </div>
    );
  }

  if (!paymentId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Payment ID Required</h3>
          <p className="text-muted-foreground mb-4">
            Please provide a payment ID to view the receipt.
          </p>
          <Button asChild>
            <Link href="/dashboard/payments">Back to Payments</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (paymentLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Receipt Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The payment receipt you're looking for doesn't exist or you don't
            have permission to view it.
          </p>
          <Button asChild>
            <Link href="/dashboard/payments">Back to Payments</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header - Hidden in print */}
      <div className="flex items-center gap-4 mb-8 print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/payments/detail?id=${payment.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Payment Receipt</h1>
          <p className="text-muted-foreground">
            Receipt for payment {payment.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Receipt Content */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building className="h-8 w-8 text-primary" />
            <span className="font-star-avenue text-2xl font-bold">
              SecureVoice+
            </span>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Payment Receipt
          </CardTitle>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString()} -{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* Transaction Summary */}
          <PaymentOverview
            amount={payment.amount}
            status={payment.status}
            isSender={isSender}
          />

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <PaymentUserDetails user={payment.to} label="Recipient Details" />
              <PaymentUserDetails user={payment.from} label="Sender Details" />
              {payment.paymentMethod && (
                <PaymentMethodDetails paymentMethod={payment.paymentMethod} />
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <PaymentTimeline
                paymentId={payment.id}
                createdAt={payment.date}
              />
            </div>
            {payment.description && (
              <PaymentDescription description={payment.description} />
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            <p>This is an official receipt for your payment transaction.</p>
            <p>For any queries, please contact our support team.</p>
            <p className="mt-2 font-mono text-xs">
              Generated on {new Date().toISOString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
