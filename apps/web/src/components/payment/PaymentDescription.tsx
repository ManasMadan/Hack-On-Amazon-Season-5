import React from "react";

interface PaymentDescriptionProps {
  description: string;
}

export function PaymentDescription({ description }: PaymentDescriptionProps) {
  return (
    <div className="col-span-2">
      <h3 className="font-semibold mb-3">Description</h3>
      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
        {description}
      </p>
    </div>
  );
}
