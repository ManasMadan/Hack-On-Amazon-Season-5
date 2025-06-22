"use client";

import * as React from "react";
import {
  ArrowUpRight,
  User,
  Settings,
  Mic2,
  Eye,
  Mic,
  Send,
  MicOff,
  Bot,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Square,
} from "lucide-react";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import PaymentCard from "@/components/payment/PaymentCard";
import { Input } from "@repo/ui/input";
import { useTRPC } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Separator } from "@repo/ui/separator";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { toast } from "sonner";

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

interface ChatMessage {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  paymentDetails?: PaymentDetails;
  showDispute?: boolean;
}

interface PaymentDetails {
  recipient: string;
  email: string;
  amount: number;
  paymentMethod: string;
  paymentMethodLast4: string;
  status: "processing" | "completed" | "failed";
}

interface ThinkingStep {
  text: string;
  completed: boolean;
}

export default function PaymentDashboard() {
  const [chatMessage, setChatMessage] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([
    {
      id: "1",
      type: "bot",
      content: "Hi! I can help you make payments.",
      timestamp: new Date(),
    },
  ]);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [thinkingSteps, setThinkingSteps] = React.useState<ThinkingStep[]>([]);
  const [currentThinkingStep, setCurrentThinkingStep] = React.useState(0);
  const [currentPayment, setCurrentPayment] =
    React.useState<PaymentDetails | null>(null);
  const [pinValue, setPinValue] = React.useState("");
  const [showPinInput, setShowPinInput] = React.useState(false);
  const [isVoicePayment, setIsVoicePayment] = React.useState(false);
  const [isVoiceAuth, setIsVoiceAuth] = React.useState(false);
  const [needsVoiceAuth, setNeedsVoiceAuth] = React.useState(false);

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessingPayment, showPinInput]);

  const trpc = useTRPC();
  const { data: result, refetch: refetchPayments } = useQuery(
    trpc.payments.listAllPayments.queryOptions({ limit: 5 })
  );

  // Get payment methods for creating payments (similar to pay-user page)
  const { data: paymentMethods } = useQuery(
    trpc.paymentMethods.listUserPaymentMethods.queryOptions({
      includeArchived: false,
    })
  );

  // Find user mutation (similar to pay-user page)
  const { mutateAsync: findUserAsync } = useMutation(
    trpc.users.findUserByEmailOrPhone.mutationOptions()
  );

  // Create payment mutation (similar to pay-user page)
  const { mutateAsync: createPaymentAsync } = useMutation(
    trpc.payments.create.mutationOptions({
      onSuccess() {
        refetchPayments();
      },
    })
  );

  const processPaymentCommand = async (command: string) => {
    const paymentRegex = /pay\s+(\d+)\s+to\s+(\w+)/i;
    const match = command.match(paymentRegex);

    if (!match) {
      setTimeout(() => {
        addBotMessage("I didn't understand that.");
      }, 800);
      return;
    }

    const amount = parseInt(match[1] || "0");
    const recipient = match[2] ? match[2].toLowerCase() : "";

    if (recipient !== "kavish") {
      setTimeout(() => {
        addBotMessage(
          `Sorry, I couldn't find ${recipient} in your contacts. Try 'kavish' instead.`
        );
      }, 800);
      return;
    }

    // Add delay before starting processing
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsProcessingPayment(true);

    const steps = [
      "Finding the list of users",
      "Finding the recently paid users",
      "Found Kavish in Recently paid",
      "Finding the best payment method",
      "Best payment method found to be UPI",
      "UPI not found in user's payment method",
      "Next best payment method is Credit card",
      "Credit card found 3241",
      `Paying Kavish ${amount} via credit card 3241`,
    ];

    setThinkingSteps(steps.map((step) => ({ text: step, completed: false })));
    setCurrentThinkingStep(0);

    // Simulate thinking process with individual step animations
    // Define custom timeouts for each step (in milliseconds)
    const stepTimeouts = [
      1800, // "Finding the list of users"
      1700, // "Finding the recently paid users"
      1600, // "Found Kavish in Recently paid"
      2200, // "Finding the best payment method"
      1900, // "Best payment method found to be UPI"
      1700, // "UPI not found in user's payment method"
      2000, // "Next best payment method is Credit card"
      1800, // "Credit card found 3241"
      2500, // "Paying Kavish {amount} via credit card 3241"
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentThinkingStep(i);
      await new Promise((resolve) =>
        setTimeout(resolve, stepTimeouts[i] || 1000)
      );
      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === i ? { ...step, completed: true } : step
        )
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Create payment details
    const paymentDetails: PaymentDetails = {
      recipient: "Kavish",
      email: "kavishdham@gmail.com",
      amount: amount,
      paymentMethod: "Credit Card",
      paymentMethodLast4: "3241",
      status: "processing",
    };

    setCurrentPayment(paymentDetails);
    setIsProcessingPayment(false);

    // Add delay before showing payment details
    await new Promise((resolve) => setTimeout(resolve, 500));
    addBotMessage("", paymentDetails);

    console.log("VOICE PAYMENT", isVoicePayment);
    // Handle different flows based on how payment was initiated
    if (isVoicePayment) {
      // Voice payment - ask for voice PIN authentication
      setTimeout(() => {
        setNeedsVoiceAuth(true);
        addBotMessage("Please say the PIN by voice for voice authentication");
      }, 1000);
    } else {
      // Text payment - show PIN input
      setTimeout(() => {
        setShowPinInput(true);
        addBotMessage("Please enter your 4-digit PIN to confirm the payment");
      }, 1000);
    }
  };

  const addUserMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, newMessage]);
  };

  const addBotMessage = (
    content: string,
    paymentDetails?: PaymentDetails,
    options?: {
      showDispute?: boolean;
    }
  ) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "bot",
      content,
      timestamp: new Date(),
      paymentDetails,
      ...options,
    };
    setChatMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (chatMessage.trim()) {
      addUserMessage(chatMessage);
      const command = chatMessage.trim();
      setChatMessage("");
      setIsVoicePayment(false);

      if (!showPinInput && !needsVoiceAuth) {
        await processPaymentCommand(command);
      }
    }
  };

  const handlePinSubmit = () => {
    if (pinValue.length === 4) {
      setShowPinInput(false);
      setPinValue("");
      setTimeout(() => {
        completePayment();
      }, 500);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPinValue(value);

    // Auto-submit when 4 digits are entered
    if (value.length === 4) {
      setTimeout(() => {
        setShowPinInput(false);
        setPinValue("");
        setTimeout(() => {
          completePayment();
        }, 500);
      }, 300);
    }
  };

  const completePayment = async () => {
    addBotMessage("Payment processing...");

    try {
      // Find the user first (similar to pay-user page)
      const user = await findUserAsync({ email: "kavishdham@gmail.com" });

      if (!user) {
        setTimeout(() => {
          addBotMessage("Sorry, couldn't find the user. Please try again.");
        }, 1000);
        return;
      }

      // Get default payment method
      const defaultPaymentMethod =
        paymentMethods?.find((pm) => pm.isDefault) || paymentMethods?.[0];

      if (!defaultPaymentMethod || !currentPayment) {
        setTimeout(() => {
          addBotMessage(
            "Sorry, no payment method found. Please add a payment method first."
          );
        }, 1000);
        return;
      }

      // Create the payment (similar to pay-user page)
      await createPaymentAsync({
        toUserId: user.id,
        amount: currentPayment.amount,
        paymentMethodId: defaultPaymentMethod.id,
        description: `Payment to ${currentPayment.recipient}`,
      });

      setTimeout(() => {
        if (currentPayment) {
          setCurrentPayment({ ...currentPayment, status: "completed" });
          addBotMessage("Payment completed successfully!", undefined, {
            showDispute: true,
          });
          toast.success(
            `Payment of $${currentPayment.amount.toFixed(2)} sent to ${currentPayment.recipient}!`
          );
        }
      }, 2000);
    } catch (error: any) {
      setTimeout(() => {
        addBotMessage(
          "Sorry, there was an error processing your payment. Please try again."
        );
      }, 1000);
      toast.error(error.message || "Failed to process payment");
    }
  };

  const handleVoiceToggle = () => {
    setIsVoicePayment(true);
    if (needsVoiceAuth) {
      // Handle voice authentication for payment confirmation
      if (isVoiceAuth) {
        // Stop voice auth - complete the payment
        setIsVoiceAuth(false);
        setNeedsVoiceAuth(false);
        addBotMessage("Processing voice...");
        setTimeout(() => {
          addBotMessage("Voice authentication confirmed! PIN confirmed.");
          setTimeout(() => {
            completePayment();
          }, 1000);
        }, 2000);
      } else {
        // Start voice auth
        setIsVoiceAuth(true);
        addBotMessage("Voice authentication in progress...");
        // Simulate voice auth completion after 3 seconds
        setTimeout(() => {
          if (isVoiceAuth) {
            setIsVoiceAuth(false);
            setNeedsVoiceAuth(false);
            addBotMessage("Processing voice...");
            setTimeout(() => {
              addBotMessage("Voice authentication confirmed! PIN confirmed.");
              setTimeout(() => {
                completePayment();
              }, 1000);
            }, 2000);
          }
        }, 3000);
      }
      return;
    }

    // Handle normal voice input for payment commands
    if (isListening) {
      // Stop recording
      setIsListening(false);
      // Simulate voice command processing
      setTimeout(() => {
        addUserMessage("pay 500 to kavish");
        processPaymentCommand("pay 500 to kavish");
      }, 500);
    } else {
      // Start recording
      setIsListening(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const ThinkingComponent = () => {
    const currentStep = thinkingSteps[currentThinkingStep];
    if (!currentStep) return null;

    return (
      <div className="space-y-3 bg-muted/50 border rounded-lg p-4 max-w-md">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Processing your request...
        </div>
        <div className="min-h-[40px] flex items-center">
          <div className="flex items-center gap-2 text-sm transition-all duration-500 ease-in-out">
            <div className="relative">
              {currentStep.completed ? (
                <CheckCircle className="h-3 w-3 animate-in fade-in duration-300" />
              ) : (
                <div className="relative">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <div className="absolute inset-0 animate-pulse">
                    <Clock className="h-3 w-3 text-blue-400" />
                  </div>
                </div>
              )}
            </div>
            <span className={`transition-colors duration-300 text-foreground`}>
              {currentStep.text}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const PaymentDetailsComponent = ({
    details,
  }: {
    details: PaymentDetails;
  }) => (
    <Card className="max-w-md animate-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Recipient</p>
            <p className="font-medium">{details.recipient}</p>
            <p className="text-xs text-muted-foreground">{details.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-medium text-2xl">₹{details.amount}</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-medium">
              {details.paymentMethod} ****{details.paymentMethodLast4}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge
              variant={
                details.status === "completed"
                  ? "default"
                  : details.status === "processing"
                    ? "secondary"
                    : "destructive"
              }
            >
              {details.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PinInputComponent = () => (
    <div className="bg-muted/50 border rounded-lg p-4 max-w-xs animate-in slide-in-from-bottom-4 duration-300">
      <p className="text-sm font-medium mb-3">Enter your 4-digit PIN</p>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="••••"
          value={pinValue}
          onChange={handlePinChange}
          maxLength={4}
          className="w-24 text-center font-mono text-lg tracking-widest"
          onKeyPress={(e) => e.key === "Enter" && handlePinSubmit()}
          autoFocus
        />
        <Button
          onClick={handlePinSubmit}
          disabled={pinValue.length !== 4}
          size="sm"
          className="px-4"
        >
          Confirm
        </Button>
      </div>
      <div className="flex justify-center mt-2">
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                i < pinValue.length ? "bg-blue-500" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

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

        {/* Enhanced Chat Area */}
        <div className="flex flex-col gap-4">
          {/* Chat Messages */}
          <div className="h-[450px] overflow-y-auto border rounded-lg">
            <div className="p-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.type === "bot" && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900">
                        <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[85%] space-y-3`}>
                    {message.content && (
                      <div
                        className={`${
                          message.type === "user"
                            ? "bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 ml-8"
                            : "text-foreground"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    )}

                    {message.paymentDetails && (
                      <PaymentDetailsComponent
                        details={message.paymentDetails}
                      />
                    )}

                    {message.showDispute && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-2 animate-in fade-in duration-500"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Raise Dispute
                      </Button>
                    )}
                  </div>
                  {message.type === "user" && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isProcessingPayment && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <ThinkingComponent />
                  </div>
                </div>
              )}

              {showPinInput && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <PinInputComponent />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Enhanced Chat Input */}
          <div className="flex items-center gap-3 p-2 border rounded-lg">
            <div className="relative flex-1">
              <Input
                className="h-12 pr-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder={
                  needsVoiceAuth || isVoiceAuth
                    ? "Use the microphone button for voice PIN authentication"
                    : showPinInput
                      ? "Enter your PIN above"
                      : isListening
                        ? "Listening... say your command"
                        : "Type your message or use voice..."
                }
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={showPinInput || needsVoiceAuth || isVoiceAuth}
              />
            </div>

            <Button
              variant={isListening || isVoiceAuth ? "default" : "outline"}
              onClick={handleVoiceToggle}
              className={`h-12 w-12 rounded-full p-0 transition-all duration-200 ${
                isListening || isVoiceAuth
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : ""
              }`}
              disabled={showPinInput && !needsVoiceAuth}
            >
              {isListening || isVoiceAuth ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleSendMessage}
              className="h-12 w-12 rounded-full p-0 transition-all duration-200"
              disabled={
                showPinInput ||
                needsVoiceAuth ||
                isVoiceAuth ||
                !chatMessage.trim()
              }
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
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
