import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import {
  AUTH_COOKIE_NAME,
  isAuthConfigured,
  verifySessionToken,
} from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    reason?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (await verifySessionToken(token)) {
    redirect(params.next || "/");
  }

  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/";
  const setupMode = params.reason === "setup" || !isAuthConfigured();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center">
      <LoginForm nextPath={nextPath} setupMode={setupMode} />
    </div>
  );
}
