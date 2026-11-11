const BYTE_UNIT = "B";
const SCALED_UNITS = ["KiB", "MiB", "GiB", "TiB"];
const BASE = 1024;
// Values that round below this keep one decimal place
const ONE_DECIMAL_LIMIT = 10;
const DECIMAL_DIGITS = 1;
// Ten to the power of DECIMAL_DIGITS
const DECIMAL_SCALE = 10;

function formatScaled(value: number): string {
  const oneDecimal = Math.round(value * DECIMAL_SCALE) / DECIMAL_SCALE;
  return oneDecimal < ONE_DECIMAL_LIMIT
    ? oneDecimal.toFixed(DECIMAL_DIGITS)
    : String(Math.round(value));
}

export function formatSize(bytes: number): string {
  let value = bytes;
  let unit = BYTE_UNIT;
  for (const next of SCALED_UNITS) {
    // Step up while the rounded value would print as 1024 or more
    if (Math.round(value) < BASE) {
      break;
    }
    value /= BASE;
    unit = next;
  }
  return unit === BYTE_UNIT
    ? `${value} ${unit}`
    : `${formatScaled(value)} ${unit}`;
}
