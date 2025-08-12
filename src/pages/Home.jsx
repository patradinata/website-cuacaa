// Import Component
import React, { useState, useEffect } from "react";
import Daftarkota from "../componenes/homeComponens/Daftarkota.jsx";
import MainCity from "../componenes/homeComponens/Maincity.jsx";
import SearchForm from "../componenes/homeComponens/SearchForm.jsx";
import cerah from "../assets/img/cerah.png";
import { getWeatherBackground } from "../tools/utils.jsx";

// OpenWeatherMap API configuration
const API_KEY = "965258ee2844412dc02786c604b4f238"; 
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// Daftar kota alternatif untuk Pesisir Barat dan sekitarnya
const ALTERNATIVE_CITIES = {
  "pesisir barat": ["Krui", "Bengkunat", "Liwa", "Bandar Lampung"],
  pesisir: ["Krui", "Bengkunat", "Bandar Lampung"],
  barat: ["Krui", "Liwa", "Bandar Lampung"],
};

// Fungsi untuk mencari nama kota alternatif
const findAlternativeCity = async (originalCity) => {
  const cityLower = originalCity.toLowerCase();

  // Cek apakah ada alternatif yang sudah didefinisikan
  for (const [key, alternatives] of Object.entries(ALTERNATIVE_CITIES)) {
    if (cityLower.includes(key)) {
      // Coba setiap alternatif sampai ada yang berhasil
      for (const altCity of alternatives) {
        const result = await fetchWeatherOpenWeather(altCity, false); // false = no retry
        if (result) {
          console.log(`✅ Found alternative for "${originalCity}": "${altCity}"`);
          return result;
        }
      }
    }
  }
  return null;
};

// Fungsi untuk fetch weather data menggunakan OpenWeatherMap
const fetchWeatherOpenWeather = async (cityName, allowAlternative = true) => {
  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&lang=id&units=metric`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ City "${cityName}" not found in OpenWeatherMap`);

        // Coba cari alternatif hanya jika diizinkan
        if (allowAlternative) {
          const alternative = await findAlternativeCity(cityName);
          if (alternative) {
            return alternative;
          }
        }

        throw new Error(`Kota "${cityName}" tidak ditemukan`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.cod !== 200) {
      console.error(`Error for city ${cityName}:`, data.message);
      return null;
    }

    // Transform data to match your existing structure
    return {
      name: data.name,
      country: data.sys.country,
      temp: Math.round(data.main.temp),
      condition: data.weather[0].description,
      conditionCode: data.weather[0].id,
      icon: data.weather[0].icon,
      isDay: data.weather[0].icon.includes("d") ? 1 : 0,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      feelsLike: Math.round(data.main.feels_like),
      visibility: data.visibility ? Math.round(data.visibility / 1000) : null, // Convert to km
      clouds: data.clouds.all,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      timezone: data.timezone,
      localtime: new Date((data.dt + data.timezone) * 1000).toLocaleString("id-ID"),
    };
  } catch (error) {
    console.error(`Error fetching weather data for ${cityName}:`, error.message);
    return null;
  }
};

// Daftar kota dengan nama yang sudah diverifikasi ada di OpenWeatherMap
const getVerifiedCities = () => {
  return [
    "Jakarta",
    "Surabaya",
    "Bandar Lampung", 
    "Makassar",
    "Yogyakarta",
    "Padang",
  ];
};

// Daftar kota default untuk main city (prioritas)
const getDefaultMainCities = () => {
  return [
    "Bandar Lampung", // Ibukota Lampung
    "Krui", // Kota di Pesisir Barat
    "Liwa", // Alternatif di Lampung Barat
    "Jakarta", // Fallback terakhir
  ];
};

// function Home
function Home() {
  const [mainCity, setMainCity] = useState(null);
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [background, setBackground] = useState(cerah); // Default background
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Memuat data cuaca...");

  // Use Effect
  useEffect(() => {
    const initialCities = getVerifiedCities();
    const defaultMainCities = getDefaultMainCities();

    // menangkap data yang di inputkan user di search Form
    const fetchAllWeather = async () => {
      try {
        setIsLoading(true);
        setLoadingStatus("Mencari kota utama...");

        let mainCityData = null;
        for (const cityName of defaultMainCities) {
          setLoadingStatus(`Mencoba ${cityName}...`);
          mainCityData = await fetchWeatherOpenWeather(cityName, false);
          if (mainCityData) {
            console.log(`✅ Main city set to: ${cityName}`);
            break;
          }
        }

        if (mainCityData) {
          setMainCity(mainCityData);
          setBackground(getWeatherBackground(mainCityData.conditionCode));
        } else {
          console.error("❌ No main city could be loaded");
        }

        setLoadingStatus("Memuat daftar kota...");

        // Fetch all cities data with error handling
        const citiesPromises = initialCities.map(async (cityName, index) => {
          setLoadingStatus(`Memuat ${cityName}... (${index + 1}/${initialCities.length})`);
          const cityData = await fetchWeatherOpenWeather(cityName, false);
          return cityData;
        });

        const citiesData = await Promise.all(citiesPromises);
        const validCities = citiesData.filter((city) => city !== null);

        console.log(`✅ Loaded ${validCities.length}/${initialCities.length} cities successfully`);
        setCities(validCities);
      } catch (error) {
        console.error("❌ Error fetching weather data:", error);
        setLoadingStatus("Error memuat data cuaca");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllWeather();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        setSearchLoading(true);
        const data = await fetchWeatherOpenWeather(searchQuery.trim(), true); // Allow alternatives
        if (data) {
          setMainCity(data);
          setBackground(getWeatherBackground(data.conditionCode));
          setSearchQuery(""); // Clear search query after successful search

          // Show success message if alternative was used
          if (data.name.toLowerCase() !== searchQuery.trim().toLowerCase()) {
            console.log(`ℹ️ Showing weather for "${data.name}" instead of "${searchQuery}"`);
          }
        } else {
          alert(`❌ Kota "${searchQuery}" tidak ditemukan di database OpenWeatherMap.\n\n💡 Coba gunakan nama kota yang lebih umum atau nama dalam bahasa Inggris.`);
        }
      } catch (error) {
        console.error("Terjadi error saat mencari kota:", error);
        alert(`❌ Terjadi kesalahan: ${error.message}\n\n💡 Silakan coba lagi dengan nama kota yang berbeda.`);
      } finally {
        setSearchLoading(false);
      }
    }
  };

  // Add refresh function for cities
  const refreshCityData = async (cityName) => {
    const updatedData = await fetchWeatherOpenWeather(cityName, false);
    if (updatedData) {
      setCities((prevCities) => prevCities.map((city) => (city.name === cityName ? updatedData : city)));
    }
  };

  const displayedCities = isMobile ? cities.slice(0, 4) : cities;

  return (
    <section className="h-screen overflow-hidden pt-16">
      <img src={background} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Enhanced Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="text-center bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl mb-2">🌦️ Weather App</p>
            <p className="text-white text-sm opacity-80">{loadingStatus}</p>
            <div className="mt-4 text-xs text-white opacity-60">Powered by OpenWeatherMap</div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center pt-10">
        <SearchForm handleSearch={handleSearch} searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchLoading={searchLoading} />
      </div>

      <div className="relative z-10 flex items-center lg:gap-20 h-full px-12 flex-col lg:flex-row mt-0 md:mt-12 lg:mt-0">
        <MainCity city={mainCity} />

        <div className="grid md:grid-cols-2 grid-cols-1 md:grid-rows-4 grid-rows-2 gap-4 bg-transparent bg-opacity-80 backdrop-blur-5xl p-6 rounded-lg w-full mb-20 lg:mt-0 mx-0 mt-6 md:mt-36">
          {displayedCities.map((city, index) => (
            <Daftarkota key={`${city.name}-${city.country}`} city={city} onRefresh={() => refreshCityData(city.name)} />
          ))}

          {/* Show loading placeholder if cities are still loading */}
          {isLoading &&
            Array.from({ length: isMobile ? 4 : 6 }, (_, i) => (
              <div key={`loading-${i}`} className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-lg animate-pulse">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="h-4 bg-white bg-opacity-30 rounded mb-2 w-20"></div>
                    <div className="h-3 bg-white bg-opacity-30 rounded w-16"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-6 bg-white bg-opacity-30 rounded mb-1 w-12"></div>
                    <div className="h-4 bg-white bg-opacity-30 rounded w-8"></div>
                  </div>
                </div>
              </div>
            ))}

          {/* Tampilkan pesan jika kota tidak ada yang berjasil dimuat */}
          {!isLoading && displayedCities.length === 0 && (
            <div className="col-span-full text-center text-white bg-red-500 bg-opacity-20 p-6 rounded-lg">
              <p className="text-lg mb-2">⚠️ Tidak ada data kota yang berhasil dimuat</p>
              <p className="text-sm opacity-80">Periksa koneksi internet atau API key</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Home;
