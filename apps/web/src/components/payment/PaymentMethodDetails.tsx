// TODO
import React from "react";
import { CreditCard } from "lucide-react";

interface PaymentMethodDetailsProps {
  paymentMethod: {
    id: string;
    type: string;
  };
}

export function PaymentMethodDetails({
  paymentMethod,
}: PaymentMethodDetailsProps) {
  return (
    <div>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Payment Method
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type:</span>
          <span className="capitalize">
            {paymentMethod.type.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Method ID:</span>
          <span className="font-mono text-xs">{paymentMethod.id}</span>
        </div>
      </div>
    </div>
  );
}
