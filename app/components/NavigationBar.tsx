'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('Restaurants');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    // 可以根据tab添加相应的路由逻辑
    switch(tab) {
      case 'Fresh':
        router.push('/home?filter=fresh');
        break;
      case 'Restaurants':
        router.push('/home');
        break;
      // ... 其他标签的路由逻辑
    }
  };

  // 只在特定页面显示导航栏
  if (!pathname.includes('/home') && !pathname.includes('/restaurants')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-between py-3">
          <button
            onClick={() => handleTabClick('Fresh')}
            className={`flex flex-col items-center ${activeTab === 'Fresh' ? 'text-yellow-500' : 'text-gray-500'}`}
          >
            <span className="text-2xl">🆕</span>
            <span className="text-xs">Fresh</span>
          </button>
          <button
            onClick={() => handleTabClick('Trending')}
            className={`flex flex-col items-center ${activeTab === 'Trending' ? 'text-yellow-500' : 'text-gray-500'}`}
          >
            <span className="text-2xl">🔥</span>
            <span className="text-xs">Trending</span>
          </button>
          <button
            onClick={() => handleTabClick('Specials')}
            className={`flex flex-col items-center ${activeTab === 'Specials' ? 'text-yellow-500' : 'text-gray-500'}`}
          >
            <span className="text-2xl">🎯</span>
            <span className="text-xs">Specials</span>
          </button>
          <button
            onClick={() => handleTabClick('Updates')}
            className={`flex flex-col items-center ${activeTab === 'Updates' ? 'text-yellow-500' : 'text-gray-500'}`}
          >
            <span className="text-2xl">📢</span>
            <span className="text-xs">Updates</span>
          </button>
          <button
            onClick={() => handleTabClick('Restaurants')}
            className={`flex flex-col items-center ${activeTab === 'Restaurants' ? 'text-yellow-500' : 'text-gray-500'}`}
          >
            <span className="text-2xl">🍽️</span>
            <span className="text-xs">Restaurants</span>
          </button>
        </div>
      </div>
    </nav>
  );
}