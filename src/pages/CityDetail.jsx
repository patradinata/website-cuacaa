import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getWeatherIcon, getWeatherBackground, kelvinToCelsius, mpsToKmh, formatDate, getDayName } from "../tools/utils";
import { gsap } from "gsap";
import cerah from "../assets/img/cerah.png";

// OpenWeatherMap API configuration
const API_KEY = "965258ee2844412dc02786c604b4f238";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

function CityDetail() {
  const { cityName } = useParams();
  const [cityDetail, setCityDetail] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [background, setBackground] = useState(cerah);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs for GSAP animations
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const timeRef = useRef(null);
  const weatherDisplayRef = useRef(null);
  const detailsRef = useRef(null);
  const forecastRef = useRef(null);
  const buttonRef = useRef(null);
  const animationContextRef = useRef(null);

  // Group forecast by day function
  const groupForecastByDay = useCallback((forecastList) => {
    if (!Array.isArray(forecastList)) return [];

    const grouped = {};
    const today = new Date().toDateString();

    forecastList.forEach((item) => {
      if (!item?.dt) return;

      try {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        const hour = date.getHours();

        // Skip today's data for forecast
        if (dateKey === today) return;

        // Prioritize data around noon (11-13), fallback to any available data
        if (hour >= 11 && hour <= 13) {
          if (!grouped[dateKey] || hour === 12) {
            grouped[dateKey] = {
              dt: item.dt,
              main: item.main,
              weather: item.weather,
              wind: item.wind,
            };
          }
        } else if (!grouped[dateKey]) {
          // Use as fallback if no noon data available
          grouped[dateKey] = {
            dt: item.dt,
            main: item.main,
            weather: item.weather,
            wind: item.wind,
          };
        }
      } catch (error) {
        console.warn("Error processing forecast item:", error);
      }
    });

    return Object.values(grouped).slice(0, 5);
  }, []);

  // API functions
  const fetchCurrentWeather = useCallback(async () => {
    if (!cityName) {
      throw new Error("Nama kota tidak tersedia");
    }

    try {
      const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&lang=id`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.cod !== 200) {
        throw new Error(data.message || "Kota tidak ditemukan");
      }

      // Validate required data fields
      if (!data.main || !data.weather?.[0] || !data.sys) {
        throw new Error("Data cuaca tidak lengkap");
      }

      // Get local time based on timezone
      const localTime = new Date(Date.now() + data.timezone * 1000);
      const currentTime = localTime.toLocaleString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });

      setCityDetail({
        name: data.name || "Unknown",
        country: data.sys.country || "",
        temp: kelvinToCelsius(data.main.temp),
        condition: data.weather[0].description || "",
        conditionCode: data.weather[0].id || 800,
        icon: data.weather[0].icon || "01d",
        isDay: data.weather[0].icon?.includes("d") ? 1 : 0,
        windSpeed: mpsToKmh(data.wind?.speed || 0),
        humidity: data.main.humidity || 0,
        pressure: data.main.pressure || 0,
        feelsLike: kelvinToCelsius(data.main.feels_like),
        visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
        sunrise: data.sys.sunrise || null,
        sunset: data.sys.sunset || null,
        timezone: data.timezone || 0,
        localtime: currentTime,
      });

      // Set background berdasarkan kode cuaca OpenWeatherMap
      const bg = getWeatherBackground(data.weather[0].id);
      setBackground(bg || cerah);
    } catch (error) {
      console.error("Error fetching current weather:", error);
      if (error.name === "AbortError") {
        throw new Error("Request timeout - silakan coba lagi");
      }
      throw error;
    }
  }, [cityName]);

  const fetchForecast = useCallback(async () => {
    if (!cityName) return;

    try {
      const response = await fetch(`${FORECAST_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&lang=id`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.cod !== "200") {
        throw new Error(data.message || "Gagal mengambil data forecast");
      }

      const dailyForecast = groupForecastByDay(data.list);
      setForecast(dailyForecast);
    } catch (error) {
      console.error("Error fetching forecast:", error);
      // Don't throw here as forecast is not critical
      setForecast([]);
    }
  }, [cityName, groupForecastByDay]);

  // Animation function
  const animateElements = useCallback(() => {
    if (!cityDetail || !cardRef.current) return;

    // Clean up previous animation context
    if (animationContextRef.current) {
      animationContextRef.current.revert();
    }

    animationContextRef.current = gsap.context(() => {
      const elements = [cardRef.current, titleRef.current, timeRef.current, weatherDisplayRef.current, detailsRef.current, forecastRef.current, buttonRef.current].filter(Boolean);

      gsap.set(elements, {
        opacity: 0,
        y: 20,
      });

      const tl = gsap.timeline({
        defaults: {
          duration: 0.7,
          ease: "power3.out",
        },
      });

      tl.to(cardRef.current, { opacity: 1, y: 0 })
        .to(titleRef.current, { opacity: 1, y: 0 }, "-=0.4")
        .to(timeRef.current, { opacity: 1, y: 0 }, "-=0.4")
        .to(
          weatherDisplayRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
          },
          "-=0.3"
        )
        .to(
          detailsRef.current,
          {
            opacity: 1,
            y: 0,
            stagger: 0.1,
          },
          "-=0.5"
        );

      if (forecastRef.current) {
        tl.to(forecastRef.current, { opacity: 1, y: 0 }, "-=0.3");
      }

      if (buttonRef.current) {
        tl.to(buttonRef.current, { opacity: 1, y: 0 }, "-=0.2");
      }
    });
  }, [cityDetail]);

  // Format time helper for sunrise/sunset
  const formatTime = useCallback((timestamp, timezone) => {
    if (!timestamp) return "";
    try {
      const date = new Date((timestamp + timezone) * 1000);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
    } catch (error) {
      return "";
    }
  }, []);

  // Effects
  useEffect(() => {
    if (!cityName) {
      setError("Nama kota tidak valid");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([fetchCurrentWeather(), fetchForecast()]);
      } catch (error) {
        setError(error.message || "Terjadi kesalahan saat mengambil data cuaca");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [cityName, fetchCurrentWeather, fetchForecast]);

  useEffect(() => {
    animateElements();
  }, [animateElements]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (animationContextRef.current) {
        animationContextRef.current.revert();
      }
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-400 to-purple-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white text-xl">Memuat data cuaca...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-red-400 to-pink-600 p-4">
        <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-xl text-red-600 mb-4 break-words">Error: {error}</p>
          <Link to="/" className="inline-block bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded-lg transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-300">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // No data state
  if (!cityDetail) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-xl mb-4">Tidak ada data cuaca tersedia</p>
          <Link to="/" className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg transition duration-300">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <img
        src={background}
        alt="Weather background"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        onError={(e) => {
          e.target.src = cerah;
        }}
      />
      <div ref={containerRef} className="container mx-auto p-4 lg:p-6 relative">
        <div ref={cardRef} className="opacity-0 bg-white bg-opacity-95 backdrop-blur-xl p-6 lg:p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 lg:mb-8">
            <h1 ref={titleRef} className="text-xl lg:text-3xl xl:text-4xl text-amber-600 font-bold mb-2 break-words">
              {cityDetail.name}
              {cityDetail.country && `, ${cityDetail.country}`}
            </h1>
            <p ref={timeRef} className="text-base lg:text-lg text-gray-600">
              Waktu Lokal: {cityDetail.localtime}
            </p>
          </div>

          {/* Current Weather */}
          <div ref={weatherDisplayRef} className="text-center mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 lg:gap-8 mb-6">
              <div className="text-4xl lg:text-6xl" role="img" aria-label="Weather icon">
                {getWeatherIcon(cityDetail.conditionCode, cityDetail.isDay)}
              </div>
              <div>
                <p className="text-3xl sm:text-4xl lg:text-6xl font-bold text-blue-600 mb-2">{cityDetail.temp}°C</p>
                <p className="text-lg lg:text-xl text-gray-700 capitalize">{cityDetail.condition}</p>
              </div>
            </div>
          </div>

          {/* Current Weather Details */}
          <div ref={detailsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <div className="bg-blue-50 p-3 lg:p-4 rounded-lg text-center">
              <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Wind">
                💨
              </p>
              <p className="text-xs lg:text-sm text-gray-600">Angin</p>
              <p className="font-semibold text-sm lg:text-base">{cityDetail.windSpeed} km/h</p>
            </div>
            <div className="bg-green-50 p-3 lg:p-4 rounded-lg text-center">
              <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Humidity">
                💧
              </p>
              <p className="text-xs lg:text-sm text-gray-600">Kelembaban</p>
              <p className="font-semibold text-sm lg:text-base">{cityDetail.humidity}%</p>
            </div>
            <div className="bg-purple-50 p-3 lg:p-4 rounded-lg text-center">
              <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Pressure">
                📊
              </p>
              <p className="text-xs lg:text-sm text-gray-600">Tekanan</p>
              <p className="font-semibold text-sm lg:text-base">{cityDetail.pressure} hPa</p>
            </div>
            <div className="bg-orange-50 p-3 lg:p-4 rounded-lg text-center">
              <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Feels like">
                🌡️
              </p>
              <p className="text-xs lg:text-sm text-gray-600">Terasa Seperti</p>
              <p className="font-semibold text-sm lg:text-base">{cityDetail.feelsLike}°C</p>
            </div>
          </div>

          {/* Additional Weather Info */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6 lg:mb-8">
            {cityDetail.visibility && (
              <div className="bg-cyan-50 p-3 lg:p-4 rounded-lg text-center">
                <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Visibility">
                  👁️
                </p>
                <p className="text-xs lg:text-sm text-gray-600">Jarak Pandang</p>
                <p className="font-semibold text-sm lg:text-base">{cityDetail.visibility} km</p>
              </div>
            )}
            {cityDetail.sunrise && (
              <div className="bg-yellow-50 p-3 lg:p-4 rounded-lg text-center">
                <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Sunrise">
                  🌅
                </p>
                <p className="text-xs lg:text-sm text-gray-600">Matahari Terbit</p>
                <p className="font-semibold text-sm lg:text-base">{formatTime(cityDetail.sunrise, cityDetail.timezone)}</p>
              </div>
            )}
            {cityDetail.sunset && (
              <div className="bg-red-50 p-3 lg:p-4 rounded-lg text-center">
                <p className="text-xl lg:text-2xl mb-1" role="img" aria-label="Sunset">
                  🌇
                </p>
                <p className="text-xs lg:text-sm text-gray-600">Matahari Tenggelam</p>
                <p className="font-semibold text-sm lg:text-base">{formatTime(cityDetail.sunset, cityDetail.timezone)}</p>
              </div>
            )}
          </div>

          {/* 5-Day Forecast */}
          {forecast.length > 0 && (
            <div ref={forecastRef} className="opacity-0 mb-6 lg:mb-8">
              <h2 className="text-xl lg:text-2xl font-bold text-amber-600 mb-4 lg:mb-6 text-center">📅 Kondisi Cuaca 5 Hari Ke Depan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                {forecast.map((day, index) => (
                  <div key={`${day.dt}-${index}`} className="bg-gradient-to-br from-blue-50 to-indigo-100 p-3 lg:p-4 rounded-xl text-center hover:shadow-lg transition duration-300">
                    <p className="font-semibold text-indigo-700 mb-2 text-sm lg:text-base">{getDayName(day.dt)}</p>
                    <div className="text-2xl lg:text-4xl mb-2" role="img" aria-label="Weather forecast">
                      {getWeatherIcon(day.weather[0]?.id || 800, day.weather[0]?.icon?.includes("d") ? 1 : 0)}
                    </div>
                    <p className="text-lg lg:text-2xl font-bold text-blue-600 mb-1">{kelvinToCelsius(day.main?.temp)}°C</p>
                    <p className="text-xs lg:text-sm text-gray-600 capitalize mb-2">{day.weather[0]?.description || ""}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>💨 {mpsToKmh(day.wind?.speed || 0)} km/h</p>
                      <p>💧 {day.main?.humidity || 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="text-center">
            <Link
              ref={buttonRef}
              to="/"
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-6 lg:px-8 rounded-full font-semibold shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              🏠 Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CityDetail;
