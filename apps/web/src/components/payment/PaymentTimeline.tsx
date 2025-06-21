import React from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { PaymentStatus } from "@repo/database";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

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

interface PaymentTimelineProps {
  paymentId: string;
  createdAt?: Date | string;
}

export function PaymentTimeline({
  paymentId,
  createdAt,
}: PaymentTimelineProps) {
  const trpc = useTRPC();

  const { data: payment } = useQuery({
    ...trpc.payments.getPayment.queryOptions({ id: paymentId }),
    enabled: !!paymentId,
  });

  const timeline = payment?.timeline || [];

  return (
    <div>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Transaction Timeline
      </h3>

      {timeline.length > 0 ? (
        <div className="space-y-4">
          {timeline.map((entry, index) => {
            const StatusIcon = statusIcons[entry.status];
            const isLast = index === timeline.length - 1;

            return (
              <div key={entry.id} className="relative">
                {!isLast && (
                  <div className="absolute left-4 top-8 w-0.5 h-8 bg-border" />
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full border ${statusColors[entry.status]}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{entry.description}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[entry.status]} border`}
                      >
                        {entry.status
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {entry.notes}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID:</span>
            <span className="font-mono text-xs">{paymentId}</span>
          </div>
          {createdAt && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{new Date(createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span>{new Date(createdAt).toLocaleTimeString()}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
