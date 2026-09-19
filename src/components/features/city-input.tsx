"use client";

import type { InputHTMLAttributes } from "react";
import { CITY_OPTIONS } from "@/lib/geo";
import { Input } from "@/components/ui/input";

/** Text input with an autocomplete datalist of known cities (client-side). */
export function CityInput({ id, ...rest }: { id?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "list" | "size">) {
  const list = id ? `${id}-cities` : "cities";
  return (
    <>
      <Input id={id} list={list} autoComplete="off" placeholder="e.g. Jaipur" {...rest} />
      <datalist id={list}>
        {CITY_OPTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}