import React from "react";
import { Badge } from "@repo/ui/badge";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";
import { Payment } from "@repo/database";
import { useCustomSession } from "@/hooks/useCustomSession";
import { formatDistance, subDays } from "date-fns";

type CustomPayment = Payment & {
  from: {
    id: string;
    name: string;
    email: string;
  };
  to: {
    id: string;
    name: string;
    email: string;
  };
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "PENDING":
      return "secondary";
    case "FAILED":
      return "destructive";
    case "CANCELLED":
      return "outline";
    case "DISPUTED":
      return "destructive";
    case "DISPUTED ACCEPTED":
      return "default";
    case "DISPUTE REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function PaymentCard({ payment }: { payment: CustomPayment }) {
  const { data } = useCustomSession();
  const getPaymentType = (payment: CustomPayment) => {
    if (!data || !data.user) return "credit";
    return payment.toUserId === data.user.id ? "credit" : "debit";
  };

  const getOtherParty = (payment: CustomPayment) => {
    if (!data || !data.user) return payment.from;
    return payment.toUserId === data.user.id ? payment.from : payment.to;
  };
  const type = getPaymentType(payment);
  const otherParty = getOtherParty(payment);
  return (
    <Link
      href={`/dashboard/payments/${payment.id}`}
      key={payment.id}
      className="p-3 rounded-lg hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-6">
          <div
            className={`p-1.5 rounded-full ${type === "credit" ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"}`}
          >
            {type === "credit" ? (
              <ArrowDownLeft className="h-8 w-8" />
            ) : (
              <ArrowUpRight className="h-8 w-8" />
            )}
          </div>
          <div>
            <p className="font-medium text-xl">{otherParty.name}</p>
            <p className="text-lg text-muted-foreground">
              {payment.description}
            </p>
          </div>
        </div>
        <p
          className={`font-semibold text-base ${type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {type === "credit" ? "+" : "-"}${payment.amount.toFixed(2)}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">
          {formatDistance(payment.date, new Date(), { addSuffix: true })}
        </p>
        <Badge
          variant={getStatusBadgeVariant(payment.status)}
          className="text-base"
        >
          {payment.status}
        </Badge>
      </div>
    </Link>
  );
}
