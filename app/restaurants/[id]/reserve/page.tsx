'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReservePage() {
  const router = useRouter();
  const [guestCount, setGuestCount] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 这里可以添加预订验证逻辑
    router.push(`payment`); // 导航到支付页面
  };

  // 生成时间选项的函数
const generateTimeOptions = () => {
    const times = [];
    const startHour = 8;  // 早上 8 点开始
    const endHour = 22;   // 晚上 10 点结束
  
    for (let hour = startHour; hour <= endHour; hour++) {
      // 添加整点
      times.push({
        value: `${hour.toString().padStart(2, '0')}:00`,
        label: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
      });
      // 添加半点
      if (hour !== endHour) {
        times.push({
          value: `${hour.toString().padStart(2, '0')}:30`,
          label: `${hour % 12 || 12}:30 ${hour < 12 ? 'AM' : 'PM'}`
        });
      }
    }
    return times;
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-2xl font-bold mb-6">Make a Reservation</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 人数选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Guests
          </label>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
              className="p-2 border rounded-full"
            >
              -
            </button>
            <span className="text-lg">{guestCount}</span>
            <button
              type="button"
              onClick={() => setGuestCount(guestCount + 1)}
              className="p-2 border rounded-full"
            >
              +
            </button>
          </div>
        </div>

        {/* 日期选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>

        {/* 时间选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          >
            <option value="">Select time</option>
            {generateTimeOptions().map((timeOption) => (
              <option key={timeOption.value} value={timeOption.value}>
                {timeOption.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full"
        >
          Continue to Payment
        </button>
      </form>
    </div>
  );
}