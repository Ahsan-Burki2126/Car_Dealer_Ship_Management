import React from "react";
import { FiCheck } from "react-icons/fi";

export interface StepDef {
  label: string;
  icon?: React.ReactNode;
}

interface FormStepperProps {
  steps: StepDef[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function FormStepper({
  steps,
  currentStep,
  onStepClick,
}: FormStepperProps) {
  return (
    <nav className="card px-4 py-3 mb-6">
      {/* Current step label shown above the dots */}
      <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-2 text-center">
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.label}
      </p>
      <ol className="flex items-center w-full">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = onStepClick && i < currentStep;

          return (
            <li
              key={i}
              className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                title={step.label}
                className={isClickable ? "cursor-pointer" : "cursor-default"}
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/40"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {isCompleted ? <FiCheck size={13} /> : i + 1}
                </span>
              </button>

              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 rounded ${
                    i < currentStep
                      ? "bg-green-400 dark:bg-green-600"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  nextDisabled?: boolean;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  submitLabel = "Submit",
  nextDisabled,
}: StepNavigationProps) {
  const isLast = currentStep === totalSteps - 1;

  const scrollTop = () => {
    const container = document.getElementById("main-scroll-container");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    onBack();
    scrollTop();
  };

  const handleNext = () => {
    onNext();
    scrollTop();
  };

  return (
    <div className="flex items-center justify-between pt-4">
      <button
        type="button"
        onClick={handleBack}
        className={`btn-secondary ${currentStep === 0 ? "invisible" : ""}`}
      >
        Back
      </button>

      {isLast ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn-primary flex items-center gap-2"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          disabled={nextDisabled}
          className="btn-primary"
        >
          Next
        </button>
      )}
    </div>
  );
}
