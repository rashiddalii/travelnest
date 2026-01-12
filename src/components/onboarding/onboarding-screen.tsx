"use client";

import { ReactNode } from "react";

interface OnboardingScreenProps {
  title: string;
  description: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function OnboardingScreen({
  title,
  description,
  children,
  icon,
}: OnboardingScreenProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {icon && (
          <div className="mb-6 flex items-center justify-center">{icon}</div>
        )}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
          {description}
        </p>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
