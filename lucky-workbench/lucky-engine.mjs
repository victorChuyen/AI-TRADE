export const instruments = Object.freeze([
  { id: 'BTCUSD', name: 'Bitcoin CFD', base: 60000, digits: 2 },
  { id: 'XAUUSD', name: 'Vàng', base: 2500, digits: 2 },
  { id: 'WTI', name: 'Dầu WTI spot CFD', base: 70, digits: 3 },
  { id: 'EURUSD', name: 'Euro / Đô la Mỹ', base: 1.1, digits: 5 },
  { id: 'GBPUSD', name: 'Bảng Anh / Đô la Mỹ', base: 1.3, digits: 5 },
  { id: 'USDJPY', name: 'Đô la Mỹ / Yên Nhật', base: 145, digits: 3 },
]);
export const strategies = Object.freeze([
  { id: 'trend', name: 'Đi theo xu hướng', detail: 'SMA 10 / 30; ứng viên nghiên cứu, chưa xác thực hiệu quả.' },
  { id: 'breakout', name: 'Phá vỡ Donchian', detail: 'Đóng cửa vượt đỉnh/đáy 20 nến trước, không dùng nến hiện tại trong kênh.' },
  { id: 'reversion', name: 'Hồi quy Bollinger', detail: 'Giá quay lại dải 20 nến / 2 độ lệch chuẩn; lọc độ dốc SMA.' },
]);
export function fixture(symbol) {
  const instrument = instruments.find(x => x.id === symbol);
  if (!instrument) throw new Error('UNKNOWN_SYMBOL');
  // Mathematical test waveform, NOT recorded prices or a prediction.
  return Array.from({ length: 160 }, (_, i) => {
    const mid = instrument.base * (1 + .008 * Math.sin(i / 9) + .003 * Math.sin(i / 2.7) + i * .00003);
    const open = mid * (1 + .0006 * Math.cos(i / 3));
    const close = mid * (1 + .0008 * Math.sin(i / 4));
    return { time: new Date(Date.UTC(2026, 0, 5, 0, i * 15)).toISOString(), open, close,
      high: Math.max(open, close) * 1.001, low: Math.min(open, close) * .999 };
  });
}
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const band = values => {
  const mid = mean(values);
  const sd = Math.sqrt(mean(values.map(x => (x - mid) ** 2)));
  return { mid, top: mid + 2 * sd, bottom: mid - 2 * sd };
};
export function analyze(candles, strategy) {
  if (!strategies.some(x => x.id === strategy)) throw new Error('UNKNOWN_STRATEGY');
  if (candles.length < 32) throw new Error('INSUFFICIENT_DATA');
  if (candles.some(c => ![c.open, c.high, c.low, c.close].every(x => Number.isFinite(x) && x > 0) || c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close))) throw new Error('INVALID_DATA');
  const signals = [];
  for (let i = 31; i < candles.length; i++) {
    const past = candles.slice(i - 30, i); // Only closed bars before this bar.
    const prices = past.map(x => x.close);
    const current = candles[i].close;
    let direction = 'WAIT';
    let reason;
    if (strategy === 'trend') {
      const fast = mean(prices.slice(-10));
      const slow = mean(prices);
      direction = fast > slow && current > fast ? 'BUY' : fast < slow && current < fast ? 'SELL' : 'WAIT';
      reason = 'So sánh SMA 10/30 và giá đóng cửa; chưa tính spread/khối lượng.';
    } else if (strategy === 'breakout') {
      const channel = past.slice(-20);
      direction = current > Math.max(...channel.map(x => x.high)) ? 'BUY' : current < Math.min(...channel.map(x => x.low)) ? 'SELL' : 'WAIT';
      reason = 'So giá đóng cửa với kênh 20 nến trước; không có look-ahead.';
    } else {
      const bands = band(prices.slice(-20));
      const prior = candles.slice(i - 21, i - 1).map(x => x.close);
      const previous = band(prior);
      const flat = Math.abs(bands.mid / previous.mid - 1) < .001;
      direction = flat && prices.at(-1) < previous.bottom && current >= bands.bottom ? 'BUY' : flat && prices.at(-1) > previous.top && current <= bands.top ? 'SELL' : 'WAIT';
      reason = 'Giá quay lại dải + bộ lọc độ dốc; không mặc định chạm dải là đảo chiều.';
    }
    signals.push({ time: candles[i].time, close: current, direction, reason });
  }
  return { strategy, source: 'SYNTHETIC_FIXTURE', dataset: 'waveform-v1', timeframe: 'M15',
    counts: Object.fromEntries(['BUY', 'SELL', 'WAIT'].map(s => [s, signals.filter(x => x.direction === s).length])),
    signals, latest: signals.at(-1), execution: 'DISABLED', profit: null,
    warning: 'Chỉ kiểm tra thuật toán trên dữ liệu toán học. Không phải AI inference, backtest lợi nhuận hoặc tín hiệu để đặt lệnh.' };
}
