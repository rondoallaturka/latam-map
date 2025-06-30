import MapChart from '../components/MapChart';
import DataCard from '../components/DataCard';
import { useState } from 'react';

export default function MapPage() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const handleSelect = (country: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(country)) return prev;
      if (prev.length >= 2) return [prev[1], country];
      return [...prev, country];
    });
  };

  return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Map Page</h1>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <MapChart onSelect={handleSelect} />
          <DataCard countries={selectedCountries} />
        </div>
        <div className="mt-4 text-sm">Selected: {selectedCountries.join(', ') || 'none'}</div>
      </div>
    );
}
