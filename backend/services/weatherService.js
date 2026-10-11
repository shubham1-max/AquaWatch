import NodeCache from 'node-cache';

// Enhanced weather cache with memory limits
// Cache weather data for 10 minutes
// Max 1000 entries and ~10MB memory limit
const weatherCache = new NodeCache({
  stdTTL: 600, // 10 minutes
  maxKeys: 1000, // Prevent unbounded growth
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance
  deleteOnExpire: true
});

// Monitor cache size
let cacheStats = {
  hits: 0,
  misses: 0,
  lastCleanup: new Date()
};

// Estimate memory usage (rough approximation)
const estimateMemoryUsage = () => {
  const keys = weatherCache.keys();
  const sampleSize = Math.min(keys.length, 10);
  let totalSize = 0;

  for (let i = 0; i < sampleSize; i++) {
    const value = weatherCache.get(keys[i]);
    if (value) {
      totalSize += JSON.stringify(value).length;
    }
  }

  const avgSize = totalSize / sampleSize;
  return Math.round((avgSize * keys.length) / 1024 / 1024 * 100) / 100; // MB
};

// Cleanup if memory usage is too high (>10MB estimated)
const cleanupIfNeeded = () => {
  const memoryUsage = estimateMemoryUsage();
  const keyCount = weatherCache.keys().length;

  if (memoryUsage > 10 || keyCount > 800) {
    console.warn(`Weather cache cleanup: ${keyCount} keys, ~${memoryUsage}MB`);
    // Remove 20% of oldest entries
    const keys = weatherCache.keys();
    const removeCount = Math.floor(keys.length * 0.2);
    keys.slice(0, removeCount).forEach(key => weatherCache.del(key));
    cacheStats.lastCleanup = new Date();
  }
};

// Periodic cleanup (every 5 minutes)
setInterval(cleanupIfNeeded, 5 * 60 * 1000);

class WeatherService {
  constructor() {
    this.baseURL = process.env.WEATHER_API_BASE_URL || 'https://api.open-meteo.com/v1';
  }

  /**
   * Round coordinates to prevent cache explosion
   * Rounds to ~111m precision (0.001 degrees ≈ 111 meters)
   */
  roundCoordinate(coordinate) {
    return Math.round(coordinate * 1000) / 1000;
  }

  /**
   * Fetch current weather and forecast for given coordinates
   */
  async getWeatherData(latitude, longitude) {
    const roundedLat = this.roundCoordinate(latitude);
    const roundedLon = this.roundCoordinate(longitude);
    const cacheKey = `weather_${roundedLat}_${roundedLon}`;

    // Check cache first
    const cached = weatherCache.get(cacheKey);
    if (cached) {
      cacheStats.hits++;
      return {
        ...cached,
        fromCache: true
      };
    }

    cacheStats.misses++;

    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          latitude: roundedLat,
          longitude: roundedLon,
          current: 'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code',
          hourly: 'precipitation,rain',
          daily: 'precipitation_sum,rain_sum,precipitation_probability_max',
          timezone: 'auto',
          forecast_days: 3
        },
        timeout: 5000
      });

      const weatherData = {
        current: {
          temperature: response.data.current.temperature_2m,
          humidity: response.data.current.relative_humidity_2m,
          precipitation: response.data.current.precipitation,
          rain: response.data.current.rain,
          weatherCode: response.data.current.weather_code,
          time: response.data.current.time
        },
        hourly: {
          precipitation: response.data.hourly.precipitation.slice(0, 24),
          times: response.data.hourly.time.slice(0, 24)
        },
        daily: {
          precipitationSum: response.data.daily.precipitation_sum,
          rainSum: response.data.daily.rain_sum,
          precipitationProbability: response.data.daily.precipitation_probability_max,
          dates: response.data.daily.time
        },
        metadata: {
          source: 'Open-Meteo',
          retrievedAt: new Date().toISOString(),
          coordinates: {
            latitude: roundedLat,
            longitude: roundedLon,
            originalLatitude: latitude,
            originalLongitude: longitude
          },
          timezone: response.data.timezone
        }
      };

      // Cache the result
      weatherCache.set(cacheKey, weatherData);

      // Cleanup if needed
      if (cacheStats.hits + cacheStats.misses % 50 === 0) {
        cleanupIfNeeded();
      }

      return weatherData;
    } catch (error) {
      console.error('Weather API error:', error.message);

      if (error.code === 'ECONNABORTED') {
        throw new Error('Weather service timeout');
      }

      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      keys: weatherCache.keys().length,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses || 1),
      estimatedMemoryMB: estimateMemoryUsage(),
      maxKeys: 1000,
      lastCleanup: cacheStats.lastCleanup,
      stats: weatherCache.getStats()
    };
  }

  /**
   * Clear cache (for testing or maintenance)
   */
  clearCache() {
    weatherCache.flushAll();
    cacheStats = {
      hits: 0,
      misses: 0,
      lastCleanup: new Date()
    };
  }

  /**
   * Get weather description from weather code
   */
  getWeatherDescription(code) {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    return weatherCodes[code] || 'Unknown';
  }

  /**
   * Calculate 24-hour total precipitation
   */
  calculate24hPrecipitation(hourlyPrecipitation) {
    return hourlyPrecipitation.reduce((sum, val) => sum + (val || 0), 0);
  }
}

export default new WeatherService();
