'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker } from '@react-google-maps/api';

// 按线路组织地铁站
const mrtLines = {
    'North-South Line': [
      { name: 'Jurong East', location: { lat: 1.3329, lng: 103.7422 } },
      { name: 'Woodlands', location: { lat: 1.4367, lng: 103.7864 } },
      { name: 'Yishun', location: { lat: 1.4295, lng: 103.8353 } },
      { name: 'Bishan', location: { lat: 1.3509, lng: 103.8486 } },
      { name: 'Ang Mo Kio', location: { lat: 1.3700, lng: 103.8496 } },
      { name: 'Orchard', location: { lat: 1.3024, lng: 103.8324 } },
      { name: 'City Hall', location: { lat: 1.2931, lng: 103.8519 } },
      { name: 'Raffles Place', location: { lat: 1.2830, lng: 103.8513 } },
      { name: 'Marina South Pier', location: { lat: 1.2711, lng: 103.8632 } }
    ],
    'East-West Line': [
      { name: 'Tuas Link', location: { lat: 1.3404, lng: 103.6368 } },
      { name: 'Boon Lay', location: { lat: 1.3385, lng: 103.7059 } },
      { name: 'Clementi', location: { lat: 1.3149, lng: 103.7652 } },
      { name: 'Buona Vista', location: { lat: 1.3072, lng: 103.7900 } },
      { name: 'Queenstown', location: { lat: 1.2942, lng: 103.8060 } },
      { name: 'Outram Park', location: { lat: 1.2803, lng: 103.8395 } },
      { name: 'Bugis', location: { lat: 1.3008, lng: 103.8559 } },
      { name: 'Paya Lebar', location: { lat: 1.3181, lng: 103.8927 } },
      { name: 'Tampines', location: { lat: 1.3546, lng: 103.9453 } },
      { name: 'Pasir Ris', location: { lat: 1.3731, lng: 103.9493 } }
    ],
    'Circle Line': [
      { name: 'Dhoby Ghaut', location: { lat: 1.2993, lng: 103.8455 } },
      { name: 'Bras Basah', location: { lat: 1.2967, lng: 103.8507 } },
      { name: 'Esplanade', location: { lat: 1.2936, lng: 103.8554 } },
      { name: 'Promenade', location: { lat: 1.2935, lng: 103.8605 } },
      { name: 'Marina Bay', location: { lat: 1.2764, lng: 103.8549 } },
      { name: 'Botanic Gardens', location: { lat: 1.3222, lng: 103.8156 } },
      { name: 'Holland Village', location: { lat: 1.3112, lng: 103.7961 } },
      { name: 'Kent Ridge', location: { lat: 1.2935, lng: 103.7845 } },
      { name: 'HarbourFront', location: { lat: 1.2653, lng: 103.8209 } }
    ]
  };

export default function LocationSettingsPage() {
  const router = useRouter();
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [mapCenter, setMapCenter] = useState({
    lat: 1.3521,  // 新加坡默认中心位置
    lng: 103.8198
  });

  // 处理线路选择变化
  const handleLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLine = e.target.value;
    setSelectedLine(newLine);
    setSelectedStation('');
  };

  // 处理站点选择变化
  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stationName = e.target.value;
    setSelectedStation(stationName);
    
    // 更新地图中心位置
    const station = mrtLines[selectedLine as keyof typeof mrtLines].find(s => s.name === stationName);
    if (station) {
      setMapCenter(station.location);
    }
  };

  const handleContinue = async () => {
    const station = mrtLines[selectedLine as keyof typeof mrtLines].find(s => s.name === selectedStation);
    if (station) {
      // Save location to localStorage
      const userLocation = {
        line: selectedLine,
        station: station.name,
        coordinates: station.location
      };
      localStorage.setItem('userLocation', JSON.stringify(userLocation));

      try {
        const requestBody = {
          latitude: station.location.lat,
          longitude: station.location.lng,
          radius: 1000, // 1km radius
          type: 'restaurant'
        };
        
        console.log('Sending POST request with data:', requestBody);
        
        const response = await fetch('/api/places/nearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log('Received response:', data);
        // Extract relevant information from each restaurant
        // Only process if we have results
        if (data.results && Array.isArray(data.results)) {
          const restaurantsData = data.results.map((place: any) => ({
            id: place.place_id,
            name: place.name,
            rating: place.rating || 0,
            userRatingsTotal: place.user_ratings_total || 0,
            vicinity: place.vicinity || '',
            priceLevel: place.price_level,
            photos: place.photos ? place.photos.map((photo: any) => ({
              photoReference: photo.photo_reference,
              height: photo.height,
              width: photo.width,
            })) : [],
            location: place.geometry?.location || { lat: 0, lng: 0 }
          }));

          console.log('Processed restaurant data:', restaurantsData);

          localStorage.setItem('nearbyRestaurants', JSON.stringify({
            restaurants: restaurantsData,
            nextPageToken: data.next_page_token
          }));
        } else {
          console.error('No results found in response');
        }

        router.push('/home');
      } catch (error) {
        console.error('Error processing response:', error);
      }
    }
  };


  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-white">
      <main className="flex flex-col items-center max-w-md w-full space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Set your location
        </h1>

        {/* MRT线路选择 */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select MRT Line
          </label>
          <select
            value={selectedLine}
            onChange={handleLineChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Select a line</option>
            {Object.keys(mrtLines).map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
        </div>

        {/* 地铁站选择 */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Station
          </label>
          <select
            value={selectedStation}
            onChange={handleStationChange}
            disabled={!selectedLine}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
          >
            <option value="">Select a station</option>
            {selectedLine && mrtLines[selectedLine as keyof typeof mrtLines].map((station: { name: string }) => (
              <option key={station.name} value={station.name}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        {/* Google Map */}
        {selectedStation && (
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={15}
            >
              <Marker position={mapCenter} />
            </GoogleMap>
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!selectedStation}
          className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-gray-900 font-semibold py-4 px-6 rounded-full transition-colors"
        >
          Continue
        </button>
      </main>
    </div>
  );
}
