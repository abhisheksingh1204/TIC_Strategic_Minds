import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  Check,
  Cpu,
  Leaf,
  Lightbulb,
  Move,
  TrendingDown,
  Zap,
} from "lucide-react";

const stats = [
  { icon: TrendingDown, value: "30%", label: "Avg. Bill Reduction", tone: "cyan" },
  { icon: Leaf, value: "Eco", label: "Friendly Insights", tone: "lime" },
];

const featureCards = [
  {
    icon: Calculator,
    title: "Bill Calculator",
    description: "Calculate your monthly electricity bill with precision",
  },
  {
    icon: Cpu,
    title: "Drag & Drop Simulator",
    description: "Simulate your home appliances like a circuit board",
  },
  {
    icon: BarChart3,
    title: "Real-time Estimates",
    description: "See live cost updates as you add appliances",
  },
  {
    icon: BarChart3,
    title: "Cost Optimization",
    description: "Get suggestions to reduce your electricity bill",
  },
  {
    icon: Lightbulb,
    title: "Energy Insights",
    description: "Understand which appliances consume the most",
  },
  {
    icon: Zap,
    title: "Save Energy",
    description: "Track and reduce your carbon footprint",
  },
];

const steps = [
  {
    number: "1",
    icon: Building2,
    title: "Create Property",
    description: "Start by creating a House or Apartment property",
  },
  {
    number: "2",
    icon: Building2,
    title: "Add Rooms",
    description: "Add rooms like Bedroom, Kitchen, Living Room",
  },
  {
    number: "3",
    icon: Move,
    title: "Drag & Drop Devices",
    description: "Place devices in rooms and configure their usage",
  },
  {
    number: "4",
    icon: BarChart3,
    title: "Get Analysis",
    description: "View estimated bills and consumption insights",
  },
];

const pricing = [
  {
    name: "Free",
    price: "₹0",
    suffix: "forever",
    description: "Perfect for getting started",
    cta: "Get Started",
    featured: false,
    items: [
      "1 Property",
      "Up to 3 Rooms",
      "Basic device library",
      "Monthly bill estimation",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "₹199",
    suffix: "/month",
    description: "Best for home owners",
    cta: "Start Pro Trial",
    featured: true,
    items: [
      "Unlimited Properties",
      "Unlimited Rooms",
      "Full device library",
      "Advanced analytics",
      "40-day trend analysis",
      "Priority support",
      "Export reports",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    suffix: "",
    description: "For real estate & businesses",
    cta: "Contact Sales",
    featured: false,
    items: [
      "Everything in Pro",
      "Multi-user access",
      "Custom integrations",
      "API access",
      "Dedicated support",
      "Custom branding",
    ],
  },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-orb landing-orb-left" />
      <div className="landing-orb landing-orb-right" />

      <div className="landing-wrap">
        <header className="landing-header">
          <Link href="/" className="landing-brand">
            <div className="landing-logo-mark">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div className="landing-brand-text">
              Power<span>Fusion</span>
            </div>
          </Link>

          <nav className="landing-nav">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="landing-actions">
            <Link href="/appin/login" className="landing-button landing-button-muted landing-button-nav">
              Log In
            </Link>
            <Link href="/appin/signup" className="landing-button landing-button-primary landing-button-nav">
              Sign Up
            </Link>
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-copy">
            <h1>
              Calculate, Simulate, and <span>Save</span> on Your Electricity
            </h1>

            <p>
              Apne ghar ya apartment ka bill predict karein hamare advanced simulator ke
              saath. Manage your electricity like a pro.
            </p>

            <div className="landing-cta-row">
              <Link href="/appin/signup" className="landing-button landing-button-primary landing-button-hero">
                Start Calculating Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/appin/login" className="landing-button landing-button-muted landing-button-hero">
                Log In
              </Link>
            </div>

            <div className="landing-stats">
              {stats.map(({ icon: Icon, value, label, tone }) => (
                <div key={label} className="landing-stat">
                  <div className={`landing-stat-icon landing-stat-icon-${tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="landing-stat-value">{value}</div>
                    <div className="landing-stat-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-visual-col">
            <div className="landing-hero-frame">
              <Image
                src="/image.png"
                alt="Power Fusion electricity simulation hero"
                fill
                priority
                className="landing-hero-image"
                sizes="(min-width: 1024px) 42vw, 92vw"
              />
              <div className="landing-hero-overlay" />
            </div>
          </div>
        </section>

        <section id="features" className="landing-section landing-section-features">
          <div className="landing-section-head">
            <h2>Powerful Features</h2>
            <p>Everything you need to manage and optimize your electricity consumption</p>
          </div>

          <div className="landing-features-grid">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <article key={title} className="landing-feature-card">
                <div className="landing-feature-icon">
                  <Icon className="h-6 w-6" />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-section-steps">
          <div className="landing-section-head">
            <h2>How It Works</h2>
            <p>Get started in 4 simple steps</p>
          </div>

          <div className="landing-steps">
            <div className="landing-steps-line" />
            {steps.map(({ number, icon: Icon, title, description }) => (
              <div key={title} className="landing-step">
                <div className="landing-step-circle-wrap">
                  <div className="landing-step-circle">
                    <Icon className="h-11 w-11" />
                  </div>
                  <div className="landing-step-number">{number}</div>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section landing-section-pricing">
          <div className="landing-section-head">
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose the plan that fits your needs</p>
          </div>

          <div className="landing-pricing-grid">
            {pricing.map((plan) => (
              <article
                key={plan.name}
                className={`landing-price-card ${plan.featured ? "landing-price-card-featured" : ""}`}
              >
                {plan.featured ? <div className="landing-price-badge">Most Popular</div> : null}
                <h3>{plan.name}</h3>
                <div className="landing-price-row">
                  <span className="landing-price-value">{plan.price}</span>
                  {plan.suffix ? <span className="landing-price-suffix">{plan.suffix}</span> : null}
                </div>
                <p className="landing-price-description">{plan.description}</p>

                <ul className="landing-price-list">
                  {plan.items.map((item) => (
                    <li key={item}>
                      <span className="landing-price-check">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/appin/signup"
                  className={`landing-price-cta ${
                    plan.featured ? "landing-price-cta-featured" : "landing-price-cta-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <footer className="landing-footer">© 2024 Power Fusion</footer>
      </div>
    </main>
  );
}
