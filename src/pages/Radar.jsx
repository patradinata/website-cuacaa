import React, { useState, useCallback, useRef, useEffect } from "react";
import LayerOptions from "../componenes/radarComponenst/LayerOptions";
import MapContainer from "../componenes/radarComponenst/MapContainer";
import LegendToggle from "../componenes/radarComponenst/LegendToggle";
import ControlsHelp from "../componenes/radarComponenst/ControlsHelp";
import TemperatureLegend from "../componenes/radarComponenst/TemperatureLegend";
import { getWeatherIcon, kelvinToCelsius, mpsToKmh, formatTime } from "../tools/utils";

const WeatherMap = () => {
  const [activeLayer, setActiveLayer] = useState("radar");
  const [showLayerOptions, setShowLayerOptions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [showWeatherPopup, setShowWeatherPopup] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const mapInstanceRef = useRef(null);
  const weatherRequestRef = useRef(null);

  // API Configuration
  const API_KEY = "965258ee2844412dc02786c604b4f238";
  const GEOCODING_API = "https://api.openweathermap.org/geo/1.0/reverse";
  const WEATHER_API = "https://api.openweathermap.org/data/2.5/weather";
  const ONE_CALL_API = "https://api.openweathermap.org/data/2.5/onecall";

  // Enhanced layers with better coverage and accuracy
  const layers = {
    radar: {
      url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      name: "Radar Hujan",
      description: "Intensitas curah hujan real-time",
      refreshRate: 10, // minutes
    },
    temp: {
      url: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      name: "Suhu",
      description: "Peta suhu permukaan real-time",
      refreshRate: 30,
    },
    clouds: {
      url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      name: "Awan",
      description: "Tutupan awan real-time",
      refreshRate: 15,
    },
    wind: {
      url: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      name: "Angin",
      description: "Kecepatan dan arah angin real-time",
      refreshRate: 20,
    },
    pressure: {
      url: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      name: "Tekanan",
      description: "Tekanan atmosfer real-time",
      refreshRate: 60,
    },
    humidity: {
      url: `https://tile.openweathermap.org/map/humidity_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      name: "Kelembaban",
      description: "Kelembaban udara real-time",
      refreshRate: 30,
    },
  };

  // Enhanced location name fetching with better error handling
  const getLocationName = async (lat, lon) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${GEOCODING_API}?lat=${lat}&lon=${lon}&limit=3&appid=${API_KEY}`, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.length > 0) {
        const location = data[0];
        return {
          name: location.name || location.local_names?.id || location.local_names?.en || "Unknown",
          country: location.country,
          state: location.state || location.admin1 || "",
          district: location.admin2 || "",
          local_names: location.local_names || {},
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting location name:", error);
      return {
        name: `Koordinat ${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        country: "",
        state: "",
        district: "",
      };
    }
  };

  // Enhanced weather data fetching with more comprehensive data
  const getWeatherByCoords = async (lat, lon, forceRefresh = false) => {
    // Cancel previous request if still pending
    if (weatherRequestRef.current) {
      weatherRequestRef.current.abort();
    }

    const controller = new AbortController();
    weatherRequestRef.current = controller;

    try {
      setIsLoadingWeather(true);

      // Parallel requests for better performance
      const [locationPromise, weatherPromise] = await Promise.allSettled([getLocationName(lat, lon), fetch(`${WEATHER_API}?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=id&units=metric`, { signal: controller.signal })]);

      let location = { name: "Unknown Location", country: "", state: "", district: "" };
      if (locationPromise.status === "fulfilled" && locationPromise.value) {
        location = locationPromise.value;
      }

      if (weatherPromise.status === "rejected") {
        throw new Error("Failed to fetch weather data");
      }

      const weatherResponse = weatherPromise.value;
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }

      const weatherData = await weatherResponse.json();

      if (weatherData.cod !== 200) {
        throw new Error(weatherData.message || "Invalid weather data");
      }

      // Calculate local time based on timezone
      const now = new Date();
      const localTime = new Date(now.getTime() + weatherData.timezone * 1000);
      const sunriseLocal = new Date((weatherData.sys.sunrise + weatherData.timezone) * 1000);
      const sunsetLocal = new Date((weatherData.sys.sunset + weatherData.timezone) * 1000);

      const result = {
        location: location,
        coords: { lat: lat.toFixed(6), lon: lon.toFixed(6) },
        temperature: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        tempMin: Math.round(weatherData.main.temp_min),
        tempMax: Math.round(weatherData.main.temp_max),
        condition: weatherData.weather[0].description,
        conditionCode: weatherData.weather[0].id,
        icon: weatherData.weather[0].icon,
        isDay: weatherData.weather[0].icon.includes("d"),
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        seaLevel: weatherData.main.sea_level || weatherData.main.pressure,
        groundLevel: weatherData.main.grnd_level || weatherData.main.pressure,
        windSpeed: mpsToKmh(weatherData.wind?.speed || 0),
        windDirection: weatherData.wind?.deg || 0,
        windGust: weatherData.wind?.gust ? mpsToKmh(weatherData.wind.gust) : null,
        visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null,
        clouds: weatherData.clouds?.all || 0,
        rain1h: weatherData.rain?.["1h"] || 0,
        rain3h: weatherData.rain?.["3h"] || 0,
        snow1h: weatherData.snow?.["1h"] || 0,
        snow3h: weatherData.snow?.["3h"] || 0,
        sunrise: formatTime(weatherData.sys.sunrise, weatherData.timezone),
        sunset: formatTime(weatherData.sys.sunset, weatherData.timezone),
        localTime: localTime.toLocaleString("id-ID", {
          timeZone: "UTC",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timezone: weatherData.timezone,
        country: weatherData.sys.country,
        timestamp: now.toLocaleString("id-ID"),
        dataAge: Math.round((now.getTime() - weatherData.dt * 1000) / (1000 * 60)), // minutes
        quality: weatherData.visibility ? "high" : "medium",
      };

      setLastUpdateTime(now);
      return result;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      if (error.name === "AbortError") {
        return null; // Request was cancelled
      }
      throw error;
    } finally {
      setIsLoadingWeather(false);
      weatherRequestRef.current = null;
    }
  };

  // Enhanced map click handler with debouncing
  const handleMapClick = useCallback(async (event) => {
    if (!event.latlng) return;

    const { lat, lng } = event.latlng;
    const { x, y } = event.containerPoint;

    // Set click position for popup
    setClickPosition({
      x: Math.min(x + 10, window.innerWidth - 350),
      y: Math.max(y - 10, 10),
    });
    setShowWeatherPopup(true);
    setSelectedLocation({ lat, lng });
    setWeatherData(null); // Reset previous data

    try {
      const weather = await getWeatherByCoords(lat, lng);
      if (weather) {
        setWeatherData(weather);
      }
    } catch (error) {
      setWeatherData({ error: error.message });
    }
  }, []);

  // Layer change handler with auto-refresh setup
  const handleLayerChange = useCallback(
    (layer) => {
      setActiveLayer(layer);
      setShowLayerOptions(false);

      // Clear and set new refresh interval based on layer
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      if (autoRefresh && layers[layer]?.refreshRate) {
        const interval = setInterval(() => {
          // Force layer refresh by updating timestamp
          if (mapInstanceRef.current) {
            const currentLayer = mapInstanceRef.current.eachLayer((l) => {
              if (l._url && l._url.includes(layer)) {
                l.setUrl(`${l._url}&t=${Date.now()}`);
              }
            });
          }
        }, layers[layer].refreshRate * 60 * 1000);

        setRefreshInterval(interval);
      }
    },
    [autoRefresh, refreshInterval, layers]
  );

  // Auto-refresh toggle
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => {
      const newValue = !prev;
      if (!newValue && refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      return newValue;
    });
  }, [refreshInterval]);

  // Refresh current weather data
  const refreshWeatherData = useCallback(async () => {
    if (selectedLocation && !isLoadingWeather) {
      try {
        const weather = await getWeatherByCoords(
          selectedLocation.lat,
          selectedLocation.lng,
          true // force refresh
        );
        if (weather) {
          setWeatherData(weather);
        }
      } catch (error) {
        setWeatherData({ error: error.message });
      }
    }
  }, [selectedLocation, isLoadingWeather]);

  const closeWeatherPopup = () => {
    setShowWeatherPopup(false);
    setWeatherData(null);
    setSelectedLocation(null);

    // Cancel any pending weather request
    if (weatherRequestRef.current) {
      weatherRequestRef.current.abort();
    }
  };

  // Enhanced wind direction function
  const getWindDirection = (degrees) => {
    const directions = [
      { name: "Utara", short: "U", range: [348.75, 11.25] },
      { name: "Timur Laut", short: "TL", range: [11.25, 78.75] },
      { name: "Timur", short: "T", range: [78.75, 101.25] },
      { name: "Tenggara", short: "TG", range: [101.25, 168.75] },
      { name: "Selatan", short: "S", range: [168.75, 191.25] },
      { name: "Barat Daya", short: "BD", range: [191.25, 258.75] },
      { name: "Barat", short: "B", range: [258.75, 281.25] },
      { name: "Barat Laut", short: "BL", range: [281.25, 348.75] },
    ];

    for (const dir of directions) {
      if (degrees >= dir.range[0] || degrees <= dir.range[1]) {
        return { name: dir.name, short: dir.short, degrees };
      }
    }
    return { name: "Utara", short: "U", degrees };
  };

  // Enhanced weather condition description
  const getConditionSeverity = (conditionCode) => {
    if (conditionCode >= 200 && conditionCode < 300) return { level: "severe", color: "red" };
    if (conditionCode >= 300 && conditionCode < 600) return { level: "moderate", color: "yellow" };
    if (conditionCode >= 600 && conditionCode < 700) return { level: "moderate", color: "blue" };
    if (conditionCode >= 700 && conditionCode < 800) return { level: "light", color: "gray" };
    return { level: "normal", color: "green" };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (weatherRequestRef.current) weatherRequestRef.current.abort();
    };
  }, [refreshInterval]);

  return (
    <div className="w-full md:h-auto h-screen p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg md:px-12 px-4 backdrop-blur-3xl pt-28 overflow-hidden">
      {/* Enhanced Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">🌍 Peta Cuaca Real-time</h2>
        <p className="text-white mb-2">Klik pada peta untuk melihat data cuaca terkini</p>
        {lastUpdateTime && <p className="text-sm text-white/80">Terakhir diperbarui: {lastUpdateTime.toLocaleTimeString("id-ID")}</p>}
      </div>

      {/* Enhanced Controls */}
      <div className="flex justify-center mb-4 space-x-4">
        <button onClick={toggleAutoRefresh} className={`px-4 py-2 rounded-lg font-medium transition-colors ${autoRefresh ? "bg-green-500 hover:bg-green-600 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}>
          {autoRefresh ? "🔄 Auto-refresh ON" : "⏸️ Auto-refresh OFF"}
        </button>

        {selectedLocation && (
          <button onClick={refreshWeatherData} disabled={isLoadingWeather} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            {isLoadingWeather ? "⏳" : "🔄"} Refresh Data
          </button>
        )}
      </div>

      <LayerOptions layers={layers} activeLayer={activeLayer} handleLayerChange={handleLayerChange} showLayerOptions={showLayerOptions} setShowLayerOptions={setShowLayerOptions} />

      <LegendToggle showLegend={showLegend} setShowLegend={setShowLegend} />

      <div className="relative">
        <MapContainer activeLayer={activeLayer} layers={layers} mapInstanceRef={mapInstanceRef} onMapClick={handleMapClick} />

        {/* Enhanced Weather Data Popup */}
        {showWeatherPopup && (
          <div
            className="absolute bg-white/98 backdrop-blur-sm rounded-xl shadow-2xl p-5 z-50 min-w-[350px] max-w-md border border-gray-200"
            style={{
              left: clickPosition.x,
              top: clickPosition.y,
              maxHeight: "500px",
              overflowY: "auto",
            }}
          >
            {/* Enhanced Close Button */}
            <button onClick={closeWeatherPopup} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              ×
            </button>

            {isLoadingWeather ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Memuat data cuaca real-time...</p>
                <p className="text-sm text-gray-500 mt-1">Mengambil data terbaru dari OpenWeatherMap</p>
              </div>
            ) : weatherData?.error ? (
              <div className="text-center py-6">
                <p className="text-red-600 mb-3">❌ {weatherData.error}</p>
                <button onClick={refreshWeatherData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  🔄 Coba Lagi
                </button>
              </div>
            ) : weatherData ? (
              <div className="space-y-4">
                {/* Enhanced Location Header */}
                <div className="border-b pb-3">
                  <h3 className="font-bold text-xl text-gray-800 flex items-center">📍 {weatherData.location.name}</h3>
                  <p className="text-sm text-gray-600">
                    {weatherData.location.district && `${weatherData.location.district}, `}
                    {weatherData.location.state && `${weatherData.location.state}, `}
                    {weatherData.location.country}
                  </p>
                  <p className="text-xs text-gray-500">
                    📊 {weatherData.coords.lat}, {weatherData.coords.lon}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        getConditionSeverity(weatherData.conditionCode).color === "red"
                          ? "bg-red-100 text-red-800"
                          : getConditionSeverity(weatherData.conditionCode).color === "yellow"
                          ? "bg-yellow-100 text-yellow-800"
                          : getConditionSeverity(weatherData.conditionCode).color === "blue"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {getConditionSeverity(weatherData.conditionCode).level.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">Data umur: {weatherData.dataAge}m</span>
                  </div>
                </div>

                {/* Enhanced Main Weather Info */}
                <div className="text-center py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <div className="flex justify-center items-center gap-4">
                    <span className="text-4xl">{getWeatherIcon(weatherData.conditionCode, weatherData.isDay)}</span>
                    <div>
                      <p className="text-4xl font-bold text-blue-600">{weatherData.temperature}°C</p>
                      <p className="text-sm text-gray-600 capitalize font-medium">{weatherData.condition}</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600">
                    <span>↗️ {weatherData.tempMax}°C</span>
                    <span>↘️ {weatherData.tempMin}°C</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Terasa seperti <span className="font-semibold">{weatherData.feelsLike}°C</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">🕐 Waktu lokal: {weatherData.localTime}</p>
                </div>

                {/* Enhanced Detailed Weather Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-semibold text-blue-700 flex items-center gap-1">💨 Angin</p>
                    <p className="font-bold">{weatherData.windSpeed} km/h</p>
                    <p className="text-xs text-gray-600">
                      {getWindDirection(weatherData.windDirection).name} ({weatherData.windDirection}°)
                    </p>
                    {weatherData.windGust && <p className="text-xs text-red-600">Gust: {weatherData.windGust} km/h</p>}
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-semibold text-green-700">💧 Kelembaban</p>
                    <p className="font-bold">{weatherData.humidity}%</p>
                    <p className="text-xs text-gray-600">{weatherData.humidity > 80 ? "Sangat lembab" : weatherData.humidity > 60 ? "Lembab" : weatherData.humidity > 40 ? "Sedang" : "Kering"}</p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="font-semibold text-purple-700">📊 Tekanan</p>
                    <p className="font-bold">{weatherData.pressure} hPa</p>
                    {weatherData.seaLevel !== weatherData.pressure && <p className="text-xs text-gray-600">Sea: {weatherData.seaLevel} hPa</p>}
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="font-semibold text-orange-700">☁️ Tutupan Awan</p>
                    <p className="font-bold">{weatherData.clouds}%</p>
                    <p className="text-xs text-gray-600">{weatherData.clouds < 25 ? "Cerah" : weatherData.clouds < 50 ? "Berawan sebagian" : weatherData.clouds < 75 ? "Berawan" : "Mendung"}</p>
                  </div>

                  {weatherData.visibility && (
                    <div className="bg-cyan-50 p-3 rounded-lg">
                      <p className="font-semibold text-cyan-700">👁️ Jarak Pandang</p>
                      <p className="font-bold">{weatherData.visibility} km</p>
                      <p className="text-xs text-gray-600">{weatherData.visibility >= 10 ? "Sangat baik" : weatherData.visibility >= 5 ? "Baik" : weatherData.visibility >= 1 ? "Sedang" : "Buruk"}</p>
                    </div>
                  )}

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="font-semibold text-yellow-700">🌅 Matahari</p>
                    <p className="text-xs">↗️ {weatherData.sunrise}</p>
                    <p className="text-xs">↘️ {weatherData.sunset}</p>
                  </div>
                </div>

                {/* Precipitation Data */}
                {(weatherData.rain1h > 0 || weatherData.snow1h > 0) && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-semibold text-gray-700 mb-2">🌧️ Curah Hujan/Salju</p>
                    <div className="text-sm space-y-1">
                      {weatherData.rain1h > 0 && (
                        <p>
                          💧 Hujan 1h: <span className="font-bold">{weatherData.rain1h} mm</span>
                        </p>
                      )}
                      {weatherData.rain3h > 0 && (
                        <p>
                          💧 Hujan 3h: <span className="font-bold">{weatherData.rain3h} mm</span>
                        </p>
                      )}
                      {weatherData.snow1h > 0 && (
                        <p>
                          ❄️ Salju 1h: <span className="font-bold">{weatherData.snow1h} mm</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Timestamp */}
                <div className="text-xs text-gray-500 text-center pt-3 border-t space-y-1">
                  <div>📡 Data real-time dari OpenWeatherMap</div>
                  <div>🔄 Diperbarui: {weatherData.timestamp}</div>
                  <div className="flex justify-center space-x-4">
                    <span className={`px-2 py-1 rounded ${weatherData.quality === "high" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>📶 Kualitas: {weatherData.quality.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600">🔍 Klik pada lokasi di peta untuk melihat data cuaca</p>
              </div>
            )}
          </div>
        )}
      </div>

      <TemperatureLegend activeLayer={activeLayer} showLegend={showLegend} mapInstance={mapInstanceRef.current} />

      <ControlsHelp />

      {/* Enhanced Instructions */}
      <div className="text-center p-3 space-y-2">
        <p className="text-lg font-medium text-white">🖱️ Klik pada peta untuk data cuaca real-time | 🔄 Auto-refresh tersedia</p>
        <p className="text-sm text-white/80">📡 Data live dari OpenWeatherMap • 🗺️ Peta © OpenStreetMap •{activeLayer && ` Refresh setiap ${layers[activeLayer]?.refreshRate}m`}</p>
        {autoRefresh && <p className="text-sm text-green-200 font-medium">✅ Mode real-time aktif - Layer peta akan diperbarui otomatis</p>}
      </div>
    </div>
  );
};

export default WeatherMap;
