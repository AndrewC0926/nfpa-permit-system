import React from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

export type PermitStatus = 'submitted' | 'ai_review' | 'inspector_review' | 'blockchain_logged' | 'approved' | 'rejected';

interface PermitTimelineProps {
  currentStatus: PermitStatus;
  onStatusChange?: (status: PermitStatus) => void;
}

const steps = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'ai_review', label: 'AI Review' },
  { id: 'inspector_review', label: 'Inspector Review' },
  { id: 'blockchain_logged', label: 'Blockchain Logged' },
  { id: 'approved', label: 'Approved' },
];

export const PermitTimeline: React.FC<PermitTimelineProps> = ({ currentStatus, onStatusChange }) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStatus);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.2 }}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isCompleted
                      ? 'border-green-500 bg-green-500'
                      : isCurrent
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                  )}
                </motion.div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    isCompleted ? 'text-green-500' : isCurrent ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="relative flex-1">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className={`h-0.5 w-full ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}; 