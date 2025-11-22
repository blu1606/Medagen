import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Activity, Shield, Clock } from 'lucide-react';
import { ThemeToggle } from '@/components/utility/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <Activity className="h-6 w-6" />
            Medagen
          </div>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 text-center bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              AI-Powered Health Triage <br />
              <span className="text-primary">Instant & Accurate</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get immediate guidance on your symptoms. Our advanced AI assistant helps you decide if you need emergency care, a doctor&apos;s visit, or self-care at home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 h-12" asChild>
                <Link href="/intake">
                  Start Free Assessment <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                Learn How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Available 24/7</h3>
                <p className="text-muted-foreground">
                  Get health answers anytime, anywhere. No waiting rooms or appointment scheduling required.
                </p>
              </div>
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Clinical Accuracy</h3>
                <p className="text-muted-foreground">
                  Powered by advanced medical LLMs and verified against clinical guidelines for reliable triage.
                </p>
              </div>
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
                <p className="text-muted-foreground">
                  Your health data is encrypted and protected. We prioritize patient privacy and data security.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Medagen AI. All rights reserved.</p>
          <p className="mt-2 text-xs">
            Disclaimer: Medagen is an AI assistant and does not replace professional medical advice.
            In case of emergency, call your local emergency number immediately.
          </p>
        </div>
      </footer>
    </div>
  );
}
