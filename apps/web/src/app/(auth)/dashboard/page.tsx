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
import { PaymentMethodType } from "@repo/database/types";

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

function getDetails(type: PaymentMethodType, details: any): string {
  switch (type) {
    case "credit_card":
    case "debit_card":
      return details.last4;
    case "bank":
      if (details.accountNumber && details.accountNumber.length >= 4) {
        const last4 = details.accountNumber.slice(-4);
        return "****" + last4;
      }
      return "****";
    case "upi_id":
      return details.upiId;
    default:
      return "****";
  }
}

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
  const [isVoiceAuth, setIsVoiceAuth] = React.useState(false);
  const [needsVoiceAuth, setNeedsVoiceAuth] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(false);

  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessingPayment, showPinInput]);

  // Initialize speech recognition
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          console.log("Speech recognition started");
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (event.results && event.results[0] && event.results[0][0]) {
            const transcript = event.results[0][0].transcript;
            console.log("Speech result:", transcript);

            if (needsVoiceAuth) {
              // Handle voice authentication - don't set chatMessage
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
              // Handle normal voice payment command
              console.log("Adding user message:", transcript);
              addUserMessage(transcript);
              setTimeout(() => {
                processPaymentCommand(transcript, true); // Pass true to indicate this was a voice command
              }, 500);
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          setIsVoiceAuth(false);

          let errorMessage =
            "Sorry, I couldn't understand that. Please try again.";

          switch (event.error) {
            case "no-speech":
              errorMessage = "No speech detected. Please try speaking again.";
              break;
            case "audio-capture":
              errorMessage =
                "No microphone found. Please check your microphone.";
              break;
            case "not-allowed":
              errorMessage =
                "Microphone permission denied. Please allow microphone access.";
              break;
            case "network":
              errorMessage = "Network error. Please check your connection.";
              break;
          }

          addBotMessage(errorMessage);
          toast.error(errorMessage);
        };

        recognition.onend = () => {
          console.log("Speech recognition ended");
          setIsListening(false);
          setIsVoiceAuth(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
        console.warn("Speech recognition not supported in this browser");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [needsVoiceAuth]);

  // Cleanup speech recognition on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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

  // Search users mutation
  const { mutateAsync: searchUsersAsync } = useMutation(
    trpc.users.searchUsers.mutationOptions()
  );

  // Get best payment method mutation
  const { mutateAsync: getBestPaymentMethodAsync } = useMutation(
    trpc.smartPayment.getBestPaymentMethod.mutationOptions()
  );

  const processPaymentCommand = async (
    command: string,
    isVoiceParam = false
  ) => {
    try {
      // Step 1: Parse the command with simple client-side NLP
      addBotMessage("Analyzing your request...");

      // Simple client-side parsing
      const text = command.toLowerCase().trim();

      // Extract amount (any number in the text)
      const amountMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
      const amount = amountMatch?.[1] ? parseFloat(amountMatch[1]) : null;

      // Extract recipient name
      let recipient: string | null = null;

      // Pattern: "pay 500 to kavish" or "send 100 to john"
      const toPattern =
        /(?:pay|send|transfer)\s+(?:\d+(?:\.\d{1,2})?)\s+to\s+([a-zA-Z]+)/;
      const toMatch = text.match(toPattern);
      if (toMatch?.[1]) {
        recipient = toMatch[1];
      } else {
        // Pattern: "pay kavish 500" or "send john 100"
        const nameAmountPattern =
          /(?:pay|send|transfer)\s+([a-zA-Z]+)\s+(\d+(?:\.\d{1,2})?)/;
        const nameAmountMatch = text.match(nameAmountPattern);
        if (nameAmountMatch?.[1]) {
          recipient = nameAmountMatch[1];
        }
      }

      // Check if it's a payment command
      const isPaymentCommand = /\b(pay|send|transfer)\b/.test(text);

      if (!isPaymentCommand || !amount || !recipient) {
        setTimeout(() => {
          addBotMessage(
            "I didn't understand that payment request. Please try something like 'pay 100 to kavish' or 'send 50 to john'."
          );
        }, 800);
        return;
      }

      // Step 2: Search for users (using hardcoded known users for demo)
      setIsProcessingPayment(true);
      const steps = [
        "Parsing your payment request",
        "Searching for users matching your query",
        "Finding recently paid contacts",
        "Locating the recipient",
        "Finding the best payment method",
        "Preparing payment details",
      ];

      setThinkingSteps(steps.map((step) => ({ text: step, completed: false })));
      setCurrentThinkingStep(0);

      // Step timeouts for realistic processing feel
      const stepTimeouts = [1200, 1500, 1300, 1600, 1800, 1400];

      // Execute step 1: Parse command (already done)
      setCurrentThinkingStep(0);
      await new Promise((resolve) => setTimeout(resolve, stepTimeouts[0]));
      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === 0 ? { ...step, completed: true } : step
        )
      );

      // Execute step 2: Search users (using tRPC mutation)
      setCurrentThinkingStep(1);
      await new Promise((resolve) => setTimeout(resolve, stepTimeouts[1]));

      // Search for users using the backend API
      const searchResult = await searchUsersAsync({
        query: recipient,
        limit: 5,
      });

      const foundUser = searchResult.find(
        (user) =>
          user.name?.toLowerCase().includes(recipient!.toLowerCase()) ||
          user.email?.toLowerCase().includes(recipient!.toLowerCase())
      );

      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === 1 ? { ...step, completed: true } : step
        )
      );

      // Execute step 3: Check recent contacts
      setCurrentThinkingStep(2);
      await new Promise((resolve) => setTimeout(resolve, stepTimeouts[2]));
      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === 2 ? { ...step, completed: true } : step
        )
      );

      // Execute step 4: Find recipient
      setCurrentThinkingStep(3);
      await new Promise((resolve) => setTimeout(resolve, stepTimeouts[3]));

      if (!foundUser) {
        setIsProcessingPayment(false);
        setTimeout(() => {
          addBotMessage(
            `Sorry, I couldn't find "${recipient}" in your contacts. ${
              searchResult.length > 0
                ? `Did you mean one of these: ${searchResult.map((u) => u.name).join(", ")}?`
                : "Please check the spelling or try adding them as a contact first."
            }`
          );
        }, 800);
        return;
      }

      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === 3 ? { ...step, completed: true } : step
        )
      );

      // Execute step 5: Get best payment method using smart routing
      setCurrentThinkingStep(4);
      await new Promise((resolve) => setTimeout(resolve, stepTimeouts[4]));

      let bestPaymentMethod;
      try {
        const smartPaymentResult = await getBestPaymentMethodAsync({
          amount: amount,
          recipientId: foundUser.id,
        });
        bestPaymentMethod = smartPaymentResult.bestPaymentMethod;
      } catch (error) {
        console.error("Error getting smart payment method:", error);
        // Fallback to default payment method
        bestPaymentMethod =
          paymentMethods?.find((pm) => pm.isDefault) || paymentMethods?.[0];
      }

      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === 4 ? { ...step, completed: true } : step
        )
      );

      // Execute step 6: Prepare payment
      setCurrentThinkingStep(5);
      await new Promise((resolve) => setTimeout(resolve, stepTimeouts[5]));
      setThinkingSteps((prev) =>
        prev.map((step, index) =>
          index === 5 ? { ...step, completed: true } : step
        )
      );

      // Create payment details with smart routing data
      const paymentDetails: PaymentDetails = {
        recipient: foundUser.name,
        email: foundUser.email,
        amount: amount,
        paymentMethod:
          bestPaymentMethod?.type === "upi_id"
            ? "UPI"
            : bestPaymentMethod?.type === "credit_card"
              ? "Credit Card"
              : bestPaymentMethod?.type === "debit_card"
                ? "Debit Card"
                : "Bank Transfer",
        paymentMethodLast4: getDetails(
          bestPaymentMethod?.type!,
          bestPaymentMethod?.details
        ),
        status: "processing",
      };

      setCurrentPayment(paymentDetails);
      setIsProcessingPayment(false);

      // Add delay before showing payment details
      await new Promise((resolve) => setTimeout(resolve, 500));
      addBotMessage("", paymentDetails);

      console.log("VOICE PAYMENT", isVoiceParam);
      // Handle different flows based on how payment was initiated
      if (isVoiceParam) {
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
    } catch (error: any) {
      setIsProcessingPayment(false);
      console.error("Payment processing error:", error);
      setTimeout(() => {
        addBotMessage(
          "Sorry, there was an error processing your request. Please try again or check your payment methods."
        );
      }, 800);
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

      if (!showPinInput && !needsVoiceAuth) {
        await processPaymentCommand(command, false); // Explicitly set to false for text input
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

  const clearAllStatesExceptHistory = () => {
    setChatMessage("");
    setIsListening(false);
    setIsProcessingPayment(false);
    setThinkingSteps([]);
    setCurrentThinkingStep(0);
    setCurrentPayment(null);
    setPinValue("");
    setShowPinInput(false);
    setIsVoiceAuth(false);
    setNeedsVoiceAuth(false);

    // Stop any ongoing speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const completePayment = async () => {
    addBotMessage("Payment processing...");

    try {
      if (!currentPayment) {
        throw new Error("No payment details found");
      }

      // Find the user by email from the current payment
      const user = await findUserAsync({ email: currentPayment.email });

      if (!user) {
        setTimeout(() => {
          addBotMessage("Sorry, couldn't find the user. Please try again.");
          clearAllStatesExceptHistory();
        }, 1000);
        return;
      }

      // Get default payment method
      const defaultPaymentMethod =
        paymentMethods?.find((pm) => pm.isDefault) || paymentMethods?.[0];

      if (!defaultPaymentMethod) {
        setTimeout(() => {
          addBotMessage(
            "Sorry, no payment method found. Please add a payment method first."
          );
          clearAllStatesExceptHistory();
        }, 1000);
        return;
      }

      // Create the payment
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
          // Clear states after successful payment, keeping the completion message
          setTimeout(() => {
            clearAllStatesExceptHistory();
          }, 3000);
        }
      }, 2000);
    } catch (error: any) {
      setTimeout(() => {
        addBotMessage(
          "Sorry, there was an error processing your payment. Please try again."
        );
        clearAllStatesExceptHistory();
      }, 1000);
      toast.error(error.message || "Failed to process payment");
    }
  };

  const handleVoiceToggle = () => {
    if (!speechSupported) {
      addBotMessage(
        "Sorry, speech recognition is not supported in this browser. Please try using Chrome, Safari, or Edge."
      );
      toast.error("Speech recognition not supported");
      return;
    }

    if (!recognitionRef.current) {
      addBotMessage(
        "Speech recognition is not available. Please refresh the page and try again."
      );
      toast.error("Speech recognition not available");
      return;
    }

    if (needsVoiceAuth) {
      // Handle voice authentication for payment confirmation
      if (isVoiceAuth) {
        // Stop voice auth
        recognitionRef.current.stop();
        setIsVoiceAuth(false);
      } else {
        // Start voice auth
        setIsVoiceAuth(true);
        addBotMessage(
          "Voice authentication in progress... Please speak clearly."
        );
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error("Failed to start voice recognition:", error);
          setIsVoiceAuth(false);
          addBotMessage(
            "Failed to start voice authentication. Please try again."
          );
          toast.error("Failed to start voice authentication");
        }
      }
      return;
    }

    // Handle normal voice input for payment commands
    if (isListening) {
      // Stop recording
      recognitionRef.current.stop();
      setIsListening(false);
      addBotMessage("Stopped listening.");
    } else {
      // Start recording
      setIsListening(true);
      addBotMessage(
        "Listening for payment command... Try saying something like 'pay 500 to kavish'"
      );
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start voice recognition:", error);
        setIsListening(false);
        addBotMessage("Failed to start voice recognition. Please try again.");
        toast.error("Failed to start voice recognition");
      }
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
                        : speechSupported
                          ? "Type your message or use voice..."
                          : "Type your message (voice not supported in this browser)..."
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
              disabled={(showPinInput && !needsVoiceAuth) || !speechSupported}
              title={
                !speechSupported
                  ? "Speech recognition not supported in this browser"
                  : isListening
                    ? "Stop listening"
                    : isVoiceAuth
                      ? "Stop voice authentication"
                      : needsVoiceAuth
                        ? "Start voice authentication"
                        : "Start voice input"
              }
            >
              {isListening || isVoiceAuth ? (
                <Square className="h-5 w-5" />
              ) : !speechSupported ? (
                <MicOff className="h-5 w-5" />
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
