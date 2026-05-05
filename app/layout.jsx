export const metadata = {
  title: 'The Team — Marketing Dashboard',
  description: 'AI marketing team for afix.sg and atsell.io',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
