import './globals.css'
import { Analytics } from "@vercel/analytics/react"

export const metadata = {
  title: 'API | iDEFi.AI',
  description: 'API Tooling',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}
      <Analytics />
      </body>
    </html>
  )
}
