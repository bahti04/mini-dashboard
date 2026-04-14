export const metadata = {
  title: "Orders Dashboard",
  description: "RetailCRM orders mini dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0b0d10", color: "#e6e7ea" }}>
        {children}
      </body>
    </html>
  );
}
