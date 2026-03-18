import { Link } from "react-router-dom";
import { ArrowRight, Palette, Sparkles, Upload, Layers, Shield, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-36">
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
              AI-Powered Furniture Customization
            </p>
            <h1 className="font-display text-5xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6">
              Transform Your
              <br />
              <span className="text-primary">Design Vision</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-10">
              Upload your furniture photo, select premium materials, and watch AI 
              transform your piece in seconds. Professional-grade customization 
              made effortless.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-13 px-8 text-base rounded-lg">
                <Link to="/customize">
                  Start Customizing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-8 text-base rounded-lg">
                <a href="#how-it-works">
                  Learn More
                </a>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-green-light to-transparent pointer-events-none hidden lg:block" />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">How It Works</p>
            <h2 className="font-display text-4xl font-bold text-foreground">
              Three Simple Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                step: "01",
                title: "Upload Your Photo",
                description: "Take a photo of any furniture piece — buffet tables, chairs, cabinets, or anything you want to customize.",
              },
              {
                icon: Palette,
                step: "02",
                title: "Choose Materials",
                description: "Browse our library of premium wood, stone, metal, and fabric patterns. Assign different materials to each furniture part.",
              },
              {
                icon: Sparkles,
                step: "03",
                title: "Generate Design",
                description: "Our AI accurately applies your chosen materials while preserving the exact shape and proportions of your furniture.",
              },
            ].map((item) => (
              <div key={item.step} className="group relative p-8 rounded-2xl border border-border bg-background hover:border-primary/30 transition-all">
                <span className="text-6xl font-display font-bold text-muted/60 absolute top-6 right-6">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">What We Offer</p>
              <h2 className="font-display text-4xl font-bold text-foreground mb-6">
                Professional Furniture Visualization
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Our AI-powered platform enables designers, manufacturers, and retailers 
                to visualize furniture in any material combination — without expensive 
                photoshoots or physical samples.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Layers,
                    title: "Intelligent Part Detection",
                    description: "AI automatically identifies distinct parts — surfaces, frames, edges, and trim — for precise material assignment.",
                  },
                  {
                    icon: Shield,
                    title: "Shape Preservation",
                    description: "Our technology strictly maintains the original furniture silhouette. No added elements, no distortions.",
                  },
                  {
                    icon: Palette,
                    title: "100+ Premium Materials",
                    description: "Choose from an extensive library of real wood veneers, natural stones, metals, fabrics, and 3D textures.",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-3xl border border-border p-12 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <p className="font-display text-2xl font-semibold text-foreground mb-2">
                  See It In Action
                </p>
                <p className="text-muted-foreground mb-6">
                  Try our customizer with your own furniture
                </p>
                <Button asChild className="rounded-lg">
                  <Link to="/customize">
                    Try Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Concept */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Leaf className="w-10 h-10 mx-auto mb-6 opacity-80" />
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-8">
            Our Philosophy
          </h2>
          <blockquote className="text-xl lg:text-2xl leading-relaxed font-light opacity-90 mb-8">
            "LUSH by Gesign concept starts with the idea of using the simplest and 
            fewest elements to create the maximum effect, not just the few. It is 
            achieved by combining function, quality, design and value — always with 
            sustainability in mind."
          </blockquote>
          <div className="flex items-center justify-center gap-6 text-sm opacity-70">
            <span>Function</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground" />
            <span>Quality</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground" />
            <span>Design</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground" />
            <span>Value</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground" />
            <span>Sustainability</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Furniture?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start customizing with our AI-powered tool — no design experience needed.
          </p>
          <Button asChild size="lg" className="h-13 px-10 text-base rounded-lg">
            <Link to="/customize">
              Transform Your Design <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">L</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              LUSH<span className="font-normal text-muted-foreground">by</span>GESIGN
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LUSHbyGESIGN. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
