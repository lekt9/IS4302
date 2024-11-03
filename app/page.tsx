import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
      {/* Hero Section */}
      <main className="flex flex-col items-center max-w-md w-full space-y-8">
        {/* Icon/Logo */}
        <div className="relative w-48 h-48">
          <Image
            src="/Dinelogo.png"  // You'll need to add this icon
            alt="DineToken"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Title and Description */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">DINE</h1>
          <p className="text-lg text-gray-600">
            Discover new restaurants with discounts
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4 pt-8">
        <Link href="/preferences">
          <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-4 px-6 rounded-full transition-colors">
            Explore
          </button>
          </Link>
          <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-4 px-6 rounded-full transition-colors">
            Create an account
          </button>
        </div>

        {/* Optional: Skip Link */}
        <a href="/home" className="text-sm text-gray-500 hover:text-gray-700">
          Skip for now
        </a>
      </main>
    </div>
  );
}