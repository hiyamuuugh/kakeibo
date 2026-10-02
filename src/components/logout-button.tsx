"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  mobile?: boolean;
};

export function LogoutButton({ mobile = false }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant={mobile ? "ghost" : "outline"}
      size={mobile ? "icon" : "sm"}
      className={mobile ? "h-10 w-10 rounded-full" : "h-9"}
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      <span className={mobile ? "sr-only" : "ml-2"}>ログアウト</span>
    </Button>
  );
}
