import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "TETHER — Here. Near. Within Reach.",
  description:
    "An AI-assisted flood risk preparedness and emergency response platform connecting people to nearby help.",
  applicationName: "TETHER",
  keywords: [
    "TETHER",
    "flood preparedness",
    "emergency response",
    "disaster relief",
    "community safety",
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFCF9",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable}`}
    >
      <body className="min-h-dvh bg-surface font-body text-plum antialiased">
        <main className="min-h-dvh w-full">{children}</main>
      </body>
    </html>
  );
}