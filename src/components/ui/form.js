"use client";

import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const Form = FormProvider;

export function FormField({ ...props }) {
  return <Controller {...props} />;
}

export function FormItem({ className, ...props }) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormLabel({ className, ...props }) {
  return <Label className={className} {...props} />;
}

export function FormControl({ ...props }) {
  return props.children;
}

export function FormMessage({ name, className }) {
  const {
    formState: { errors },
  } = useFormContext();
  const error = name ? errors[name] : null;

  if (!error?.message) return null;

  return (
    <p className={cn("text-sm font-medium text-red-300", className)}>
      {String(error.message)}
    </p>
  );
}
