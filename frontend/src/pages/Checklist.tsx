import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface ChecklistItem {
  id: string;
  code: string;
  description: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'PENDING';
  details?: string;
  reference?: string;
}

interface Category {
  name: string;
  items: ChecklistItem[];
}

export default function Checklist() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const response = await api.get('/checklist');
        setCategories(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedCategory(response.data.data[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch checklist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChecklist();
  }, []);

  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'PASS':
        return (
          <CheckCircleIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
        );
      case 'FAIL':
        return (
          <XCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
        );
      case 'WARNING':
        return (
          <ExclamationTriangleIcon
            className="h-5 w-5 text-yellow-500"
            aria-hidden="true"
          />
        );
      default:
        return (
          <InformationCircleIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        );
    }
  };

  const getStatusColor = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-50 text-green-700';
      case 'FAIL':
        return 'bg-red-50 text-red-700';
      case 'WARNING':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">NFPA Checklist</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review and validate compliance with NFPA guidelines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`${
                  selectedCategory === category.name
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full`}
              >
                <span className="truncate">{category.name}</span>
                <span
                  className={`ml-auto inline-block py-0.5 px-3 text-xs rounded-full ${
                    selectedCategory === category.name
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.items.length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Checklist Items */}
        <div className="lg:col-span-3">
          {selectedCategory && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedCategory}
                </h2>
                <div className="space-y-4">
                  {categories
                    .find((c) => c.name === selectedCategory)
                    ?.items.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900">
                                {item.code}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {item.description}
                            </p>
                            {item.details && (
                              <p className="mt-2 text-sm text-gray-700">
                                {item.details}
                              </p>
                            )}
                            {item.reference && (
                              <p className="mt-1 text-xs text-gray-500">
                                Reference: {item.reference}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 