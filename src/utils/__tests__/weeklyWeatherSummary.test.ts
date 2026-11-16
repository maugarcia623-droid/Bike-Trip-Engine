import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWeeklyWeather } from '../weeklyWeatherSummary';
import type { DailyForecastDay, WeeklyForecast } from '../../services/weatherService';

function makeForecast(days: Partial<DailyForecastDay>[]): WeeklyForecast {
  const baseDates = [
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
  ];
  return {
    latitude: 47.2184,
    longitude: -1.5536,
    fetchedAt: '2026-11-16T10:00:00Z',
    days: days.map((d, i) => ({
      date: d.date ?? baseDates[i % baseDates.length],
      weatherCode: d.weatherCode ?? 1,
      tempMaxC: d.tempMaxC ?? 15,
      tempMinC: d.tempMinC ?? 8,
      precipitationSumMm: d.precipitationSumMm ?? 0,
      precipitationProbMax: d.precipitationProbMax ?? 10,
      windSpeedMaxKmH: d.windSpeedMaxKmH ?? 14,
    })),
  };
}

describe('weeklyWeatherSummary', () => {
  it('encourages full rain gear when the whole week is rainy', () => {
    const forecast = makeForecast([
      { weatherCode: 63, precipitationSumMm: 9, precipitationProbMax: 85, tempMaxC: 11, tempMinC: 7 },
      { weatherCode: 61, precipitationSumMm: 6, precipitationProbMax: 80, tempMaxC: 12, tempMinC: 8 },
      { weatherCode: 80, precipitationSumMm: 5, precipitationProbMax: 75, tempMaxC: 11, tempMinC: 7 },
      { weatherCode: 63, precipitationSumMm: 10, precipitationProbMax: 90, tempMaxC: 10, tempMinC: 6 },
      { weatherCode: 61, precipitationSumMm: 4, precipitationProbMax: 70, tempMaxC: 12, tempMinC: 7 },
      { weatherCode: 61, precipitationSumMm: 7, precipitationProbMax: 80, tempMaxC: 11, tempMinC: 7 },
      { weatherCode: 80, precipitationSumMm: 5, precipitationProbMax: 75, tempMaxC: 12, tempMinC: 8 },
    ]);

    const summary = summarizeWeeklyWeather(forecast, 'en');
    assert.match(summary, /You can do it/i);
    assert.match(summary, /head to toe/i);
    assert.match(summary, /around 11°C/);
  });

  it('calls out the driest day during a mostly rainy week', () => {
    const forecast = makeForecast([
      { weatherCode: 63, precipitationSumMm: 8, precipitationProbMax: 85, tempMaxC: 12 },
      { weatherCode: 61, precipitationSumMm: 5, precipitationProbMax: 75, tempMaxC: 13 },
      { weatherCode: 61, precipitationSumMm: 4, precipitationProbMax: 70, tempMaxC: 12 },
      { weatherCode: 63, precipitationSumMm: 9, precipitationProbMax: 90, tempMaxC: 11 },
      { weatherCode: 1, precipitationSumMm: 0, precipitationProbMax: 10, tempMaxC: 14 }, // Friday (2026-11-20)
      { weatherCode: 80, precipitationSumMm: 4, precipitationProbMax: 65, tempMaxC: 12 },
      { weatherCode: 2, precipitationSumMm: 0.2, precipitationProbMax: 25, tempMaxC: 13 },
    ]);

    const summary = summarizeWeeklyWeather(forecast, 'en');
    assert.match(summary, /5 wet days/);
    assert.match(summary, /Friday looks driest/);
    assert.match(summary, /cover yourself from head to toe/i);
  });

  it('handles a mixed week with 2 rainy days concisely', () => {
    const forecast = makeForecast([
      { weatherCode: 1, tempMaxC: 16 },
      { weatherCode: 61, precipitationSumMm: 3, precipitationProbMax: 70, tempMaxC: 14 }, // Tue
      { weatherCode: 2, tempMaxC: 15 },
      { weatherCode: 80, precipitationSumMm: 2.5, precipitationProbMax: 65, tempMaxC: 14 }, // Thu
      { weatherCode: 0, tempMaxC: 17 },
      { weatherCode: 1, tempMaxC: 18 },
      { weatherCode: 1, tempMaxC: 17 },
    ]);

    const summary = summarizeWeeklyWeather(forecast, 'en');
    assert.match(summary, /Mixed bag/);
    assert.match(summary, /Tue & Thu/);
    assert.match(summary, /highs 14–18°C/);
  });

  it('highlights windy stretches when mostly dry', () => {
    const forecast = makeForecast([
      { weatherCode: 2, windSpeedMaxKmH: 38, tempMaxC: 14 },
      { weatherCode: 1, windSpeedMaxKmH: 44, tempMaxC: 15 },
      { weatherCode: 2, windSpeedMaxKmH: 35, tempMaxC: 14 },
      { weatherCode: 1, windSpeedMaxKmH: 22, tempMaxC: 16 },
      { weatherCode: 0, windSpeedMaxKmH: 18, tempMaxC: 16 },
      { weatherCode: 1, windSpeedMaxKmH: 20, tempMaxC: 15 },
      { weatherCode: 2, windSpeedMaxKmH: 24, tempMaxC: 15 },
    ]);

    const summary = summarizeWeeklyWeather(forecast, 'en');
    assert.match(summary, /44 km\/h/);
    assert.match(summary, /tailwind/i);
  });

  it('gives an inviting summary for a clear, mild week', () => {
    const forecast = makeForecast([
      { weatherCode: 0, tempMaxC: 17, tempMinC: 9 },
      { weatherCode: 1, tempMaxC: 18, tempMinC: 10 },
      { weatherCode: 0, tempMaxC: 19, tempMinC: 10 },
      { weatherCode: 1, tempMaxC: 18, tempMinC: 9 },
      { weatherCode: 0, tempMaxC: 20, tempMinC: 11 },
      { weatherCode: 1, tempMaxC: 19, tempMinC: 10 },
      { weatherCode: 0, tempMaxC: 18, tempMinC: 9 },
    ]);

    const summary = summarizeWeeklyWeather(forecast, 'en');
    assert.match(summary, /Clear, dry skies all week/);
    assert.match(summary, /around 18°C|around 19°C/);
    assert.match(summary, /long way/);
  });

  it('supports French summaries including rainy-week encouragement', () => {
    const forecast = makeForecast([
      { weatherCode: 63, precipitationSumMm: 8, precipitationProbMax: 85, tempMaxC: 11 },
      { weatherCode: 61, precipitationSumMm: 5, precipitationProbMax: 80, tempMaxC: 11 },
      { weatherCode: 61, precipitationSumMm: 6, precipitationProbMax: 80, tempMaxC: 12 },
      { weatherCode: 63, precipitationSumMm: 10, precipitationProbMax: 90, tempMaxC: 10 },
      { weatherCode: 61, precipitationSumMm: 4, precipitationProbMax: 75, tempMaxC: 11 },
      { weatherCode: 61, precipitationSumMm: 5, precipitationProbMax: 80, tempMaxC: 11 },
      { weatherCode: 80, precipitationSumMm: 5, precipitationProbMax: 75, tempMaxC: 12 },
    ]);

    const summary = summarizeWeeklyWeather(forecast, 'fr');
    assert.match(summary, /Tu peux le faire/);
    assert.match(summary, /tête aux pieds/);
  });

  it('returns empty string for empty forecast days', () => {
    const forecast = makeForecast([]);
    assert.equal(summarizeWeeklyWeather(forecast, 'en'), '');
  });
});
