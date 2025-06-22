"use client";

import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  CreditCard,
  DollarSign,
  Search,
  Check,
  QrCode,
  Scan,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { PhoneInput } from "@repo/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Badge } from "@repo/ui/badge";
import { Switch } from "@repo/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";

import { useTRPC } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PaymentMethod } from "@repo/database/types";
import { getPaymentMethodDisplayText } from "@/utils/paymentMethods";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "backend";

// Form validation schema
const findUserSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const hasEmail = data.email && data.email.length > 0;
      const hasPhone = data.phone && data.phone.length > 0;
      return hasEmail !== hasPhone; // XOR: either email or phone, not both
    },
    {
      message: "Provide either email or phone number, not both",
      path: ["email"],
    }
  );

const paymentSchema = z
  .object({
    amount: z
      .number({ invalid_type_error: "Amount must be a number" })
      .positive("Amount must be positive")
      .max(1000000, "Amount cannot exceed $1,000,000"),
    paymentMethodId: z.string().uuid().optional(),
    description: z.string().max(500, "Description too long").optional(),
    bestPayment: z.boolean(),
  })
  .refine(
    (data) => {
      // If bestPayment is false, paymentMethodId is required
      if (!data.bestPayment && !data.paymentMethodId) {
        return false;
      }
      return true;
    },
    {
      message: "Payment method is required when best payment is not selected",
      path: ["paymentMethodId"],
    }
  );

type User = inferRouterOutputs<AppRouter>["users"]["findUserByEmailOrPhone"];

export default function PayUser() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [step, setStep] = useState<"find" | "pay">("find");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const router = useRouter();
  const trpc = useTRPC();

  const QRScanner = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const animationRef = useRef<number | null>(null);
    const [cameraError, setCameraError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const checkCameraPermission = async () => {
      try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return false;
        }

        const permission = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        return permission.state !== "denied";
      } catch (error) {
        // Fallback - assume no camera available
        return false;
      }
    };

    const startCamera = async () => {
      if (isScanning || stream) return; // Prevent multiple calls

      try {
        // Check if camera is available first
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(
          (device) => device.kind === "videoinput"
        );

        if (!hasCamera) {
          setCameraError(true);
          setIsScanning(false);
          toast.error(
            "No camera found on this device. Please upload a QR code image instead."
          );
          return;
        }

        // Check camera permission
        const hasPermission = await checkCameraPermission();
        if (!hasPermission) {
          setCameraError(true);
          setIsScanning(false);
          toast.error(
            "Camera permission denied. Please enable camera access or upload a QR code image."
          );
          return;
        }

        setIsScanning(true);
        setCameraError(false);

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        setStream(mediaStream);

        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
            scanForQR();
          } catch (playError) {
            console.error("Video play error:", playError);
            setCameraError(true);
            setIsScanning(false);
          }
        }
      } catch (error) {
        console.error("Camera access error:", error);
        setCameraError(true);
        setIsScanning(false);
        toast.error(
          "Failed to access camera. Please check permissions or try uploading a QR code image."
        );
      }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (context) {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            const imageData = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const qrCode = jsQR(
              imageData.data,
              imageData.width,
              imageData.height
            );

            if (qrCode) {
              try {
                const qrData = JSON.parse(qrCode.data);

                if (qrData.userId && qrData.name && qrData.email) {
                  setSelectedUser({
                    id: qrData.userId,
                    name: qrData.name,
                    email: qrData.email,
                    phoneNumber: qrData.phoneNumber || null,
                    image: qrData.image || null,
                  });

                  if (qrData.amount) {
                    paymentForm.setValue("amount", qrData.amount);
                  }

                  if (qrData.description) {
                    paymentForm.setValue("description", qrData.description);
                  }

                  setStep("pay");
                  setShowQRScanner(false);
                  toast.success(`Found user: ${qrData.name}`);
                  return;
                }
              } catch (error) {
                console.error("Invalid QR code format:", error);
                toast.error("Invalid QR code format");
              }
            } else {
              toast.error("No QR code found in image");
            }
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    const scanForQR = () => {
      if (videoRef.current && canvasRef.current && isScanning) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          const qrCode = jsQR(
            imageData.data,
            imageData.width,
            imageData.height
          );

          if (qrCode) {
            try {
              const qrData = JSON.parse(qrCode.data);

              // Validate QR data structure
              if (qrData.userId && qrData.name && qrData.email) {
                // Stop scanning immediately to prevent multiple detections
                if (animationRef.current) {
                  cancelAnimationFrame(animationRef.current);
                  animationRef.current = null;
                }

                setSelectedUser({
                  id: qrData.userId,
                  name: qrData.name,
                  email: qrData.email,
                  phoneNumber: qrData.phoneNumber || null,
                  image: qrData.image || null,
                });

                // If amount is specified in QR, set it
                if (qrData.amount) {
                  paymentForm.setValue("amount", qrData.amount);
                }

                // If description is specified in QR, set it
                if (qrData.description) {
                  paymentForm.setValue("description", qrData.description);
                }

                setStep("pay");
                stopCamera();
                toast.success(`Found user: ${qrData.name}`);
                return;
              }
            } catch (error) {
              console.error("Invalid QR code format:", error);
            }
          }
        }

        animationRef.current = requestAnimationFrame(scanForQR);
      }
    };

    const stopCamera = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      setIsScanning(false);
      setCameraError(false);
      setShowQRScanner(false);
    };

    useEffect(() => {
      let mounted = true;

      // Only try to start camera if explicitly requested and not already attempted
      if (showQRScanner && !isScanning && !cameraError && !stream) {
        // Don't auto-start camera - let user choose
        setIsScanning(false);
      }

      return () => {
        mounted = false;
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
        setIsScanning(false);
      };
    }, [showQRScanner]);

    return (
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the recipient's payment QR code
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden">
              {!cameraError ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="text-red-400 mb-2">⚠️</div>
                    <div className="text-sm">Error accessing camera</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Please check permissions or upload QR image
                    </div>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />

              {/* QR Code viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>

              {isScanning && !cameraError && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    Scanning for QR code...
                  </div>
                </div>
              )}
            </div>

            {/* Add hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={stopCamera} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
              >
                Upload QR
              </Button>
              {!isScanning && !cameraError && (
                <Button onClick={startCamera} className="flex-1">
                  <Scan className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              )}
              {cameraError && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                >
                  Upload Instead
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Find user form
  const findUserForm = useForm<z.infer<typeof findUserSchema>>({
    resolver: zodResolver(findUserSchema),
    defaultValues: {
      email: "",
      phone: "",
    },
  });

  // Payment form
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethodId: "",
      description: "",
      bestPayment: false,
    },
  });

  const email = findUserForm.watch("email");
  const phone = findUserForm.watch("phone");

  // Queries
  const { data: paymentMethods } = useQuery(
    trpc.paymentMethods.listUserPaymentMethods.queryOptions({
      includeArchived: false,
    })
  );

  // Mutations
  const { mutateAsync: findUserAsync, isPending: isFindingUser } = useMutation(
    trpc.users.findUserByEmailOrPhone.mutationOptions()
  );

  const { mutateAsync: createPaymentAsync, isPending: isCreatingPayment } =
    useMutation(trpc.payments.create.mutationOptions());

  // Effects
  useEffect(() => {
    if (email) {
      findUserForm.setValue("phone", "");
    }
    if (phone) {
      findUserForm.setValue("email", "");
    }
  }, [email, phone, findUserForm]);

  // Set default payment method when payment methods load
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      const defaultMethod =
        paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0];
      if (defaultMethod) {
        paymentForm.setValue("paymentMethodId", defaultMethod.id);
      }
    }
  }, [paymentMethods, paymentForm]);

  // Handlers
  async function onFindUser(values: z.infer<typeof findUserSchema>) {
    try {
      const user = await findUserAsync(values);
      setSelectedUser(user);
      setStep("pay");
    } catch (error: any) {
      toast.error(error.message || "Failed to find user");
    }
  }

  async function onCreatePayment(values: z.infer<typeof paymentSchema>) {
    if (!selectedUser) return;

    toast.promise(
      async () => {
        await createPaymentAsync({
          toUserId: selectedUser.id,
          amount: values.amount,
          paymentMethodId: values.paymentMethodId,
          description: values.description,
          bestPayment: values.bestPayment,
        });
        router.push("/dashboard");
      },
      {
        loading: "Processing payment...",
        success: `Payment of $${values.amount.toFixed(2)} sent to ${selectedUser.name}!`,
        error: (e: Error) => e.message || "Failed to process payment",
      }
    );
  }

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    return getPaymentMethodDisplayText(method);
  };

  if (step === "find") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pay User</h1>
            <p className="text-muted-foreground">
              Find a user by their email or phone number
            </p>
          </div>
        </div>

        {/* Find User Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Recipient
            </CardTitle>
            <CardDescription>
              Enter the recipient's email address or phone number to send them
              money
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...findUserForm}>
              <form
                onSubmit={findUserForm.handleSubmit(onFindUser)}
                className="space-y-6"
              >
                <div className="grid gap-4">
                  {/* Email Field */}
                  <FormField
                    control={findUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="johndoe@example.com"
                            type="email"
                            disabled={!!phone || isFindingUser}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t"></div>
                    <span className="text-sm text-muted-foreground">OR</span>
                    <div className="flex-1 border-t"></div>
                  </div>

                  {/* Phone Field */}
                  <FormField
                    control={findUserForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="IN"
                            disabled={!!email || isFindingUser}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-sm text-muted-foreground">
                    Provide <strong>only one</strong> of the fields above.
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isFindingUser}
                    >
                      {isFindingUser ? "Searching..." : "Find User"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowQRScanner(true)}
                      disabled={isFindingUser}
                      className="px-3"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <QRScanner />
      </div>
    );
  }

  // Payment step
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setStep("find");
            setSelectedUser(null);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Send Payment</h1>
          <p className="text-muted-foreground">
            Review and send money to {selectedUser?.name}
          </p>
        </div>
      </div>

      {/* Recipient Card */}
      {selectedUser && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Recipient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{selectedUser.name}</p>
                <p className="text-muted-foreground">{selectedUser.email}</p>
                {selectedUser.phoneNumber && (
                  <p className="text-muted-foreground text-sm">
                    {selectedUser.phoneNumber}
                  </p>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Enter the amount and select your payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit(onCreatePayment)}
              className="space-y-6"
            >
              {/* Amount Field */}
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="1000000"
                          placeholder="0.00"
                          className="pl-10"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Best Payment Toggle */}
              <FormField
                control={paymentForm.control}
                name="bestPayment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Use Smart Payment
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically select the best payment method for this
                        transaction
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Payment Method Field - Only show when bestPayment is false */}
              {!paymentForm.watch("bestPayment") && (
                <FormField
                  control={paymentForm.control}
                  name="paymentMethodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <SelectValue placeholder="Select payment method" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods?.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{getPaymentMethodDisplay(method)}</span>
                                  {method.isDefault && (
                                    <Badge variant="secondary" className="ml-2">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                      {paymentMethods?.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          No payment methods found.{" "}
                          <Link
                            href="/dashboard/payment-methods"
                            className="text-primary underline"
                          >
                            Add one here
                          </Link>
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}

              {/* Description Field */}
              <FormField
                control={paymentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What's this payment for?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("find");
                    setSelectedUser(null);
                  }}
                  disabled={isCreatingPayment}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    isCreatingPayment ||
                    (!paymentForm.watch("bestPayment") &&
                      !paymentMethods?.length)
                  }
                >
                  {isCreatingPayment
                    ? "Processing..."
                    : `Send $${paymentForm.watch("amount")?.toFixed(2) || "0.00"}`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
