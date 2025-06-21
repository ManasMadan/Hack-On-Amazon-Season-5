// TODO
import React from "react";
import { Calendar } from "lucide-react";

interface PaymentTimelineProps {
  paymentId: string;
  createdAt?: Date | string;
}

export function PaymentTimeline({
  paymentId,
  createdAt,
}: PaymentTimelineProps) {
  const date = createdAt ? new Date(createdAt) : new Date();

  return (
    <div>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Transaction Timeline
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Transaction ID:</span>
          <span className="font-mono text-xs">{paymentId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date:</span>
          <span>{date.toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time:</span>
          <span>{date.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
