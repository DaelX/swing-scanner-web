/**
 * Technical indicators — TypeScript port of the Python engine.
 * All functions operate on arrays of numbers (close, high, low, volume).
 */

export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prev: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (prev === null) {
      // First EMA = SMA
      const slice = data.slice(i - period + 1, i + 1);
      prev = slice.reduce((a, b) => a + b, 0) / period;
      result.push(prev);
    } else {
      prev = (data[i] - prev) * multiplier + prev;
      result.push(prev);
    }
  }
  return result;
}

export function rsi(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    gains.push(delta > 0 ? delta : 0);
    losses.push(delta < 0 ? -delta : 0);
  }

  // Use Wilder's smoothing (EMA with alpha = 1/period)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < gains.length; i++) {
    if (i < period) {
      avgGain += gains[i];
      avgLoss += losses[i];
      if (i < period - 1) {
        result.push(null);
      } else {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    } else {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

export function macd(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macdLine: (number | null)[]; signalLine: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  const macdLine: (number | null)[] = emaFast.map((f, i) => {
    const s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalEma = ema(macdValues, signal);

  // Align signal line with macd line
  const signalLine: (number | null)[] = new Array(macdLine.length).fill(null);
  let j = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      signalLine[i] = signalEma[j] ?? null;
      j++;
    }
  }

  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });

  return { macdLine, signalLine, histogram };
}

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): (number | null)[] {
  const trueRanges: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      trueRanges.push(highs[i] - lows[i]);
    } else {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
  }
  return sma(trueRanges, period);
}

export function rollingHigh(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      result.push(Math.max(...data.slice(i - period + 1, i + 1)));
    }
  }
  return result;
}

export function volumeRatio(volumes: number[], period: number = 20): (number | null)[] {
  const avgVol = sma(volumes, period);
  return volumes.map((v, i) => {
    const avg = avgVol[i];
    return avg !== null && avg > 0 ? v / avg : null;
  });
}

export function smaSlope(closes: number[], smaPeriod: number, lookback: number = 5): (number | null)[] {
  const smaValues = sma(closes, smaPeriod);
  return smaValues.map((v, i) => {
    if (v === null || i < lookback) return null;
    const prev = smaValues[i - lookback];
    return prev !== null ? v - prev : null;
  });
}

export function relativeStrength(
  tickerCloses: number[],
  benchmarkCloses: number[],
  period: number
): (number | null)[] {
  return tickerCloses.map((_, i) => {
    if (i < period) return null;
    const tickerRet = (tickerCloses[i] - tickerCloses[i - period]) / tickerCloses[i - period];
    const benchRet = (benchmarkCloses[i] - benchmarkCloses[i - period]) / benchmarkCloses[i - period];
    return tickerRet - benchRet;
  });
}

export interface IndicatorRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number | null;
  sma50: number | null;
  sma20_slope: number | null;
  rsi: number | null;
  macd_hist: number | null;
  macd_hist_prev: number | null;
  atr: number | null;
  high_20d: number | null;
  vol_ratio: number | null;
  rs_20d: number | null;
  rs_60d: number | null;
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function computeAllIndicators(
  candles: CandleData[],
  spyCloses?: number[]
): IndicatorRow[] {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const slope = smaSlope(closes, 20, 5);
  const rsiValues = rsi(closes, 14);
  const { histogram } = macd(closes, 12, 26, 9);
  const atrValues = atr(highs, lows, closes, 14);
  const high20d = rollingHigh(highs, 20);
  const volRat = volumeRatio(volumes, 20);

  let rs20: (number | null)[] = new Array(candles.length).fill(null);
  let rs60: (number | null)[] = new Array(candles.length).fill(null);
  if (spyCloses && spyCloses.length === candles.length) {
    rs20 = relativeStrength(closes, spyCloses, 20);
    rs60 = relativeStrength(closes, spyCloses, 60);
  }

  return candles.map((c, i) => ({
    ...c,
    sma20: sma20[i],
    sma50: sma50[i],
    sma20_slope: slope[i],
    rsi: rsiValues[i],
    macd_hist: histogram[i],
    macd_hist_prev: i > 0 ? histogram[i - 1] : null,
    atr: atrValues[i],
    high_20d: high20d[i],
    vol_ratio: volRat[i],
    rs_20d: rs20[i],
    rs_60d: rs60[i],
  }));
}
