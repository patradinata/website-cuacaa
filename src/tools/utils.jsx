import { WiDaySunny, WiNightClear, WiCloudy, WiDayCloudy, WiNightAltCloudy, WiRain, WiDayRain, WiNightAltRain, WiThunderstorm, WiSnow, WiDayFog, WiDayHaze, WiNightFog, WiDaySleet, WiNightAltSleet } from "react-icons/wi";
import cerah from "../assets/img/cerah.png";
import hujan from "../assets/img/hujan.jpg";
import mendung from "../assets/img/mendung.jpg";

// OpenWeatherMap API Configuration
const API_KEY = "965258ee2844412dc02786c604b4f238";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

/**
 * Get weather icon based on OpenWeatherMap condition codes
 * @param {number} code - OpenWeatherMap condition code
 * @param {number} isDay - 1 for day, 0 for night
 * @returns {JSX.Element} Weather icon component
 */
export function getWeatherIcon(code, isDay) {
  // Clear sky
  if (code === 800) {
    return isDay ? <WiDaySunny /> : <WiNightClear />;
  }

  // Few clouds (11-25%)
  if (code === 801) {
    return isDay ? <WiDayCloudy /> : <WiNightAltCloudy />;
  }

  // Scattered clouds (25-50%) and broken clouds (51-84%)
  if (code === 802 || code === 803) {
    return isDay ? <WiDayCloudy /> : <WiNightAltCloudy />;
  }

  // Overcast clouds (85-100%)
  if (code === 804) {
    return <WiCloudy />;
  }

  // Thunderstorm group (200-232)
  if (code >= 200 && code <= 232) {
    return <WiThunderstorm />;
  }

  // Drizzle group (300-321)
  if (code >= 300 && code <= 321) {
    return isDay ? <WiDayRain /> : <WiNightAltRain />;
  }

  // Rain group (500-531)
  if (code >= 500 && code <= 531) {
    // Light rain
    if (code >= 500 && code <= 504) {
      return isDay ? <WiDayRain /> : <WiNightAltRain />;
    }
    // Heavy rain and shower rain
    return <WiRain />;
  }

  // Snow group (600-622)
  if (code >= 600 && code <= 622) {
    // Sleet conditions
    if (code === 611 || code === 612 || code === 613 || code === 615 || code === 616) {
      return isDay ? <WiDaySleet /> : <WiNightAltSleet />;
    }
    return <WiSnow />;
  }

  // Atmosphere group (701-781)
  if (code >= 701 && code <= 781) {
    // Fog conditions
    if (code === 701 || code === 741) {
      return isDay ? <WiDayFog /> : <WiNightFog />;
    }
    // Haze, dust, sand, ash
    if (code === 721 || code === 731 || code === 751 || code === 761 || code === 762) {
      return <WiDayHaze />;
    }
    // Other atmospheric conditions (smoke, dust, sand, volcanic ash, squalls, tornado)
    return isDay ? <WiDayFog /> : <WiNightFog />;
  }

  // Default fallback
  return isDay ? <WiDaySunny /> : <WiNightClear />;
}

/**
 * Get weather background image based on OpenWeatherMap condition codes
 * @param {number} code - OpenWeatherMap condition code
 * @returns {string} Background image path
 */
export function getWeatherBackground(code) {
  // Clear sky
  if (code === 800) {
    return cerah;
  }

  // Cloudy conditions (801-804)
  if (code >= 801 && code <= 804) {
    return mendung;
  }

  // Thunderstorm (200-232)
  if (code >= 200 && code <= 232) {
    return hujan;
  }

  // Drizzle and Rain (300-531)
  if (code >= 300 && code <= 531) {
    return hujan;
  }

  // Snow (600-622)
  if (code >= 600 && code <= 622) {
    return mendung; // Could add snow background if available
  }

  // Atmospheric conditions (701-781)
  if (code >= 701 && code <= 781) {
    return mendung;
  }

  // Default fallback
  return cerah;
}

/**
 * Convert Kelvin to Celsius
 * @param {number} kelvin - Temperature in Kelvin
 * @returns {number} Temperature in Celsius
 */
export const kelvinToCelsius = (kelvin) => {
  if (typeof kelvin !== "number" || isNaN(kelvin)) return 0;
  return Math.round(kelvin - 273.15);
};

/**
 * Convert wind speed from m/s to km/h
 * @param {number} mps - Wind speed in meters per second
 * @returns {number} Wind speed in kilometers per hour
 */
export const mpsToKmh = (mps) => {
  if (typeof mps !== "number" || isNaN(mps)) return 0;
  return Math.round(mps * 3.6);
};

/**
 * Fetch weather data from OpenWeatherMap API
 * @param {string} city - City name
 * @returns {Object|null} Weather data object or null if error
 */
export const fetchWeather = async (city) => {
  if (!city || typeof city !== "string") {
    console.error("Invalid city parameter");
    return null;
  }

  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&lang=id`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Validate API response
    if (data.cod !== 200) {
      throw new Error(data.message || "City not found");
    }

    // Validate required data fields
    if (!data.main || !data.weather?.[0] || !data.sys) {
      throw new Error("Incomplete weather data received");
    }

    return {
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
      feelsLike: kelvinToCelsius(data.main.feels_like || data.main.temp),
      visibility: data.visibility ? Math.round(data.visibility / 1000) : null, // Convert to km
      sunrise: data.sys.sunrise || null,
      sunset: data.sys.sunset || null,
      timezone: data.timezone || 0,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);

    if (error.name === "AbortError") {
      console.error("Request timeout");
    }

    return null;
  }
};

/**
 * Fetch 5-day weather forecast from OpenWeatherMap API
 * @param {string} city - City name
 * @returns {Array|null} Array of forecast data or null if error
 */
export const fetchForecast = async (city) => {
  if (!city || typeof city !== "string") {
    console.error("Invalid city parameter");
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&lang=id`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.cod !== "200") {
      throw new Error(data.message || "Failed to fetch forecast data");
    }

    if (!data.list || !Array.isArray(data.list)) {
      throw new Error("Invalid forecast data structure");
    }

    // Group forecast by day (take midday data ~12:00)
    const groupedByDay = {};

    data.list.forEach((item) => {
      if (!item.dt) return;

      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();
      const hour = date.getHours();

      // Prefer data around noon (11-13), fallback to any data
      if (hour >= 11 && hour <= 13) {
        if (!groupedByDay[dateKey] || hour === 12) {
          groupedByDay[dateKey] = {
            dt: item.dt,
            temp: kelvinToCelsius(item.main?.temp || 0),
            tempMin: kelvinToCelsius(item.main?.temp_min || 0),
            tempMax: kelvinToCelsius(item.main?.temp_max || 0),
            condition: item.weather[0]?.description || "",
            conditionCode: item.weather[0]?.id || 800,
            icon: item.weather[0]?.icon || "01d",
            isDay: item.weather[0]?.icon?.includes("d") ? 1 : 0,
            humidity: item.main?.humidity || 0,
            windSpeed: mpsToKmh(item.wind?.speed || 0),
            pressure: item.main?.pressure || 0,
          };
        }
      } else if (!groupedByDay[dateKey]) {
        // Fallback if no midday data available
        groupedByDay[dateKey] = {
          dt: item.dt,
          temp: kelvinToCelsius(item.main?.temp || 0),
          tempMin: kelvinToCelsius(item.main?.temp_min || 0),
          tempMax: kelvinToCelsius(item.main?.temp_max || 0),
          condition: item.weather[0]?.description || "",
          conditionCode: item.weather[0]?.id || 800,
          icon: item.weather[0]?.icon || "01d",
          isDay: item.weather[0]?.icon?.includes("d") ? 1 : 0,
          humidity: item.main?.humidity || 0,
          windSpeed: mpsToKmh(item.wind?.speed || 0),
          pressure: item.main?.pressure || 0,
        };
      }
    });

    return Object.values(groupedByDay).slice(0, 5); // Return first 5 days
  } catch (error) {
    console.error("Error fetching forecast data:", error);

    if (error.name === "AbortError") {
      console.error("Forecast request timeout");
    }

    return null;
  }
};

/**
 * Get formatted time string
 * @param {number} timestamp - Unix timestamp
 * @param {number} timezone - Timezone offset in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (timestamp, timezone = 0) => {
  if (!timestamp) return "";

  try {
    const date = new Date((timestamp + timezone) * 1000);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch (error) {
    console.warn("Error formatting time:", error);
    return "";
  }
};

/**
 * Get formatted date string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.warn("Error formatting date:", error);
    return "";
  }
};

/**
 * Get day name from timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Day name in Indonesian
 */
export const getDayName = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("id-ID", { weekday: "long" });
  } catch (error) {
    console.warn("Error getting day name:", error);
    return "";
  }
};
