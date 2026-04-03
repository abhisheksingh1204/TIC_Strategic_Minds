"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client";
import { Eye, EyeOff, Lock, Mail, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOGIN_MUTATION } from "@/lib/graphql/queries/auth.queries";
import { setAuthTokens } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { loading }] = useMutation(LOGIN_MUTATION);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data } = await login({
        variables: {
          input: {
            email,
            password,
          },
        },
      });

      if (data?.login) {
        setAuthTokens(data.login.accessToken, data.login.refreshToken);
        toast.success("Login successful");
        router.push("/appin/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="auth-shell flex min-h-screen justify-center px-4 pb-8 pt-6">
      <div className="w-full max-w-[640px]">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center justify-center gap-3">
          <div className="landing-logo-mark">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div className="text-[18px] font-bold tracking-[-0.03em] text-white">
            Power<span className="text-cyan-400">Fusion</span>
          </div>
        </Link>

        <section className="mx-auto w-full max-w-[560px] rounded-[22px] border border-[rgba(31,45,75,0.9)] bg-[#09101d] px-8 py-10 shadow-[0_24px_70px_rgba(0,0,0,0.32)] animate-slide-up md:px-10 md:py-11">
          <div className="text-center">
            <h1 className="m-0 text-[48px] font-bold leading-none tracking-[-0.04em] text-[#f8fbff]">
              Welcome Back
            </h1>
            <p className="mt-4 text-[18px] text-[#7e8ea8]">Please enter to details</p>
          </div>

          <form onSubmit={handleLogin} className="mt-10">
            <div>
              <label className="mb-3 block text-[16px] font-semibold text-[#f2f6fb]">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7889a6]" />
                <Input
                  type="email"
                  placeholder="name@email.com"
                  className="h-[62px] rounded-[16px] border-[rgba(32,44,71,1)] bg-[#17202d] pl-14 text-[16px] text-[#f3f7fd] shadow-none placeholder:text-[#7485a2] focus-visible:ring-cyan-400/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-[16px] font-semibold text-[#f2f6fb]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7889a6]" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="h-[62px] rounded-[16px] border-[rgba(32,44,71,1)] bg-[#17202d] pl-14 pr-14 text-[16px] text-[#f3f7fd] shadow-none placeholder:text-[#7485a2] focus-visible:ring-cyan-400/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7889a6] transition-colors hover:text-[#dce6f4]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Link href="#" className="text-[16px] text-[#12c8ff] transition-colors hover:text-[#7edfff]">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-7 h-[58px] w-full rounded-[16px] bg-[#19b6ee] text-[18px] font-bold text-[#041018] shadow-none hover:bg-[#29c1f4]"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="relative mt-8 flex items-center justify-center text-[#8190aa]">
            <div className="h-px flex-1 bg-[rgba(64,79,111,0.55)]" />
            <span className="px-4 text-[16px]">or</span>
            <div className="h-px flex-1 bg-[rgba(64,79,111,0.55)]" />
          </div>

          <button
            type="button"
            className="mt-8 flex h-[58px] w-full items-center justify-center gap-4 rounded-[16px] border border-[rgba(32,44,71,1)] bg-[rgba(14,21,35,0.55)] text-[16px] font-bold text-[#f7fbff]"
          >
            <span className="text-[18px] font-extrabold leading-none">G</span>
            <span>Login with Google</span>
          </button>

          <p className="mt-9 text-center text-[16px] text-[#8190aa]">
            Don't have account?{" "}
            <Link href="/appin/signup" className="text-[#12c8ff] transition-colors hover:text-[#7edfff]">
              Sign Up
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
