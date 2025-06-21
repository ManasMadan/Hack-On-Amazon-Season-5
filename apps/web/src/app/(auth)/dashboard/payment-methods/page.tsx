"use client";
import { useTRPC } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import React from "react";

export default function ManagePaymentMethods() {
  const trpc = useTRPC();
  // const { mutateAsync } = useMutation(
  //   trpc.paymentMethods.listUserPaymentMethods
  // );

  return <div className="max-w-[1400px] mx-auto">page</div>;
}
