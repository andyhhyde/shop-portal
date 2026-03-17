"use client";

import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { format } from "date-fns";

type ParkingSpot = {
  occupied: boolean;
  lastUpdated: string | null;
  batteryV?: number | null;
};

// LiFePO4 range: 2.8V (empty) → 3.6V (full)
function batteryPercent(v: number): number {
  return Math.round(Math.min(100, Math.max(0, ((v - 2.8) / (3.6 - 2.8)) * 100)));
}

function batteryColor(pct: number): string {
  if (pct > 60) return "text-green-400";
  if (pct > 25) return "text-yellow-400";
  return "text-red-400";
}

export default function ParkingWidget({ initial }: { initial: ParkingSpot }) {
  const [spot, setSpot] = useState<ParkingSpot>(initial);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/parking");
        if (res.ok) {
          const data = await res.json();
          setSpot(data);
        }
      } catch {
        // silently ignore network errors
      }
    };

    const interval = setInterval(poll, 10000); // poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${
      spot.occupied ? "bg-red-950 border-red-800" : "bg-green-950 border-green-800"
    }`}>
      <Car size={22} className={spot.occupied ? "text-red-400" : "text-green-400"} />
      <div className="flex-1">
        <p className={`font-semibold text-sm ${spot.occupied ? "text-red-300" : "text-green-300"}`}>
          Rear Stall — {spot.occupied ? "OCCUPIED" : "FREE"}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {spot.lastUpdated
            ? `Updated ${format(new Date(spot.lastUpdated), "h:mm a")}`
            : "No data yet"}
        </p>
        {spot.batteryV != null && (() => {
          const pct = batteryPercent(spot.batteryV);
          return (
            <p className={`text-xs mt-0.5 ${batteryColor(pct)}`}>
              Battery {pct}% ({spot.batteryV.toFixed(2)}V)
            </p>
          );
        })()}
      </div>
      <div className={`w-3 h-3 rounded-full animate-pulse ${
        spot.occupied ? "bg-red-500" : "bg-green-500"
      }`} />
    </div>
  );
}
