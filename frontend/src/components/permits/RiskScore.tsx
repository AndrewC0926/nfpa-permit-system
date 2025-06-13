import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export type RiskLevel = 'low' | 'medium' | 'high';

interface RiskScoreProps {
  level: RiskLevel;
  confidence: number;
  details: string;
}

const riskConfig = {
  low: {
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    icon: '🟢',
  },
  medium: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    icon: '🟡',
  },
  high: {
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    icon: '🔴',
  },
};

export const RiskScore: React.FC<RiskScoreProps> = ({ level, confidence, details }) => {
  const config = riskConfig[level];
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="relative inline-flex items-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${config.bgColor} ${config.color}`}
      >
        <span className="mr-1">{config.icon}</span>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
        <button
          className="ml-1.5"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <InformationCircleIcon className="h-4 w-4" />
        </button>
      </motion.div>

      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 top-full z-10 mt-2 w-64 rounded-md bg-white p-3 shadow-lg ring-1 ring-black ring-opacity-5"
        >
          <div className="text-sm">
            <p className="font-medium text-gray-900">AI Risk Assessment</p>
            <p className="mt-1 text-gray-500">{details}</p>
            <p className="mt-2 text-xs text-gray-400">
              Confidence: {confidence}%
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}; 