import React from "react";
import { numberToWords } from "../utils/numberToWords";

interface Props {
  value: string | number | undefined;
}

export default function AmountWords({ value }: Props) {
  if (value === undefined || value === "" || value === null) return null;
  const n = parseFloat(String(value));
  if (isNaN(n) || n === 0) return null;

  return (
    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 italic select-none">
      {numberToWords(n)}
    </p>
  );
}
