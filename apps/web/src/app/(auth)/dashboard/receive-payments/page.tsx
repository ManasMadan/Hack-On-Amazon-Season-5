"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Share2, Copy, QrCode, User, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import QRCodeLib from "qrcode";

import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";

import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useCustomSession } from "@/hooks/useCustomSession";

export default function ReceivePayments() {
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const trpc = useTRPC();
const { data: currentUser, isPending: isLoadingUser } = useCustomSession();

  // Generate QR code when user data or payment details change
  useEffect(() => {
    generateQRCode();
  }, [currentUser, amount, description]);

  const generateQRCode = async () => {
    if (!currentUser) return;

    setIsGeneratingQR(true);
    try {
      const qrData = {
        userId: currentUser.user.id,
        name: currentUser.user.name,
        email: currentUser.user.email,
        phoneNumber: currentUser.user.phoneNumber,
        amount: amount ? parseFloat(amount) : undefined,
        description: description || undefined,
        timestamp: Date.now()
      };

      const qrDataString = JSON.stringify(qrData);
      
      // Generate QR code as data URL
      const qrCodeURL = await QRCodeLib.toDataURL(qrDataString, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeDataURL(qrCodeURL);
      
      // Also draw on canvas for download functionality
      if (qrCanvasRef.current) {
        await QRCodeLib.toCanvas(qrCanvasRef.current, qrDataString, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleCopyQRData = async () => {
    if (!currentUser) return;
    
    const qrData = {
      userId: currentUser.user.id,
      name: currentUser.user.name,
      email: currentUser.user.email,
      phoneNumber: currentUser.user.phoneNumber,
      amount: amount ? parseFloat(amount) : undefined,
      description: description || undefined,
      timestamp: Date.now()
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
      toast.success("QR code data copied to clipboard");
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error("Failed to copy QR code data");
    }
  };

  const handleShare = async () => {
    const shareText = `${currentUser?.user.name} is requesting payment${amount ? ` of $${amount}` : ''}${description ? ` for: ${description}` : ''}`;
    
    if (navigator.share) {
      try {
        // Convert canvas to blob for sharing
        if (qrCanvasRef.current) {
          qrCanvasRef.current.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'payment-qr.png', { type: 'image/png' });
              await navigator.share({
                title: "Payment Request",
                text: shareText,
                files: [file]
              });
            }
          });
        }
      } catch (error) {
        console.error("Error sharing:", error);
        toast.error("Sharing not available, data copied instead");
        handleCopyQRData();
      }
    } else {
      // Fallback to copying
      handleCopyQRData();
    }
  };

  const handleDownloadQR = () => {
    if (qrCanvasRef.current) {
      const link = document.createElement('a');
      link.download = `payment-request-${currentUser?.user.name?.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = qrCanvasRef.current.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code downloaded");
    }
  };

  const formatAmount = (value: string) => {
    if (!value) return "";
    const num = parseFloat(value);
    return isNaN(num) ? "" : num.toFixed(2);
  };

  if (isLoadingUser) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Receive Payments</h1>
          <p className="text-muted-foreground">
            Generate a QR code for others to send you money
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Request Details</CardTitle>
              <CardDescription>
                Customize your payment request (all fields are optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount">Requested Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000000"
                    placeholder="0.00"
                    className="pl-10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Leave empty to allow any amount
                </p>
              </div>
              
              <div>
                <Label htmlFor="description">Payment Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's this payment for? (e.g., Dinner split, Concert ticket, etc.)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {description.length}/200 characters
                </p>
              </div>

              {/* Preview */}
              {(amount || description) && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Request Preview:</h4>
                  <div className="text-sm space-y-1">
                    {amount && (
                      <p><span className="font-medium">Amount:</span> ${formatAmount(amount)}</p>
                    )}
                    {description && (
                      <p><span className="font-medium">For:</span> {description}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Info */}
          {currentUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </CardTitle>
                <CardDescription>
                  This information will be shared when someone scans your QR code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{currentUser.user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span className="text-right break-all">{currentUser.user.email}</span>
                  </div>
                  {currentUser.user.phoneNumber && (
                    <div className="flex justify-between">
                      <span className="font-medium">Phone:</span>
                      <span>{currentUser.user.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* QR Code */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Payment QR Code
              </CardTitle>
              <CardDescription>
                Share this QR code for others to scan and send you money
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {/* QR Code Display */}
                <div className="relative">
                  <div className="p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                    {isGeneratingQR ? (
                      <div className="w-64 h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : qrCodeDataURL ? (
                      <img 
                        src={qrCodeDataURL} 
                        alt="Payment QR Code" 
                        className="w-64 h-64"
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                        <QrCode className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Hidden canvas for download */}
                  <canvas 
                    ref={qrCanvasRef} 
                    className="hidden"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQR}
                    disabled={!qrCodeDataURL}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={!qrCodeDataURL}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyQRData}
                    disabled={!currentUser}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>

                {/* Instructions */}
                <div className="text-center text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                  <p className="font-medium mb-2">How to receive payment:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Share this QR code with the person paying you</li>
                    <li>They open their payment app and tap "Scan QR"</li>
                    <li>They point their camera at this code</li>
                    <li>Payment details auto-fill and they confirm</li>
                    <li>You'll receive the payment instantly!</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Other things you can do from here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/transactions">
                View Transaction History
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/pay-user">
                Send Payment Instead
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/payment-methods">
                Manage Payment Methods
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}