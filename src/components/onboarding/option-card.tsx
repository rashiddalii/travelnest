"use client";

import { ReactNode } from "react";
import { Check } from "lucide-react";

interface OptionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
        selected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
              selected
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`font-semibold ${
                selected
                  ? "text-blue-900 dark:text-blue-100"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {title}
            </h3>
            {selected && (
              <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
