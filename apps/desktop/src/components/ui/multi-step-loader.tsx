"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={cn("h-6 w-6", className)}
  >
    <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const CheckFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-6 w-6", className)}
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
      clipRule="evenodd"
    />
  </svg>
);

export type LoadingState = { text: string };

const LoaderCore = ({
  loadingStates,
  value = 0,
  subLabel,
}: {
  loadingStates: LoadingState[];
  value?: number;
  /** Live detail shown nested under the active step (e.g. the job being ranked). */
  subLabel?: string;
}) => {
  return (
    <div className="relative mx-auto mt-40 flex w-72 flex-col justify-start">
      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.2, 0);
        const isDone = index < value;
        const isActive = index === value;
        return (
          <motion.div
            key={index}
            className="mb-4 flex flex-col gap-1 text-left"
            initial={{ opacity: 0, y: -(value * 40) }}
            animate={{ opacity, y: -(value * 40) }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <div>
                {isDone && <CheckFilled className="text-brand dark:text-green" />}
                {isActive && <Loader2 className="h-6 w-6 animate-spin text-brand dark:text-green" />}
                {index > value && <CheckIcon className="text-muted-foreground" />}
              </div>
              <span
                className={cn(
                  "text-foreground",
                  isActive && "text-foreground opacity-100",
                )}
              >
                {loadingState.text}
              </span>
            </div>
            {/* Nested live detail under the active step only. */}
            <AnimatePresence mode="wait">
              {isActive && subLabel && (
                <motion.div
                  key={subLabel}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="ml-8 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400"
                >
                  <span className="text-neutral-400 dark:text-neutral-600">↳</span>
                  <span className="break-words">{subLabel}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
  value,
  subLabel,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
  /** Controlled active step. When provided, the internal timer is disabled and the
   *  caller drives progress (e.g. to reflect real scan → ranking phases). */
  value?: number;
  /** Live detail nested under the active step (e.g. the job currently being ranked). */
  subLabel?: string;
}) => {
  const controlled = value !== undefined;
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    if (controlled) return;
    if (!loading) {
      setCurrentState(0);
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1),
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentState, loading, loop, loadingStates.length, duration, controlled]);

  const active = controlled ? Math.min(Math.max(value!, 0), loadingStates.length - 1) : currentState;

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex h-full w-full items-center justify-center backdrop-blur-2xl"
        >
          <div className="relative h-96 w-full overflow-hidden">
            <LoaderCore value={active} loadingStates={loadingStates} subLabel={subLabel} />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-20 h-full bg-gradient-to-t from-background [mask-image:radial-gradient(900px_at_center,transparent_30%,var(--background))]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
