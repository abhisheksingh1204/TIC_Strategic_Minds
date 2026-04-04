import Image from "next/image";
import Link from "next/link";
import { ArrowRight, TrendingDown, Users, Zap } from "lucide-react";

const landingStats = [
  {
    icon: Users,
    value: "1M+",
    label: "Homes Optimized",
    iconTone: "bg-[rgba(32,255,111,0.08)] text-[#34ff72]",
  },
  {
    icon: TrendingDown,
    value: "30%",
    label: "Avg. Bill Reduction",
    iconTone: "bg-[rgba(33,197,255,0.10)] text-[#33d8ff]",
  },
  {
    icon: Zap,
    value: "Eco",
    label: "Friendly Insights",
    iconTone: "bg-[rgba(114,255,77,0.10)] text-[#6bff47]",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#040814] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(43,211,255,0.08),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(44,255,100,0.12),transparent_22%),linear-gradient(180deg,#050914_0%,#020611_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-6 pb-10 pt-6 lg:px-10">
        <header className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dff8a_0%,#1ef63a_45%,#0e6f20_100%)] text-[#07110b] shadow-[0_0_22px_rgba(30,246,58,0.32)]">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div className="text-[26px] font-semibold tracking-[-0.04em] text-white">
              Power<span className="text-cyan-400">Fusion</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-14 text-[18px] text-slate-400 lg:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              How it Works
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/appin/login"
              className="inline-flex h-[62px] items-center justify-center rounded-[22px] border border-[rgba(32,44,71,0.95)] bg-[rgba(8,13,26,0.78)] px-7 text-[17px] font-semibold text-white transition-colors hover:bg-[rgba(18,26,46,0.92)]"
            >
              Log In
            </Link>
            <Link
              href="/appin/signup"
              className="inline-flex h-[62px] items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#1fff1a_0%,#5cff4e_100%)] px-8 text-[17px] font-semibold text-[#041108] shadow-[0_18px_40px_rgba(44,255,84,0.2)] transition-transform hover:-translate-y-0.5"
            >
              Sign Up
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.98fr_1.02fr] lg:py-16">
          <div className="max-w-[900px]">
            <h1 className="max-w-[860px] text-[60px] font-semibold leading-[0.98] tracking-[-0.06em] text-white md:text-[82px] xl:text-[92px]">
              Calculate, Simulate, and
              <span className="block">
                <span className="text-[#18ff11]">Save</span> on Your Electricity
              </span>
            </h1>

            <p className="mt-12 max-w-[860px] text-[24px] leading-[1.65] text-slate-400 md:text-[28px]">
              Apne ghar ya apartment ka bill predict karein hamare advanced simulator ke
              saath. Manage your electricity like a pro.
            </p>

            <div className="mt-14 flex flex-wrap items-center gap-5">
              <Link
                href="/appin/signup"
                className="inline-flex h-[78px] items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#1fff1a_0%,#5cff4e_100%)] px-8 text-[18px] font-semibold text-[#041108] shadow-[0_18px_44px_rgba(44,255,84,0.18)] transition-transform hover:-translate-y-0.5"
              >
                Start Calculating Now
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="/appin/login"
                className="inline-flex h-[78px] items-center justify-center rounded-[22px] border border-[rgba(32,44,71,0.95)] bg-[rgba(8,13,26,0.72)] px-14 text-[18px] font-semibold text-white transition-colors hover:bg-[rgba(18,26,46,0.92)]"
              >
                Log In
              </Link>
            </div>

            <div className="mt-14 h-px w-full max-w-[900px] bg-[linear-gradient(90deg,rgba(41,55,82,0.95)_0%,rgba(41,55,82,0.2)_100%)]" />

            <div
              id="features"
              className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-3"
            >
              {landingStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-start gap-4">
                    <div
                      className={`flex h-[64px] w-[64px] items-center justify-center rounded-[20px] ${item.iconTone}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-[28px] font-semibold tracking-[-0.04em] text-white">
                        {item.value}
                      </div>
                      <div className="mt-1 text-[18px] text-slate-400">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="absolute inset-x-[10%] top-[8%] h-[78%] rounded-[40px] bg-[radial-gradient(circle_at_60%_35%,rgba(0,255,229,0.08),transparent_30%),radial-gradient(circle_at_30%_75%,rgba(57,255,20,0.10),transparent_26%),linear-gradient(180deg,rgba(8,11,36,0.92)_0%,rgba(4,10,23,0.98)_100%)] blur-[2px]" />
            <div className="relative w-full max-w-[920px] overflow-hidden rounded-[36px] border border-[rgba(20,40,68,0.75)] bg-[linear-gradient(180deg,rgba(8,11,36,0.95)_0%,rgba(4,10,23,0.98)_100%)] p-4 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
              <Image
                src="/image.png"
                alt="Power Fusion smart home dashboard preview"
                width={768}
                height={768}
                priority
                className="h-auto w-full rounded-[28px] object-cover"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
