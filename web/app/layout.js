import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Архив интернет-архива омских СМИ",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
