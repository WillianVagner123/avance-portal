import "./globals.css";
import type { Metadata } from "next";

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
      <body className="min-h-screen bg-zinc-950 text-white">
        {children}

        {/* Marca fixa */}
        <footer className="fixed bottom-3 w-full text-center text-xs text-zinc-400">
          Desenvolvido by Will
        </footer>
      </body>
    </html>
  );
}
