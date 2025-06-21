import React from "react";
import { CreditCard } from "lucide-react";
import { getPaymentMethodDisplayText } from "@/utils/paymentMethods";

interface PaymentMethodDetailsProps {
  paymentMethod: {
    id: string;
    type: string;
    details?: any;
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
          <span className="text-muted-foreground">Details:</span>
          <span>
            {paymentMethod.details
              ? getPaymentMethodDisplayText({
                  type: paymentMethod.type as any,
                  details: paymentMethod.details,
                })
              : paymentMethod.id.slice(-8)}
          </span>
        </div>
      </div>
    </div>
  );
}
