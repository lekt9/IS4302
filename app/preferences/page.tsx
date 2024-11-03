'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const cuisineTypes = [
  'Italian', 'Japanese', 'Thai',
  'Mexican', 'Indian', 'Mediterranean',
  'French', 'Spanish', 'Greek',
  'Chinese', 'American', 'Korean',
  'Vietnamese', 'Vegetarian', 'Vegan',
  'Brazilian', 'Middle Eastern'
];

export default function PreferencesPage() {
  const router = useRouter();
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleContinue = () => {
    if (selectedCuisines.length > 0) {
      // Save cuisine preferences before navigation
      localStorage.setItem('userCuisines', JSON.stringify(selectedCuisines));
      router.push('/preferences/location');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-white">
      <main className="flex flex-col items-center max-w-md w-full space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Select your preferred cuisine types
        </h1>

        <div className="flex flex-wrap justify-center gap-3 w-full">
          {cuisineTypes.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => toggleCuisine(cuisine)}
              className={`px-6 py-2 rounded-full transition-colors ${
                selectedCuisines.includes(cuisine)
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-4 px-6 rounded-full transition-colors mt-8"
        >
          Continue
        </button>
      </main>
    </div>
  );
}