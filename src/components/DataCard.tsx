import { useEffect, useState } from 'react';
import { csv } from 'd3-fetch';
import { scaleLinear } from 'd3-scale';

export interface DataCardProps {
  countries: string[];
}

interface Row { country: string; value: number; }

export default function DataCard({ countries }: DataCardProps) {
  const [data, setData] = useState<Record<string, number>>({});

  useEffect(() => {
    csv('/latam_population_2023.csv', d => ({ country: d.country as string, value: +d.value! }))
      .then(rows => {
        const lookup: Record<string, number> = {};
        rows.forEach(r => (lookup[r.country] = r.value));
        setData(lookup);
      });
  }, []);

  const values = countries.map(c => data[c]).filter(v => v != null);
  const maxVal = values.length ? Math.max(...values) : 0;
  const x = scaleLinear().domain([0, maxVal || 1]).range([0, 150]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full md:w-80">
      <h2 className="text-lg font-semibold mb-4">Population</h2>
      {countries.length === 0 ? (
        <p className="text-sm text-gray-600">Select a country</p>
      ) : (
        <svg width={200} height={countries.length * 28} className="overflow-visible">
          {countries.map((name, i) => {
            const val = data[name];
            if (val == null) return null;
            const barW = x(val);
            return (
              <g key={name} transform={`translate(0, ${i * 24})`}>
                <text x={0} y={14} className="text-xs">{name}</text>
                <rect x={70} y={4} width={barW} height={16} fill="#3B82F6" rx={2} />
                <text x={70 + barW + 4} y={16} className="text-xs">{val.toLocaleString()}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
