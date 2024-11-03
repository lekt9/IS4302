'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 3秒后自动返回首页
    const timer = setTimeout(() => {
      router.push('/home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="text-center space-y-4">
        <span className="text-5xl">✅</span>
        <h1 className="text-2xl font-bold">Payment successful!</h1>
        <p className="text-gray-600">Thank you for dining with us.</p>
        <p className="text-sm text-gray-500">Redirecting to home page...</p>
      </div>
    </div>
  );
}