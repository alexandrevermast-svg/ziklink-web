// @ts-ignore
import "./globals.css";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import MainWrapper from "@/components/MainWrapper";
import HeaderSpacer from "@/components/HeaderSpacer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ziklink",
  description: "trouve tes prochains jam, concert ou groupe de musique",
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Header />
        <HeaderSpacer />
        <div className="min-h-screenbg-zik-bg text-zik-text">
          <MainWrapper>{children}</MainWrapper>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}