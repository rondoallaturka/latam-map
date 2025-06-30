import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, GeoJSON, ZoomControl } from 'react-leaflet';
import * as L from 'leaflet';
import { csv } from 'd3-fetch';
import type { FeatureCollection } from 'geojson';
import * as htmlToImage from 'html-to-image';
import { saveAs } from 'file-saver';

export interface MapChartProps {
  /**
   * Called when the user selects a country on the map.
   */
  onSelect?: (country: string) => void;
}

export default function MapChart({ onSelect }: MapChartProps) {
  /* state & refs */
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [pop, setPop] = useState<Record<string, number>>({});
  const [activeQuartile, setActiveQuartile] = useState<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const labelRef = useRef<L.Marker | null>(null);

  /* number formatter */
  const compact = (n: number) =>
    Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n);

  /* load data once */
  useEffect(() => {
    fetch('/latam.geojson').then(r => r.json()).then(setGeo);
  }, []);
  useEffect(() => {
    csv('/latam_population_2023.csv', d => ({ country: d.country as string, value: +d.value! }))
      .then(rows => {
        const lookup: Record<string, number> = {};
        rows.forEach(r => (lookup[r.country] = r.value));
        setPop(lookup);
      });
  }, []);

  /* prepare an ordered list of country names */
  const countryList = useMemo(
    () =>
      Object.entries(pop)
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => name),
    [pop]
  );

  /* define your 4 colors */
  const colorBuckets = ['#DAD2F0', '#AE9AE8', '#654FA3', '#3D2A73'];

  const { bucketMap, ranges } = useMemo(() => {
  // entries = [ [name, value], ... ] sorted ascending
  const entries = Object.entries(pop).sort((a, b) => a[1] - b[1]);
  const n = entries.length;
  const base = Math.floor(n / 4);
  const extra = n % 4;

  const map: Record<string, number> = {};
    const rs: [number, number][] = [];
    let idx = 0;

    for (let bucket = 0; bucket < 4; bucket++) {
        // first `extra` buckets get an extra country
        const size = base + (bucket < extra ? 1 : 0);
        const slice = entries.slice(idx, idx + size).map(([, v]) => v);

        // record each country’s bucket
        for (let i = 0; i < slice.length; i++) {
        map[entries[idx + i][0]] = bucket;
        }

        // compute that bucket’s min/max
        if (slice.length) {
        rs.push([Math.min(...slice), Math.max(...slice)]);
        } else {
        rs.push([0, 0]);
        }

        idx += size;
    }

    return { bucketMap: map, ranges: rs };
    }, [pop]);

  /* tooltip, hover, click-label */
  function onEachCountry(feature: any, layer: L.Layer) {
    const name = feature.properties?.sovereignt as string;
    const val = pop[name];
    layer.bindTooltip(val != null ? `${name}: ${compact(val)}` : `${name}: n/a`, { sticky: true });
    layer.on({
      mouseover: () => layer.setStyle({ weight: 2, color: '#EEE7E0' }),
      mouseout:  () => layer.setStyle({ weight: 0.5, color: 'rgba(255,255,255,0.5)' })
    });
    layer.on('click', () => {
      if (onSelect) onSelect(name);
      if (!mapRef.current) return;
      const bounds = (layer as any).getBounds() as L.LatLngBounds;
      const pad: L.PointTuple = [40, 40];
      const targetZoom = mapRef.current.getBoundsZoom(bounds, false, pad);
      if (targetZoom > mapRef.current.getZoom()) {
        mapRef.current.fitBounds(bounds, { padding: pad, maxZoom: targetZoom });
      }
      if (labelRef.current) mapRef.current.removeLayer(labelRef.current);
      if (val != null) {
        labelRef.current = L.marker(bounds.getCenter(), {
          icon: L.divIcon({
            className: 'population-label',
            html: `<div style="
              font:12px/1.2 sans-serif;
              background:#fff8;
              padding:2px 4px;
              border-radius:4px;
              pointer-events:none;
            ">${compact(val)}</div>`
          })
        }).addTo(mapRef.current);
      }
    });
  }

  /* render */
  return (
    <div className="max-w-[660px] mx-auto bg-white shadow-xl rounded-2xl overflow-hidden p-5">
        {/* Inner ocean-blue card */}
        <div className="bg-[#CFEBF3]/60 rounded-lg p-4">
        {/* Map */}
        <div className="relative w-full aspect-square">
            {geo && (
            <MapContainer
                center={[-16, -72]}
                zoom={3}
                scrollWheelZoom={true}
                zoomControl={false}
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
                whenCreated={map => (mapRef.current = map)}
            >
                <ZoomControl position="topright" />
                <GeoJSON
                data={geo}
                style={f => {
                    const name = f.properties?.sovereignt as string;
                    const bucket = bucketMap[name] ?? 0;
                    const inActive = activeQuartile == null || bucket === activeQuartile;
                    return {
                    fillColor: inActive ? colorBuckets[bucket] : '#e5e5e5',
                    color: inActive ? 'rgba(255,255,255,0.5)' : 'rgba(200,200,200,0.3)',
                    weight: 0.5,
                    fillOpacity: inActive ? 0.8 : 0.15,
                    transition: 'all 0.2s ease'
                    };
                }}
                onEachFeature={onEachCountry}
                />
            </MapContainer>
            )}
        </div>

        {/* Legend (inner card) */}
        <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Population Quartiles</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
            {ranges.map(([from, to], i) => (
                <button
                key={i}
                className={`flex items-center space-x-2 p-2 rounded-md transition-opacity ${
                    activeQuartile === i ? 'opacity-100 bg-indigo-50' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => setActiveQuartile(activeQuartile === i ? null : i)}
                >
                <span
                    className="w-4 h-4 rounded-sm"
                    style={{ background: colorBuckets[i] }}
                />
                <span>{compact(from)} – {compact(to)}</span>
                </button>
            ))}
            </div>
        </div>
        </div> {/* close inner ocean-blue card */}

        {/* Optional extra UI */}
        <div className="mt-6">{/* Add more components here */}</div>
    </div>
    );
}