import React, { useState, useEffect } from 'react';
import { Copy, RotateCw, Eye, EyeOff, Share2, Loader2 } from 'lucide-react';

export default function OrderingPlatformTab({ companyId }) {
  const [orderingLink, setOrderingLink] = useState(null);
  const [fullUrl, setFullUrl] = useState(null);
  const [linkActive, setLinkActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch ordering link on component mount
  useEffect(() => {
    fetchOrderingLink();
  }, [companyId]);

  const fetchOrderingLink = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/company/${companyId}/ordering-link`);

      if (response.ok) {
        const data = await response.json();
        setOrderingLink(data.link);
        setFullUrl(data.fullUrl);
        setLinkActive(data.active);
      } else if (response.status === 404) {
        // Link not created yet, create one
        await createNewLink();
      }
    } catch (error) {
      console.error('Error fetching ordering link:', error);
      setMessage('Failed to fetch ordering link');
    } finally {
      setLoading(false);
    }
  };

  const createNewLink = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/company/${companyId}/ordering-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateNew: false }),
      });

      const data = await response.json();
      if (data.success) {
        setOrderingLink(data.link);
        setFullUrl(data.fullUrl);
        setLinkActive(true);
        setMessage('Ordering platform link created successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating link:', error);
      setMessage('Failed to create ordering link');
    } finally {
      setLoading(false);
    }
  };

  const regenerateLink = async () => {
    try {
      setRegenerating(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/company/${companyId}/ordering-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateNew: true }),
      });

      const data = await response.json();
      if (data.success) {
        setOrderingLink(data.link);
        setFullUrl(data.fullUrl);
        setMessage('Ordering link regenerated successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error regenerating link:', error);
      setMessage('Failed to regenerate link');
    } finally {
      setRegenerating(false);
    }
  };

  const toggleLinkStatus = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const endpoint = linkActive ? 'disable' : 'enable';
      const response = await fetch(`${apiUrl}/company/${companyId}/ordering-link/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        setLinkActive(!linkActive);
        setMessage(`Ordering link ${!linkActive ? 'enabled' : 'disabled'} successfully!`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error toggling link status:', error);
      setMessage('Failed to update link status');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (fullUrl) {
      try {
        setCopying(true);
        await navigator.clipboard.writeText(fullUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        setMessage('Failed to copy link');
      } finally {
        setCopying(false);
      }
    }
  };

  if (loading && !orderingLink) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Loading ordering platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ordering Platform</h2>
        <p className="text-gray-600">Share this link with your staff to access the ordering platform</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">{message}</p>
        </div>
      )}

      {/* Main Link Card */}
      {orderingLink ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          {/* Link Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Link Status</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                linkActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {linkActive ? 'Active' : 'Disabled'}
            </span>
          </div>

          {/* Link Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordering Platform Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fullUrl || ''}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
              />
              <button
                onClick={copyToClipboard}
                disabled={copying}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                {showCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Link Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Code
            </label>
            <input
              type="text"
              value={orderingLink || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            {/* Regenerate Button */}
            <button
              onClick={regenerateLink}
              disabled={regenerating || loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>

            {/* Toggle Status Button */}
            <button
              onClick={toggleLinkStatus}
              disabled={loading}
              className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                linkActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              {linkActive ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Disable
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Enable
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No ordering link created yet</p>
          <button
            onClick={createNewLink}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Create Ordering Link
          </button>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Share Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Share2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How to Share</h3>
              <p className="text-sm text-blue-700">
                Share the link above with your staff. They can access the ordering platform without needing an account.
              </p>
            </div>
          </div>
        </div>

        {/* Link Management */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <RotateCw className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Link Management</h3>
              <p className="text-sm text-amber-700">
                Regenerate a new link if needed, or disable the current one to prevent access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
