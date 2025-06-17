import { redirect } from "next/navigation";
import { serverSession } from "@repo/auth/server";

export default async function index() {
  const result = await serverSession();

  if (!result) {
    return redirect("/auth/sign-in");
  }
  if (!result.session || !result.user) {
    return redirect("/auth/sign-in");
  }

  return redirect("/dashboard");
}
