import React from "react";
import { User, Mail } from "lucide-react";

interface PaymentUserDetailsProps {
  user: {
    name: string | null;
    email: string | null;
  } | null;
  label: string;
}

export function PaymentUserDetails({ user, label }: PaymentUserDetailsProps) {
  if (!user) return null;

  return (
    <div>
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        <User className="h-4 w-4" />
        {label}
      </h4>
      <div className="space-y-1">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {user.email}
        </p>
      </div>
    </div>
  );
}
