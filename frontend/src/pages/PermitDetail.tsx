import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Permit {
  id: string;
  type: string;
  status: string;
  property: {
    address: string;
    type: string;
  };
  applicant: {
    name: string;
    organization: string;
  };
  documents: {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
  }[];
  aiAnalysis: {
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    summary?: string;
    violations?: {
      code: string;
      description: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }[];
  };
  comments: {
    id: string;
    text: string;
    user: {
      name: string;
      role: string;
    };
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export default function PermitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchPermit = async () => {
      try {
        const response = await api.get(`/permits/${id}`);
        setPermit(response.data.data);
      } catch (error) {
        console.error('Failed to fetch permit:', error);
        toast.error('Failed to load permit details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermit();
  }, [id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/permits/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setPermit((prev) => ({
        ...prev!,
        documents: [...prev!.documents, response.data.data],
      }));
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await api.patch(`/permits/${id}/status`, {
        status: newStatus,
      });
      setPermit((prev) => ({
        ...prev!,
        status: response.data.data.status,
      }));
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await api.post(`/permits/${id}/comments`, {
        text: newComment,
      });
      setPermit((prev) => ({
        ...prev!,
        comments: [...prev!.comments, response.data.data],
      }));
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Permit not found</h2>
        <p className="mt-2 text-gray-600">
          The permit you're looking for doesn't exist or you don't have access to
          it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">
            Permit Details
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {permit.type} - {permit.property.address}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-4">
          <button
            onClick={() => handleStatusChange('APPROVED')}
            disabled={permit.status === 'APPROVED'}
            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Approve
          </button>
          <button
            onClick={() => handleStatusChange('REJECTED')}
            disabled={permit.status === 'REJECTED'}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
          >
            <XCircleIcon className="h-5 w-5 mr-2" />
            Reject
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Property Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Property Information
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {permit.property.address}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {permit.property.type}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Applicant</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {permit.applicant.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Organization
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {permit.applicant.organization}
                </dd>
              </div>
            </dl>
          </div>

          {/* Documents */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Documents</h2>
              <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer">
                <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                Upload Document
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
            <ul className="divide-y divide-gray-200">
              {permit.documents.map((doc) => (
                <li key={doc.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doc.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-900"
                    >
                      View
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Analysis */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              AI Analysis
            </h2>
            {permit.aiAnalysis.status === 'PENDING' ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">
                  Analyzing documents...
                </p>
              </div>
            ) : permit.aiAnalysis.status === 'FAILED' ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600">
                  Analysis failed. Please try again.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-900 mb-4">
                  {permit.aiAnalysis.summary}
                </p>
                {permit.aiAnalysis.violations && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Violations Found:
                    </h3>
                    <ul className="space-y-2">
                      {permit.aiAnalysis.violations.map((violation) => (
                        <li
                          key={violation.code}
                          className="text-sm p-3 rounded-md bg-red-50"
                        >
                          <p className="font-medium text-red-800">
                            {violation.code}
                          </p>
                          <p className="text-red-700">{violation.description}</p>
                          <p className="text-red-600 text-xs mt-1">
                            Severity: {violation.severity}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Comments</h2>
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Post
                </button>
              </div>
            </form>
            <ul className="space-y-4">
              {permit.comments.map((comment) => (
                <li key={comment.id} className="flex space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {comment.user.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 