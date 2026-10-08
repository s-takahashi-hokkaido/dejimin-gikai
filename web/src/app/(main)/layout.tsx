import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { AuthGate } from "@/components/layouts/auth-gate";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { RubyfulInitializer } from "@/lib/rubyful";
import { TextSizeInitializer } from "@/lib/text-size/initializer";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <TextSizeInitializer />
      <RubyfulInitializer />
      <AuthGate />

      <MainLayout>
        <Header />
        <main className="min-h-dvh md:min-h-[calc(100dvh-96px)] bg-mirai-surface">
          {children}
        </main>
        <Footer />
      </MainLayout>
    </>
  );
}
