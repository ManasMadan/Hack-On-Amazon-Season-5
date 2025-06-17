import React from "react";
import { prisma } from "@repo/prisma";

export default function page() {
  return <div>{prisma}</div>;
}
