import { PaymentMethodType } from "@repo/database/types";

export function getPaymentMethodDisplayText(method: {
  type: PaymentMethodType;
  details: any;
}) {
  switch (method.type) {
    case "credit_card":
    case "debit_card":
      return `**** **** **** ${method.details.last4 || "****"}`;
    case "bank":
      return `${method.details.bankName || "Bank"} - ****${method.details.accountNumber?.slice(-4) || "****"}`;
    case "upi_id":
      return method.details.upiId || "UPI";
    default:
      return "Unknown";
  }
}
