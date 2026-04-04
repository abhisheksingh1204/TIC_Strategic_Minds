"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REGISTER_MUTATION } from "@/lib/graphql/queries/auth.queries";

const plans = [
  { value: "single-room", label: "Single Room" },
  { value: "full-house", label: "Full House" },
  { value: "apartment", label: "Apartment" },
];

export default function SignUp() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [register, { loading }] = useMutation(REGISTER_MUTATION);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    try {
      const { data } = await register({
        variables: {
          input: {
            name: fullName,
            email,
            password,
          },
        },
      });

      if (data?.register) {
        toast.success("Account created successfully. Please sign in.");
        router.push("/appin/login");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
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
              Get Started
            </h1>
            <p className="mt-4 text-[18px] text-[#7e8ea8]">Create your account to start saving</p>
          </div>

          <form onSubmit={handleSignUp} className="mt-10">
            <div>
              <label className="mb-3 block text-[16px] font-semibold text-[#f2f6fb]">Full Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7889a6]" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  className="h-[62px] rounded-[16px] border-[rgba(32,44,71,1)] bg-[#17202d] pl-14 text-[16px] text-[#f3f7fd] shadow-none placeholder:text-[#7485a2] focus-visible:ring-cyan-400/30"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
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
              <label className="mb-3 block text-[16px] font-semibold text-[#f2f6fb]">Select Plan</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPlanDropdown((prev) => !prev)}
                  className="flex h-[62px] w-full items-center justify-between rounded-[16px] border border-[rgba(32,44,71,1)] bg-[#17202d] px-5 text-[16px] text-[#f3f7fd]"
                >
                  <span className={selectedPlan ? "text-white" : "text-slate-400"}>
                    {selectedPlan ? plans.find((p) => p.value === selectedPlan)?.label : "Choose your plan"}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showPlanDropdown ? "rotate-180" : ""}`} />
                </button>
                {showPlanDropdown && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-[16px] border border-[rgba(32,44,71,1)] bg-[#0f1726] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                    {plans.map((plan) => (
                      <button
                        key={plan.value}
                        type="button"
                        onClick={() => {
                          setSelectedPlan(plan.value);
                          setShowPlanDropdown(false);
                        }}
                        className="flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left text-[15px] text-[#f3f7fd] hover:bg-white/5"
                      >
                        <span>{plan.label}</span>
                        {selectedPlan === plan.value ? <Check className="h-4 w-4 text-lime-400" /> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-[16px] font-semibold text-[#f2f6fb]">Create Password</label>
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

            <div className="mt-6 flex items-start gap-3 text-[16px] leading-[1.7] text-[#8190aa]">
              <button
                type="button"
                onClick={() => setAgreeTerms((prev) => !prev)}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-[rgba(32,44,71,1)] bg-[#17202d] ${agreeTerms ? "border-lime-400 bg-lime-400 text-[#041108]" : "text-transparent"}`}
              >
                <Check className="h-3 w-3" />
              </button>
              <label>
                I agree to the{" "}
                <Link href="#" className="text-[#12c8ff] transition-colors hover:text-[#7edfff]">
                  Terms and Conditions
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-7 h-[58px] w-full rounded-[16px] bg-[#18ff11] text-[18px] font-bold text-[#041108] shadow-none hover:bg-[#35ff2e]"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create My Account"}
            </Button>
          </form>

          <p className="mt-9 text-center text-[16px] text-[#8190aa]">
            Already have account?{" "}
            <Link href="/appin/login" className="text-[#12c8ff] transition-colors hover:text-[#7edfff]">
              Sign In
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
