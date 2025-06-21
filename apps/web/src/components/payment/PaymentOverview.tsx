import React from "react";
import {
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Badge } from "@repo/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { PaymentStatus } from "@repo/database";

const statusIcons = {
  [PaymentStatus.pending]: Clock,
  [PaymentStatus.completed]: CheckCircle,
  [PaymentStatus.failed]: XCircle,
  [PaymentStatus.cancelled]: XCircle,
  [PaymentStatus.disputed]: AlertTriangle,
  [PaymentStatus.disputed_accepted]: CheckCircle,
  [PaymentStatus.disputed_rejected]: XCircle,
  [PaymentStatus.refunded]: RefreshCw,
};

const statusColors = {
  [PaymentStatus.pending]:
    "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  [PaymentStatus.completed]:
    "bg-green-500/10 text-green-600 border-green-500/20",
  [PaymentStatus.failed]: "bg-red-500/10 text-red-600 border-red-500/20",
  [PaymentStatus.cancelled]: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  [PaymentStatus.disputed]:
    "bg-orange-500/10 text-orange-600 border-orange-500/20",
  [PaymentStatus.disputed_accepted]:
    "bg-green-500/10 text-green-600 border-green-500/20",
  [PaymentStatus.disputed_rejected]:
    "bg-red-500/10 text-red-600 border-red-500/20",
  [PaymentStatus.refunded]: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

interface PaymentOverviewProps {
  amount: number | null;
  status: PaymentStatus;
  isSender: boolean;
  children?: React.ReactNode;
}

export function PaymentOverview({
  amount,
  status,
  isSender,
  children,
}: PaymentOverviewProps) {
  const StatusIcon = statusIcons[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div
                className={`p-3 rounded-full ${
                  isSender
                    ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                    : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                }`}
              >
                {isSender ? (
                  <ArrowUpRight className="h-6 w-6" />
                ) : (
                  <ArrowDownLeft className="h-6 w-6" />
                )}
              </div>
              <DollarSign className="h-5 w-5" />
              <span>{amount?.toFixed(2)}</span>
            </CardTitle>
            <CardDescription className="mt-2">
              {isSender ? "Payment sent" : "Payment received"}
            </CardDescription>
          </div>
          <Badge className={`${statusColors[status]} border`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
