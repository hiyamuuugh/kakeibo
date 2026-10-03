"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  nextPath: string;
  setupMode: boolean;
};

export function LoginForm({ nextPath, setupMode }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (setupMode) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };

      if (payload.error === "invalid_password") {
        setError("パスワードが違います。");
      } else {
        setError("ログインできませんでした。");
      }

      return;
    }

    const target = nextPath === "/" ? "/select-member" : `/select-member?next=${encodeURIComponent(nextPath)}`;
    router.replace(target);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#3b82f6]">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">家族用ログイン</CardTitle>
          <p className="text-sm text-[#6b7280]">
            身内だけで使うため、最初に共通パスワードを入力します。
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {setupMode ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            `APP_PASSWORD` と `APP_SESSION_SECRET` が未設定です。Vercel とローカル環境の両方に設定してください。
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#374151]" htmlFor="password">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="家族用パスワード"
                className="h-11"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={loading || password.length === 0}
            >
              {loading ? (
                "ログイン中..."
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
