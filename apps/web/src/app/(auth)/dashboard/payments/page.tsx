"use client";

import React, { useState } from "react";
import { Filter, Eye, Search, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Badge } from "@repo/ui/badge";

import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import PaymentCard from "@/components/payment/PaymentCard";
import { useCustomSession } from "@/hooks/useCustomSession";
import { PaymentStatus } from "@repo/database/types";

const statusOptions = [
  { value: "all", label: "All Payments" },
  { value: PaymentStatus.pending, label: "Pending" },
  { value: PaymentStatus.completed, label: "Completed" },
  { value: PaymentStatus.failed, label: "Failed" },
  { value: PaymentStatus.cancelled, label: "Cancelled" },
  { value: PaymentStatus.disputed, label: "Disputed" },
  { value: PaymentStatus.disputed_accepted, label: "Dispute Accepted" },
  { value: PaymentStatus.disputed_rejected, label: "Dispute Rejected" },
  { value: PaymentStatus.refunded, label: "Refunded" },
];

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "sent", label: "Sent Payments" },
  { value: "received", label: "Received Payments" },
];

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data: session } = useCustomSession();
  const trpc = useTRPC();

  const {
    data: paymentsData,
    refetch: refetchPayments,
    isPending: paymentsLoading,
  } = useQuery({
    ...trpc.payments.listAllPayments.queryOptions({ limit: 100, offset: 0 }),
    enabled: !!session?.user?.id,
  });

  const payments = paymentsData?.payments || [];

  // Filter payments based on current filters
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];

    return payments.filter((payment) => {
      // Status filter
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }

      // Type filter (sent/received)
      if (typeFilter !== "all") {
        const isSent = payment.fromUserId === session?.user?.id;
        if (typeFilter === "sent" && !isSent) return false;
        if (typeFilter === "received" && isSent) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          payment.description?.toLowerCase(),
          payment.from?.email?.toLowerCase(),
          payment.to?.email?.toLowerCase(),
          payment.from?.name?.toLowerCase(),
          payment.to?.name?.toLowerCase(),
          payment.amount?.toString(),
        ]
          .filter(Boolean)
          .join(" ");

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, statusFilter, typeFilter, searchQuery, session?.user?.id]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!payments || !session?.user?.id) return null;

    const sent = payments.filter((p: any) => p.fromUserId === session.user.id);
    const received = payments.filter(
      (p: any) => p.toUserId === session.user.id
    );

    return {
      totalSent: sent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      totalReceived: received.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0
      ),
      pendingCount: payments.filter(
        (p: any) => p.status === PaymentStatus.pending
      ).length,
      completedCount: payments.filter(
        (p: any) => p.status === PaymentStatus.completed
      ).length,
    };
  }, [payments, session?.user?.id]);

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        Please log in to view your payments.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">All Payments</h1>
          <p className="text-muted-foreground">
            View and manage all your payment transactions
          </p>
        </div>
        <Button onClick={() => refetchPayments()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalSent.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search payments by description, user, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredPayments.length} of {payments?.length || 0} payments
        </p>
        {(statusFilter !== "all" || typeFilter !== "all" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
              setSearchQuery("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {paymentsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-muted-foreground">Loading payments...</p>
          </div>
        ) : !filteredPayments || filteredPayments.length === 0 ? (
          <Card className="p-8 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "No payments match your filters"
                : "No payments found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search criteria or filters."
                : "You haven't made or received any payments yet."}
            </p>
            {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
              <Button asChild>
                <Link href="/dashboard/pay-user">Send Your First Payment</Link>
              </Button>
            )}
          </Card>
        ) : (
          filteredPayments.map((payment: any) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))
        )}
      </div>
    </div>
  );
}
