import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Modal, TextInput, Label, Button } from 'flowbite-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

/**
 * Official Google "G" Multicolor Vector Logo
 */
export function GoogleIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * 1-Click "Continue with Google" Authentication Component
 * 
 * Features:
 * - Zero SMS gateway cost / zero third-party verification charges
 * - Native Google Identity Services (GIS) Web SDK integration
 * - Automatic customer profile extraction and session creation
 * - Seamless local dev/demo modal fallback when VITE_GOOGLE_CLIENT_ID is not yet configured
 */
export default function GoogleAuthButton({
  onSuccess,
  onError,
  text = 'Continue with Google',
  className = '',
  compact = false,
}) {
  const { loginWithGoogle } = useCustomerAuth();
  const [loading, setLoading] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');
  const googleBtnContainerRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  // Vite statically replaces import.meta.env.DEV at build time (false in production builds),
  // so the demo/fake-identity modal below is dead-code-eliminated from production bundles.
  const isDev = import.meta.env.DEV;

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!googleClientId) return;

    const scriptId = 'google-gis-script';
    let script = document.getElementById(scriptId);

    const initGis = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });

        // Optionally render official GIS button if container is present
        if (googleBtnContainerRef.current) {
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'pill',
          });
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGis();
    }
  }, [googleClientId]);

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    try {
      const res = await loginWithGoogle({ credential: response.credential });
      if (onSuccess) onSuccess(res.customer, res);
    } catch (err) {
      console.error('Google auth error:', err);
      if (onError) onError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    // If official client ID is active and GIS is initialized, trigger prompt
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Real Google prompt was blocked/skipped by the browser.
            // Dev builds may fall back to the demo picker; production never does.
            if (isDev) {
              setShowDevModal(true);
            } else {
              setShowUnavailable(true);
            }
          }
        });
        return;
      } catch (e) {
        console.warn('Google prompt fallback:', e);
      }
    }

    // Google SDK/client ID unavailable: dev builds may use the demo picker for
    // local testing; production shows an unavailable message and creates no session.
    if (isDev) {
      setShowDevModal(true);
    } else {
      setShowUnavailable(true);
    }
  };

  const handleDevModalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!devEmail || !devEmail.includes('@')) return;

    setLoading(true);
    try {
      const res = await loginWithGoogle({
        email: devEmail.trim().toLowerCase(),
        name: devName.trim() || devEmail.split('@')[0],
        googleId: `google_${Date.now()}`,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(devName || devEmail)}`,
      });
      setShowDevModal(false);
      if (onSuccess) onSuccess(res.customer, res);
    } catch (err) {
      console.error('Dev Google auth error:', err);
      if (onError) onError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = (email, name) => {
    setDevEmail(email);
    setDevName(name);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-bold border border-gray-300 hover:border-gray-400 transition-all duration-200 rounded-xl shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-4 py-2.5 text-sm'
        } ${className}`}
      >
        {loading ? (
          <Spinner size="sm" className="mr-1" />
        ) : (
          <GoogleIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        )}
        <span className="truncate">{loading ? 'Connecting to Google...' : text}</span>
      </button>

      {/* Production: Google Sign-In temporarily unavailable — never creates a session */}
      <Modal show={showUnavailable} size="sm" onClose={() => setShowUnavailable(false)} popup>
        <Modal.Header />
        <Modal.Body className="pt-0 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <GoogleIcon className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Google Sign-In Unavailable</h3>
          <p className="text-xs text-gray-500 mb-4">
            Google Sign-In is temporarily unavailable. Please continue with email or mobile sign-in instead.
          </p>
          <Button size="xs" color="gray" onClick={() => setShowUnavailable(false)}>
            Close
          </Button>
        </Modal.Body>
      </Modal>

      {/* Development-only / Immediate 1-Click Google Account Selector Modal.
          Gated on import.meta.env.DEV so this — including the hardcoded demo
          identities and free-text email field — is dead-code-eliminated from
          production builds and can never render or execute in production. */}
      {isDev && (
      <Modal show={showDevModal} size="md" onClose={() => setShowDevModal(false)} popup>
        <Modal.Header />
        <Modal.Body className="pt-0">
          <div className="text-center mb-5">
            <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-md border flex items-center justify-center mb-3">
              <GoogleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Sign In with Google</h3>
            <p className="text-xs text-gray-500 mt-1">
              Instant 1-click onboarding with zero SMS gateway charges.
            </p>
          </div>

          {/* Quick Demo Accounts */}
          <div className="mb-4 space-y-2">
            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
              Quick Accounts
            </span>
            <button
              type="button"
              onClick={() => {
                handleQuickDemoSelect('karthik.printers@gmail.com', 'Karthik Raja');
              }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                devEmail === 'karthik.printers@gmail.com'
                  ? 'border-yellow-400 bg-yellow-50/50 ring-2 ring-yellow-400/20'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                KR
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Karthik Raja</p>
                <p className="text-[11px] text-gray-500 truncate">karthik.printers@gmail.com</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                handleQuickDemoSelect('priya.designs@gmail.com', 'Priya Sundaram');
              }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                devEmail === 'priya.designs@gmail.com'
                  ? 'border-yellow-400 bg-yellow-50/50 ring-2 ring-yellow-400/20'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                PS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Priya Sundaram</p>
                <p className="text-[11px] text-gray-500 truncate">priya.designs@gmail.com</p>
              </div>
            </button>
          </div>

          {/* Custom Google Account Entry */}
          <form onSubmit={handleDevModalSubmit} className="space-y-3 pt-2 border-t">
            <div>
              <Label htmlFor="googleEmail" className="text-xs font-bold text-gray-700 block mb-1">
                Google Account Email
              </Label>
              <TextInput
                id="googleEmail"
                type="email"
                placeholder="your.email@gmail.com"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                required
                sizing="sm"
              />
            </div>
            <div>
              <Label htmlFor="googleName" className="text-xs font-bold text-gray-700 block mb-1">
                Full Name
              </Label>
              <TextInput
                id="googleName"
                type="text"
                placeholder="e.g. John Doe"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                sizing="sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="xs" color="gray" onClick={() => setShowDevModal(false)}>
                Cancel
              </Button>
              <Button
                size="xs"
                color="dark"
                type="submit"
                disabled={loading || !devEmail}
                className="bg-black hover:bg-gray-800 font-bold"
              >
                {loading ? <Spinner size="xs" className="mr-1" /> : null}
                Confirm & Sign In
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
      )}
    </>
  );
}
