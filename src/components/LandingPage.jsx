import Hero from './hero/Hero';

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1 bg-background overflow-hidden relative min-h-screen">
      <Hero />
    </div>
  );
}
