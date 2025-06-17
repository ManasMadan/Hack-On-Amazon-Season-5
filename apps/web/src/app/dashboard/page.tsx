import { serverSignOut } from "@repo/auth/server";
import { Button } from "@repo/ui/button";
import React from "react";

export default function dashboard() {
  return (
    <div>
      <Button onClick={serverSignOut}>Logout</Button>
    </div>
  );
}
