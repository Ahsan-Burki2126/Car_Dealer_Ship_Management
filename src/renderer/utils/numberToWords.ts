// South Asian numbering system: thousand → lakh → crore

const ONES = [
  "zero","one","two","three","four","five","six","seven","eight","nine",
  "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
  "seventeen","eighteen","nineteen",
];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function twoDigits(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o > 0 ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let result = "";
  if (h > 0) {
    result = ONES[h] + " hundred";
    if (rest > 0) result += " and ";
  }
  if (rest > 0) result += twoDigits(rest);
  return result;
}

function convertInteger(n: number): string {
  if (n === 0) return "zero";

  const crore   = Math.floor(n / 10_000_000); n %= 10_000_000;
  const lakh    = Math.floor(n / 100_000);    n %= 100_000;
  const thousand = Math.floor(n / 1_000);     const remainder = n % 1_000;

  const parts: string[] = [];
  if (crore    > 0) parts.push(threeDigits(crore)   + " crore");
  if (lakh     > 0) parts.push(twoDigits(lakh)      + " lakh");
  if (thousand > 0) parts.push(twoDigits(thousand)  + " thousand");
  if (remainder > 0) parts.push(threeDigits(remainder));

  return parts.join(" ");
}

export function numberToWords(input: string | number): string {
  const raw = String(input).trim();
  if (!raw || raw === "-" || raw === ".") return "";

  const n = parseFloat(raw);
  if (isNaN(n)) return "";
  if (n === 0) return "zero";

  const negative = n < 0;
  const abs = Math.abs(n);

  const [intStr, decStr] = abs.toString().split(".");
  const intNum = parseInt(intStr, 10);

  let result = convertInteger(intNum);

  if (decStr) {
    const digits = decStr.split("").map((d) => ONES[parseInt(d)]).join(" ");
    result += " point " + digits;
  }

  return (negative ? "minus " : "") + result;
}
