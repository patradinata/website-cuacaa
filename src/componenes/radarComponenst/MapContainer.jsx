import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Fix for default markers in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapContainer = ({ activeLayer, layers, mapInstanceRef, onMapClick }) => {
  const mapRef = useRef(null);
  const weatherLayerRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    // Create map instance
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [-2.548926, 118.014863], // Indonesia coordinates
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      tap: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Add base tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 2,
    }).addTo(mapInstanceRef.current);

    // Add zoom control with custom position
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(mapInstanceRef.current);

    // Add scale control
    L.control
      .scale({
        position: "bottomright",
        imperial: false,
      })
      .addTo(mapInstanceRef.current);

    setIsMapReady(true);

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Handle map clicks
  useEffect(() => {
    if (!mapInstanceRef.current || !onMapClick) return;

    const handleMapClick = (e) => {
      // Remove previous marker if exists
      if (clickMarkerRef.current) {
        mapInstanceRef.current.removeLayer(clickMarkerRef.current);
      }

      // Add new marker at clicked location
      clickMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: "custom-click-marker",
          html: `
            <div style="
              background: #3b82f6;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            "></div>
            <style>
              @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
              }
            </style>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(mapInstanceRef.current);

      // Call the click handler with additional info
      const clickEvent = {
        ...e,
        containerPoint: mapInstanceRef.current.latLngToContainerPoint(e.latlng),
      };

      onMapClick(clickEvent);
    };

    // Add click event listener
    mapInstanceRef.current.on("click", handleMapClick);

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off("click", handleMapClick);
      }
    };
  }, [onMapClick, isMapReady]);

  // Handle weather layer changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Remove previous weather layer
    if (weatherLayerRef.current) {
      mapInstanceRef.current.removeLayer(weatherLayerRef.current);
    }

    // Add new weather layer
    if (layers[activeLayer]) {
      weatherLayerRef.current = L.tileLayer(layers[activeLayer].url, {
        attribution: '© <a href="https://openweathermap.org">OpenWeatherMap</a>',
        opacity: getLayerOpacity(activeLayer),
        zIndex: 10,
        maxZoom: 19,
        minZoom: 2,
      });

      weatherLayerRef.current.addTo(mapInstanceRef.current);
    }

    // Cleanup function
    return () => {
      if (weatherLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(weatherLayerRef.current);
        weatherLayerRef.current = null;
      }
    };
  }, [activeLayer, layers, isMapReady]);

  // Function to get layer opacity based on type
  const getLayerOpacity = (layerType) => {
    const opacityMap = {
      temp: 0.7,
      radar: 0.8,
      clouds: 0.6,
      wind: 0.7,
      pressure: 0.6,
    };
    return opacityMap[layerType] || 0.7;
  };

  // Add method to clear click marker (useful for external calls)
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.clearClickMarker = () => {
        if (clickMarkerRef.current) {
          mapInstanceRef.current.removeLayer(clickMarkerRef.current);
          clickMarkerRef.current = null;
        }
      };
    }
  }, [isMapReady]);

  return (
    <div className="relative">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="z-10 w-full md:h-[600px] h-[400px] rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-lg bg-white/10"
        style={{
          cursor: onMapClick ? "crosshair" : "grab",
        }}
      />

      {/* Loading Overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-white text-sm">Memuat peta...</p>
          </div>
        </div>
      )}

      {/* map overlay */}

      {/* Active Layer Info */}
      {isMapReady && layers[activeLayer] && (
        <div className="absolute bottom-7 left-0 bg-black/70 text-white px-3 py-2 rounded-lg text-sm z-20 pointer-events-none">
          <p className="font-semibold text-amber-500">{layers[activeLayer].name}</p>
          <p className="text-xs opacity-80">{layers[activeLayer].description}</p>
        </div>
      )}

     
      {/* <div className="">
        <div className="absolute mx-auto top-4 right-1/3 bg-black/50   text-amber-500 px-4 py-2 rounded-lg text-xs z-20 pointer-events-none">
          <p className=" hidden lg:block bg-black">🔍 Scroll: Zoom | 🖱️ Drag: Pan</p>
        </div>
      </div> */}
    </div>
  );
};

export default MapContainer;
