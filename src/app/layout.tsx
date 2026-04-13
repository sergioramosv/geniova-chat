import "@tailwindcss/postcss";
import "./globals.css";

export const metadata = { title: "Geniova Chat" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white">{children}</body>
    </html>
  );
}
