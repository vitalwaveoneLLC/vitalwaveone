import React, { useState, useCallback, memo } from 'react';
import './premium.css';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_demo');

const PricingCard = memo(({ plan, price, features, isEnterprise, onChoose, animationDelay, planKey }) => (
  <div className={`rounded-lg p-4 sm:p-6 flex flex-col h-full transition-all duration-500 border border-white/20 hover:border-white/40 hover:bg-white/8 bg-white/5 backdrop-blur-sm animate-slide-in`} style={{ animationDelay }}>

    {/* Badge */}
    {isEnterprise && (
      <div className="mb-3">
        <span className="text-xs font-black text-white/70 uppercase tracking-widest">⭐ Premium</span>
      </div>
    )}
    {plan === 'Professional' && (
      <div className="mb-3">
        <span className="text-xs font-black text-white/70 uppercase tracking-widest">✨ Popular</span>
      </div>
    )}

    {/* Plan Name */}
    <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 text-white">
      {plan}
    </h3>

    {/* Price */}
    <div className="mb-4 sm:mb-6">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl sm:text-4xl font-black text-white">
          ${price}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-white/50">
          /month
        </span>
      </div>
      <p className="text-xs text-white/40 font-medium">
        Billed annually
      </p>
    </div>

    {/* Features - Compact */}
    <ul className="flex-grow mb-4 space-y-1.5">
      {features.slice(0, 6).map((feature, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <span className="text-white/60 font-bold mt-0.5 flex-shrink-0 text-sm">✓</span>
          <span className="text-xs leading-tight font-medium text-white/70">
            {feature}
          </span>
        </li>
      ))}
    </ul>

    {/* Button */}
    <button
      onClick={() => onChoose(planKey)}
      className={`w-full py-2 sm:py-2.5 px-4 rounded-lg transition-all duration-300 font-black text-xs sm:text-sm uppercase tracking-wide hover:scale-105 active:scale-95 ${
        isEnterprise
          ? 'bg-white text-black hover:bg-white/90'
          : 'bg-white/10 text-white border border-white/30 hover:bg-white/20'
      }`}
    >
      Get Started
    </button>
  </div>
));

// Payment Form Component
const PaymentForm = memo(({ selectedPlan, onClose, onSuccess }) => {
  console.log('PaymentForm rendered with selectedPlan:', selectedPlan);
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('registration');
  const [formData, setFormData] = useState({
    companyName: '',
    companyLicense: '',
    companyRegistration: '',
    companyLogo: null,
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    street: '',
    buildingId: '',
    zipCode: '',
    state: '',
    documents: [],
  });

  const planPrices = {
    starter: 9900,
    professional: 29900,
    enterprise: 59900,
  };

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  }, []);

  const handleFileChange = useCallback((e) => {
    const { name, files } = e.target;
    if (files[0]) {
      if (name === 'documents') {
        setFormData(prev => ({ ...prev, documents: [...prev.documents, files[0]] }));
      } else {
        setFormData(prev => ({ ...prev, [name]: files[0] }));
      }
    }
  }, []);

  const validateRegistration = useCallback(() => {
    if (!formData.companyName) { setError('Company name is required'); return false; }
    if (!formData.ownerFirstName) { setError('Owner first name is required'); return false; }
    if (!formData.ownerLastName) { setError('Owner last name is required'); return false; }
    if (!formData.ownerEmail) { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) { setError('Invalid email'); return false; }
    if (!formData.ownerPhone) { setError('Phone is required'); return false; }
    if (!formData.street || !formData.buildingId || !formData.zipCode || !formData.state) { setError('All address fields required'); return false; }
    return true;
  }, [formData]);

  const handlePayment = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const cardElement = elements.getElement(CardElement);
      const { token } = await stripe.createToken(cardElement);
      if (token) {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiUrl}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: planPrices[selectedPlan], plan: selectedPlan, token: token.id, companyData: formData }),
        });
        const result = await response.json();
        if (result.success) {
          onSuccess({ plan: selectedPlan, ...formData });
          onClose();
        } else {
          setError(result.error || 'Payment failed');
        }
      }
    } catch (err) {
      setError('Payment error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-black rounded-xl p-8 max-w-2xl w-full border border-white/20 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-white">Complete Registration</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">✕</button>
        </div>
        {step === 'registration' && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Company Information</h3>
            <input type="text" name="companyName" placeholder="Company Name" value={formData.companyName} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <input type="text" name="companyLicense" placeholder="License Number" value={formData.companyLicense} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <input type="text" name="companyRegistration" placeholder="Registration Number" value={formData.companyRegistration} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <label className="block text-sm text-white/70 font-semibold">Company Logo</label>
            <input type="file" name="companyLogo" onChange={handleFileChange} className="w-full text-sm text-white/70" accept="image/*" />
            <h3 className="text-lg font-bold text-white mt-6">Owner/Admin Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="ownerFirstName" placeholder="First Name" value={formData.ownerFirstName} onChange={handleFormChange} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
              <input type="text" name="ownerLastName" placeholder="Last Name" value={formData.ownerLastName} onChange={handleFormChange} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            </div>
            <input type="email" name="ownerEmail" placeholder="Email" value={formData.ownerEmail} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <input type="tel" name="ownerPhone" placeholder="Phone Number" value={formData.ownerPhone} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <h3 className="text-lg font-bold text-white mt-6">Address (Separate Fields)</h3>
            <input type="text" name="street" placeholder="Street Name" value={formData.street} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <input type="text" name="buildingId" placeholder="Building/Shop ID" value={formData.buildingId} onChange={handleFormChange} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="zipCode" placeholder="ZIP Code" value={formData.zipCode} onChange={handleFormChange} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
              <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleFormChange} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none" />
            </div>
            <label className="block text-sm text-white/70 font-semibold mt-6">Upload Documents</label>
            <input type="file" name="documents" onChange={handleFileChange} multiple className="w-full text-sm text-white/70" />
            {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>}
            <button onClick={() => { if (validateRegistration()) setStep('payment'); }} className="w-full bg-white text-black py-3 rounded-lg font-black hover:bg-white/90 transition-all mt-6">
              Continue to Payment
            </button>
          </div>
        )}
        {step === 'payment' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/20 rounded-lg p-4">
              <p className="text-white/70 mb-2">Plan: <span className="text-white font-bold capitalize">{selectedPlan}</span></p>
              <p className="text-3xl font-black text-white">${(planPrices[selectedPlan] / 100).toFixed(2)}/month</p>
            </div>
            <div>
              <label className="block text-sm text-white/70 font-semibold mb-2">Card Information</label>
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <CardElement options={{ style: { base: { color: '#fff', fontSize: '16px' } } }} />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>}
            <button onClick={handlePayment} disabled={loading || !stripe} className="w-full bg-white text-black py-3 rounded-lg font-black hover:bg-white/90 transition-all disabled:opacity-50">
              {loading ? 'Processing...' : `Pay $${(planPrices[selectedPlan] / 100).toFixed(2)}`}
            </button>
            <button onClick={() => setStep('registration')} className="w-full border border-white/20 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors text-white">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const SignupModal = memo(({ isOpen, onClose, selectedPlan }) => {
  console.log('🟢 SignupModal rendered, isOpen:', isOpen, 'selectedPlan:', selectedPlan);
  if (!isOpen) return null;
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm selectedPlan={selectedPlan} onClose={onClose} onSuccess={(data) => {
        console.log('Registration complete:', data);
        alert('✅ Company created! Please login.');
        window.location.href = '/login';
      }} />
    </Elements>
  );
});

export default memo(function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleOpenModal = useCallback((plan) => {
    console.log('🔵 handleOpenModal called with plan:', plan);
    setSelectedPlan(plan);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedPlan(null);
  }, []);

  const plans = [
    {
      planKey: 'starter',
      plan: 'Starter',
      price: '99',
      isEnterprise: false,
      features: ['Up to 5 Team Members', 'Basic Inventory Management', 'Simple Invoice Generation', 'Email Support', '5GB Cloud Storage', 'Basic Reporting']
    },
    {
      planKey: 'professional',
      plan: 'Professional',
      price: '299',
      isEnterprise: false,
      features: ['Up to 20 Team Members', 'Advanced Inventory Tracking', 'Full Invoice Suite', 'GPS Fleet Tracking', 'Financial Dashboard', 'Priority Email Support', '50GB Cloud Storage', 'Custom Reports']
    },
    {
      planKey: 'enterprise',
      plan: 'Enterprise',
      price: '599',
      isEnterprise: true,
      features: ['Unlimited Team Members', 'Real-time Inventory Sync', 'Advanced Invoicing & Payments', 'Full Fleet Management Suite', 'AI-Powered Analytics', 'Biometric Authentication', 'Dedicated Account Manager', '24/7 Premium Support', 'Unlimited Cloud Storage', 'Custom Integrations', 'API Access', 'White-label Solutions']
    }
  ];

  return (
    <div className="bg-black text-white h-screen overflow-hidden flex flex-col">
      <header className="w-full bg-black/40 backdrop-blur-xl border-b border-white/10 z-50 flex-shrink-0">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <h1 className="text-lg sm:text-2xl font-black text-white">VitalWaveOne</h1>
          <button onClick={() => handleOpenModal('starter')} className="bg-white text-black px-4 sm:px-6 py-2 rounded font-black hover:bg-white/90 transition-all active:scale-95 uppercase text-xs tracking-wide">
            Get Started
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col">
        <section className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-5xl">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight tracking-tight mb-6 sm:mb-8 text-center">
              Wholesale Excellence
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-white/70 max-w-2xl mx-auto font-semibold mb-6 sm:mb-8">
              Choose your perfect plan. All include 14-day free trial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <button onClick={() => handleOpenModal('starter')} className="bg-white text-black px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-black hover:bg-white/90 transition-all active:scale-95 uppercase text-xs sm:text-sm tracking-wide">
                Get Started
              </button>
            </div>
            <p className="text-white/50 text-xs sm:text-sm font-medium text-center">
              No credit card required
            </p>
          </div>
        </section>

        <section className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-center min-h-0">
          <div className="w-full max-w-3xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-max">
              {plans.map((plan, idx) => (
                <PricingCard key={idx} {...plan} onChoose={handleOpenModal} animationDelay={`${idx * 0.15}s`} />
              ))}
            </div>
            <div className="text-center mt-4 sm:mt-6 pt-4 border-t border-white/10">
              <div className="flex justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm font-semibold text-white/60 flex-wrap">
                <div>✓ No Credit Card</div>
                <div>✓ Cancel Anytime</div>
                <div>✓ 30-Day Guarantee</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SignupModal isOpen={showModal} onClose={handleCloseModal} selectedPlan={selectedPlan} />

      <footer className="border-t border-white/10 py-3 sm:py-4 px-4 sm:px-6 bg-black flex-shrink-0 text-center text-white/40 text-xs sm:text-sm">
        <p>Copyright 2026 VitalWaveOne. All rights reserved.</p>
      </footer>

      <footer className="border-t border-white/10 py-12 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-8">
            <div>
              <h3 className="font-black text-lg mb-4 text-white">VitalWaveOne</h3>
              <p className="text-white/50 text-sm font-medium">Wholesale platform built for scale.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Product</h4>
              <ul className="space-y-2 text-white/50 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Company</h4>
              <ul className="space-y-2 text-white/50 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Support</h4>
              <ul className="space-y-2 text-white/50 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Portals</h4>
              <ul className="space-y-2 text-white/50 text-sm font-medium">
                <li><a href="/admin" className="hover:text-white transition">Admin Portal</a></li>
                <li><a href="/order" className="hover:text-white transition">Order Portal</a></li>
                <li><a href="/login" className="hover:text-white transition">Login</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-white/40 text-sm font-medium">
            <p>Copyright 2026 VitalWaveOne. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <SignupModal isOpen={showModal} onClose={handleCloseModal} selectedPlan={selectedPlan} />
    </div>
  );
});
