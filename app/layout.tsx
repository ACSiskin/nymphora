import "./globals.css"
import { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata = {
  title: "Nymphora",
  description: "Reconica OSINT Interface",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className="dark antialiased bg-black text-white font-mono">
      <body className="h-screen w-screen overflow-hidden bg-black text-white selection:bg-emerald-500/30">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
