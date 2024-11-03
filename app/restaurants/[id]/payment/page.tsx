'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const paymentMethods = [
  { id: 'credit', label: 'Credit Card' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'apple', label: 'Apple Pay' }
];

export default function PaymentPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const originalPrice = 50.00;
  const discountRate = 0.2; // 20% discount
  const discountedPrice = originalPrice * (1 - discountRate);

  const handlePayment = async () => {
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    
    // 模拟支付处理
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push('payment/success');
    } catch (error) {
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white space-y-6">
      <h1 className="text-2xl font-bold">Discount Payment</h1>

      {/* 价格信息 */}
      <div className="bg-white rounded-lg p-6 shadow-sm space-y-2">
        <div className="flex justify-between items-center">
          <span>Original Price:</span>
          <span>${originalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-yellow-500 font-bold">
          <span>Discounted Price:</span>
          <span>${discountedPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* 支付方式选择 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Payment Options</h2>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer"
            >
              <input
                type="radio"
                name="payment"
                value={method.id}
                checked={selectedMethod === method.id}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="h-4 w-4 text-yellow-400"
              />
              <span>{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={isProcessing || !selectedMethod}
        className="w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full disabled:bg-gray-300"
      >
        {isProcessing ? 'Processing...' : 'Confirm Payment'}
      </button>
    </div>
  );
}