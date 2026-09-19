"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const baseControl = [
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm",
  "placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:outline-offset-0",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
].join(" ");

const sizeHeight = {
  sm: "h-8",
  md: "h-10",
} as const;

export interface FieldGapProps {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

/** Label + optional hint + error text wrapper. */
export function Field({ label, hint, error, htmlFor, required, className, children }: FieldGapProps & { children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: keyof typeof sizeHeight;
  invalid?: boolean;
}
export function Input({ size = "md", invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(baseControl, sizeHeight[size], invalid && "border-red-400 focus:border-red-500 focus:outline-red-500", className)}
      {...rest}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(baseControl, "min-h-24 py-2", invalid && "border-red-400 focus:border-red-500 focus:outline-red-500", className)}
      {...rest}
    />
  );
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: keyof typeof sizeHeight;
  invalid?: boolean;
}
export function Select({ size = "md", invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(baseControl, sizeHeight[size], "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%23788%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20d%3D%22M4.5%206l3.5%203.5L11.5%206z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9", invalid && "border-red-400", className)}
      {...rest}
    >
      {children}
    </select>
  );
}