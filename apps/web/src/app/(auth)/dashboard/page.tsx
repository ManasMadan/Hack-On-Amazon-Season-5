"use client";

import * as React from "react";
import {
  ArrowUpRight,
  User,
  Settings,
  Mic2,
  Eye,
  Mic,
  Phone,
  Send,
  MicOff,
} from "lucide-react";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import PaymentCard from "@/components/payment/PaymentCard";
import { Input } from "@repo/ui/input";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

const actionButtons = [
  {
    title: "Pay User",
    description: "Send money to friends and family",
    icon: User,
    href: "/dashboard/pay-user",
  },
  {
    title: "Manage Voice Sample",
    description: "Update your voice authentication",
    icon: Mic2,
    href: "/dashboard/voice-sample",
  },
  {
    title: "Manage Payment Methods",
    description: "Smart routing options",
    icon: Settings,
    href: "/dashboard/payment-methods",
  },
  {
    title: "Receive Payments",
    description: "Receive money from friends and family",
    icon: ArrowUpRight,
    href: "/dashboard/receive-payments",
  },
];

export default function PaymentDashboard() {
  const [chatMessage, setChatMessage] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const trpc = useTRPC();
  const { data: result } = useQuery(
    trpc.payments.listAllPayments.queryOptions({ limit: 5 })
  );

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      console.log("Sending message:", chatMessage);
      setChatMessage("");
    }
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
  };

  const handleCall = () => {
    console.log("Starting voice call...");
  };

  return (
    <div className="max-w-[1400px] h-full mt-8 mx-auto px-6 sm:px-12 2xl:px-0 py-6 flex flex-col md:flex-row gap-6 justify-end">
      {/* Left Column - Actions */}
      <div className="flex w-full flex-col justify-between gap-6">
        {/* Action Buttons */}
        <div className="grid flex-2/3 grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          {actionButtons.map((action) => (
            <Link
              href={action.href}
              key={action.title}
              className="py-4 px-2 flex sm:flex-col md:flex-row items-center gap-4 sm:gap-8 hover:bg-accent transition-colors"
            >
              <action.icon className="w-8 h-8 sm:w-12 sm:h-12 text-primary flex-shrink-0" />
              <div className="sm:text-center md:text-left space-y-2">
                <p className="font-semibold text-xl sm:text-2xl md:text-lg lg:text-2xl">
                  {action.title}
                </p>
                <p className="text-base sm:hidden md:block md:text-sm lg:text-lg text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Chat Input */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCall}
            asChild
            className="h-20 p-5 w-16 lg:p-5"
          >
            <Phone className="cursor-pointer" />
          </Button>

          <div className="relative flex-1 h-20">
            <Input
              className="h-full pr-12 resize-none"
              placeholder="How can I help you today?"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              variant={isListening ? "ghost" : "default"}
              onClick={handleVoiceToggle}
              className="absolute top-4 right-2 h-12 p-3 w-12 rounded-full"
              asChild
            >
              {isListening ? (
                <Mic className="cursor-pointer" />
              ) : (
                <MicOff className="cursor-pointer" />
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleSendMessage}
            asChild
            className="h-20 p-5 w-16 lg:p-5"
          >
            <Send className="cursor-pointer" />
          </Button>
        </div>
      </div>

      {/* Right Column - Payment History */}
      <div className="sm:min-w-[300px] lg:min-w-[400px] flex flex-col">
        <h2 className="text-2xl mb-6">Last 5 Transactions</h2>
        <div
          className="flex h-[60vh] overflow-y-scroll flex-col gap-8 pr-2"
          data-lenis-prevent
        >
          {result ? (
            result.payments.length > 0 ? (
              result.payments
                .slice(0, 5)
                .map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))
            ) : (
              <p>No payments found</p>
            )
          ) : (
            <p>Something went wrong</p>
          )}
        </div>

        <Button variant="outline" className="text-lg h-12 w-full mt-4" asChild>
          <Link href="/dashboard/payments">
            <Eye className="h-4 w-4 mr-2" />
            View All Payments
          </Link>
        </Button>
      </div>
    </div>
  );
}
