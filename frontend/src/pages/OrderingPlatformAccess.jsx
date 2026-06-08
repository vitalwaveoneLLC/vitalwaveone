import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Ordering Platform Access
 * Allows staff to access the ordering platform via unique company link
 */
export default function OrderingPlatformAccess({ link, onSuccess, onError }) {
  const [validating, setValidating] = useState(true);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    validateLink();
  }, [link]);

  const validateLink = async () => {
    try {
      setValidating(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/validate-ordering-link/${link}`);

      if (response.ok) {
        const data = await response.json();
        setCompany(data);

        // Store in session with company info
        sessionStorage.setItem('ordering_session', JSON.stringify({
          companyId: data.companyId,
          companyName: data.companyName,
          link: link,
          timestamp: new Date().toISOString(),
        }));

        // Redirect to ordering portal
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else if (response.status === 404) {
        setError('Invalid ordering link. Please check the URL.');
      } else if (response.status === 403) {
        setError('This ordering link has been disabled. Please contact support.');
      } else {
        setError('Unable to validate link. Please try again.');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setValidating(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating access...</h2>
          <p className="text-gray-600">Please wait while we verify your ordering link</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/';
                }
              }}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Verified!</h2>
            <p className="text-gray-600 mb-2">Welcome to</p>
            <p className="text-lg font-bold text-indigo-600 mb-6">{company.companyName}</p>
            <p className="text-sm text-gray-500">Redirecting to ordering platform...</p>
            <div className="mt-6">
              <div className="w-full h-1 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-green-500 w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
