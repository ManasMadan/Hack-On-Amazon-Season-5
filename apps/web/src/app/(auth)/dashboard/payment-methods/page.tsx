"use client";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { useCustomSession } from "@/hooks/useCustomSession";
import { toast } from "sonner";
import {
  CreditCard,
  Building2,
  Smartphone,
  Plus,
  MoreVertical,
  Star,
  Archive,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { PaymentMethod, PaymentMethodType } from "@repo/database";

const paymentTypeIcons = {
  debit_card: CreditCard,
  credit_card: CreditCard,
  bank: Building2,
  upi_id: Smartphone,
};

const paymentTypeLabels = {
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  bank: "Bank Account",
  upi_id: "UPI ID",
};

export default function ManagePaymentMethods() {
  const { data: session } = useCustomSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<{
    type: "debit_card" | "credit_card" | "bank" | "upi_id";
    details: Record<string, any>;
  }>({
    type: "credit_card",
    details: {},
  });
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data: paymentMethods, refetch: refetchPaymentMethods } = useQuery(
    trpc.paymentMethods.listUserPaymentMethods.queryOptions({
      includeArchived: includeArchived,
    })
  );

  const isLoading = false;

  // Mutations
  const { mutateAsync: createPaymentMethod } = useMutation(
    trpc.paymentMethods.create.mutationOptions({
      onSuccess: () => refetchPaymentMethods(),
    })
  );

  const { mutateAsync: archivePaymentMethod } = useMutation(
    trpc.paymentMethods.archivePaymentMethod.mutationOptions({
      onSuccess: () => refetchPaymentMethods(),
    })
  );

  const { mutateAsync: updateDefaultStatus } = useMutation(
    trpc.paymentMethods.updateDefaultStatus.mutationOptions({
      onSuccess: () => refetchPaymentMethods(),
    })
  );

  const handleAddPaymentMethod = async () => {
    if (!session?.user.id) return;

    let details = {};

    switch (newPaymentMethod.type) {
      case "credit_card":
      case "debit_card":
        details = {
          cardNumber: newPaymentMethod.details.cardNumber,
          expiryDate: newPaymentMethod.details.expiryDate,
          cardHolderName: newPaymentMethod.details.cardHolderName,
          last4: newPaymentMethod.details.cardNumber?.slice(-4),
        };
        break;
      case "bank":
        details = {
          accountNumber: newPaymentMethod.details.accountNumber,
          routingNumber: newPaymentMethod.details.routingNumber,
          accountHolderName: newPaymentMethod.details.accountHolderName,
          bankName: newPaymentMethod.details.bankName,
        };
        break;
      case "upi_id":
        details = {
          upiId: newPaymentMethod.details.upiId,
        };
        break;
    }

    try {
      await createPaymentMethod({
        type: newPaymentMethod.type,
        details,
      });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      setIsAddDialogOpen(false);
      setNewPaymentMethod({ type: "credit_card", details: {} });
      toast.success("Payment method added successfully");
    } catch (error) {
      toast.error("Failed to add payment method");
    }
  };

  const handleArchivePaymentMethod = async (id: string) => {
    try {
      await archivePaymentMethod({ id });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      toast.success("Payment method archived");
    } catch (error) {
      toast.error("Failed to archive payment method");
    }
  };

  const handleUpdateDefaultStatus = async (id: string, isDefault: boolean) => {
    try {
      await updateDefaultStatus({
        id,
        isDefault,
      });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      toast.success("Default payment method updated");
    } catch (error) {
      toast.error("Failed to update default payment method");
    }
  };

  const getPaymentMethodDisplayText = (method: any) => {
    switch (method.type) {
      case "credit_card":
      case "debit_card":
        return `**** **** **** ${method.details.last4}`;
      case "bank":
        return `${method.details.bankName} - ****${method.details.accountNumber?.slice(-4)}`;
      case "upi_id":
        return method.details.upiId;
      default:
        return "Unknown";
    }
  };

  const renderPaymentMethodForm = () => {
    switch (newPaymentMethod.type) {
      case "credit_card":
      case "debit_card":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={newPaymentMethod.details.cardNumber || ""}
                onChange={(e) =>
                  setNewPaymentMethod((prev) => ({
                    ...prev,
                    details: { ...prev.details, cardNumber: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={newPaymentMethod.details.expiryDate || ""}
                  onChange={(e) =>
                    setNewPaymentMethod((prev) => ({
                      ...prev,
                      details: { ...prev.details, expiryDate: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={newPaymentMethod.details.cvv || ""}
                  onChange={(e) =>
                    setNewPaymentMethod((prev) => ({
                      ...prev,
                      details: { ...prev.details, cvv: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cardHolderName">Cardholder Name</Label>
              <Input
                id="cardHolderName"
                placeholder="John Doe"
                value={newPaymentMethod.details.cardHolderName || ""}
                onChange={(e) =>
                  setNewPaymentMethod((prev) => ({
                    ...prev,
                    details: {
                      ...prev.details,
                      cardHolderName: e.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>
        );
      case "bank":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Chase Bank"
                value={newPaymentMethod.details.bankName || ""}
                onChange={(e) =>
                  setNewPaymentMethod((prev) => ({
                    ...prev,
                    details: { ...prev.details, bankName: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="1234567890"
                value={newPaymentMethod.details.accountNumber || ""}
                onChange={(e) =>
                  setNewPaymentMethod((prev) => ({
                    ...prev,
                    details: { ...prev.details, accountNumber: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input
                id="routingNumber"
                placeholder="123456789"
                value={newPaymentMethod.details.routingNumber || ""}
                onChange={(e) =>
                  setNewPaymentMethod((prev) => ({
                    ...prev,
                    details: { ...prev.details, routingNumber: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                placeholder="John Doe"
                value={newPaymentMethod.details.accountHolderName || ""}
                onChange={(e) =>
                  setNewPaymentMethod((prev) => ({
                    ...prev,
                    details: {
                      ...prev.details,
                      accountHolderName: e.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>
        );
      case "upi_id":
        return (
          <div>
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              placeholder="username@paytm"
              value={newPaymentMethod.details.upiId || ""}
              onChange={(e) =>
                setNewPaymentMethod((prev) => ({
                  ...prev,
                  details: { ...prev.details, upiId: e.target.value },
                }))
              }
            />
          </div>
        );
    }
  };

  if (!session) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        Please log in to manage payment methods.
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">
            Manage your payment methods and preferences
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Payment Type</Label>
                <Select
                  value={newPaymentMethod.type}
                  onValueChange={(value: any) =>
                    setNewPaymentMethod((prev) => ({
                      ...prev,
                      type: value,
                      details: {},
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="upi_id">UPI ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {renderPaymentMethodForm()}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddPaymentMethod} className="flex-1">
                  Add Payment Method
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toggle for archived methods */}
      <div className="flex items-center gap-2">
        <Button
          variant={includeArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setIncludeArchived(!includeArchived)}
        >
          {includeArchived ? "Hide" : "Show"} Archived Methods
        </Button>
      </div>

      {/* Payment Methods List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">Loading payment methods...</div>
        ) : !paymentMethods || paymentMethods.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No payment methods found
            </h3>
            <p className="text-muted-foreground mb-4">
              {includeArchived
                ? "You don't have any payment methods yet."
                : "You don't have any active payment methods."}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Payment Method
            </Button>
          </Card>
        ) : (
          (paymentMethods as PaymentMethod[]).map((method: PaymentMethod) => {
            const Icon = paymentTypeIcons[method.type];
            return (
              <Card
                key={method.id}
                className={`p-6 ${method.archivedAt ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {paymentTypeLabels[method.type]}
                        </h3>
                        {method.isDefault && (
                          <Badge
                            variant="default"
                            className="flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                        {method.archivedAt && (
                          <Badge variant="secondary">Archived</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {getPaymentMethodDisplayText(method)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(method.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {!method.archivedAt && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!method.isDefault && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateDefaultStatus(method.id, true)
                            }
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        {method.isDefault &&
                          (paymentMethods as PaymentMethod[]).filter(
                            (m: PaymentMethod) => !m.archivedAt
                          ).length > 1 && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateDefaultStatus(method.id, false)
                              }
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Remove Default
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuItem
                          onClick={() => handleArchivePaymentMethod(method.id)}
                          className="text-destructive"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
