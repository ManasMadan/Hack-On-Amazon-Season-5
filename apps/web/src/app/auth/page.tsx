import { redirect } from "next/navigation";
import { serverSession } from "@repo/auth/server";

export default async function index() {
  const result = await serverSession();

  if (!result) {
    return redirect("/auth/login");
  }
  if (!result.session || !result.user) {
    return redirect("/auth/login");
  }

  return redirect("/dashboard");
}
