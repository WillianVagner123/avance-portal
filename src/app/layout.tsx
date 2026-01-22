import "./globals.css";
import type { Metadata } from "next";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Clínica Avance",
  description: "Portal interno de profissionais",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-white pb-16">
        {children}

        {/* Marca fixa */}
        <footer className="fixed bottom-3 w-full text-center text-xs text-zinc-400 pointer-events-none">
          Desenvolvido by Will
        </footer>
      </body>
    </html>
  );
}
