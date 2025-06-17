"use server";

import { redirect } from "next/navigation";
import { auth } from "./index";
import { headers } from "next/headers";

const serverSignOut = async () => {
  await auth.api.signOut({ headers: await headers() }).then((res) => {
    if (res.success) {
      redirect("/auth");
    }
  });
};

const serverSession = async () =>
  await auth.api.getSession({
    headers: await headers(),
  });

export { serverSignOut, serverSession };
