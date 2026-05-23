import "./globals.css";
import GlassNavbar from "@/components/GlassNavbar";

export const metadata = {
  title: "decarb.io - Zero Food Waste, Eco-Futuristic Surplus Food Rescue",
  description: "Rescue surplus meals from local restaurants, groceries, and cafes. Track your carbon offset and eliminate food waste today.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlassNavbar />
        {children}
      </body>
    </html>
  );
}
