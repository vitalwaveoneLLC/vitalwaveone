// ─────────────────────────────────────────────────────────────────────────────
// StripePaymentModal.jsx
// Drop this component into your App.jsx — real card payment modal
//
// SETUP STEPS:
// 1. npm install @stripe/stripe-js @stripe/react-stripe-js
// 2. Add to .env:  VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
// 3. Add to Vercel env vars: VITE_STRIPE_PUBLISHABLE_KEY
// 4. Deploy Supabase edge function (see smooth-responder/index.ts)
// 5. Import and use <StripePaymentModal> in App.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { db } from "./db";

// Load Stripe once outside component
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CARD_FEE_PCT = 3;

// ── INNER FORM (uses Stripe hooks — must be inside <Elements>) ────────────────
function CheckoutForm({ amount, surcharge, total, invoiceId, customerId, customerName, driverName, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    // Confirm payment
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      onSuccess({
        paymentIntentId: paymentIntent.id,
        amount: total,
        surcharge,
        method: "credit_card",
      });
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Amount breakdown */}
      <div style={{
        background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,
        padding:"14px 16px",marginBottom:18,
      }}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:13,color:"#6b7280"}}>Invoice amount</span>
          <span style={{fontSize:13}}>${amount.toFixed(2)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:13,color:"#7c3aed"}}>Card surcharge ({CARD_FEE_PCT}%)</span>
          <span style={{fontSize:13,color:"#7c3aed"}}>+${surcharge.toFixed(2)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #e5e7eb"}}>
          <span style={{fontSize:14,fontWeight:700}}>Total charged to card</span>
          <span style={{fontSize:16,fontWeight:700,color:"#7c3aed"}}>${total.toFixed(2)}</span>
        </div>
        <div style={{marginTop:8,fontSize:11,color:"#9ca3af"}}>
          Customer: {customerName} · Invoice: {invoiceId}
        </div>
      </div>

      {/* Stripe payment element — card form */}
      <div style={{marginBottom:18}}>
        <PaymentElement options={{
          layout: "tabs",
          fields: { billingDetails: { name: "auto" } },
        }}/>
      </div>

      {error && (
        <div style={{
          background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,
          padding:"10px 14px",marginBottom:14,fontSize:13,color:"#dc2626",
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{display:"flex",gap:8}}>
        <button type="button" onClick={onCancel}
          style={{flex:1,padding:"12px",border:"1px solid #d1d5db",borderRadius:8,background:"#fff",
          color:"#6b7280",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
          Cancel
        </button>
        <button type="submit" disabled={!stripe||processing}
          style={{flex:2,padding:"12px",border:"none",borderRadius:8,
          background:processing?"#c4b5fd":"#7c3aed",color:"#fff",fontSize:13,fontWeight:700,
          cursor:processing?"not-allowed":"pointer",fontFamily:"'Barlow Condensed',sans-serif",
          letterSpacing:".06em",textTransform:"uppercase",display:"flex",alignItems:"center",
          justifyContent:"center",gap:8}}>
          {processing ? (
            <>
              <svg style={{animation:"spin .8s linear infinite"}} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Processing…
            </>
          ) : `Pay $${total.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

// ── MAIN STRIPE MODAL ─────────────────────────────────────────────────────────
export default function StripePaymentModal({
  sale,           // the sale/invoice object
  customer,       // customer object
  driver,         // driver name string
  taxRate,        // kept for compatibility but tax is pre-calculated
  saleTax,        // pre-calculated tobacco-only tax amount
  onSuccess,      // called with payment details on success
  onClose,        // called to close modal
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use pre-calculated tobacco-only tax if provided, otherwise fall back
  const invoiceTotal = sale.total + (saleTax !== undefined ? saleTax : 0);
  const surcharge = parseFloat((invoiceTotal * CARD_FEE_PCT / 100).toFixed(2));
  const chargeTotal = parseFloat((invoiceTotal + surcharge).toFixed(2));

  // Create PaymentIntent on mount
  useEffect(() => {
    const create = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

        const res = await fetch(
          `${API_BASE}/payments/create-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: chargeTotal,
              currency: "usd",
              metadata: {
                invoice_id: sale.id,
                customer_name: customer?.name || "",
                driver: driver || "",
                surcharge: surcharge.toString(),
              },
            }),
          }
        );

        const data = await res.json();
        if (data?.error) throw new Error(data.error);
        if (!data?.clientSecret) throw new Error("No client secret returned — check STRIPE_SECRET_KEY in backend");
        setClientSecret(data.clientSecret);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    };
    create();
  }, []);

  const stripeOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#7c3aed",
        colorBackground: "#ffffff",
        colorText: "#212121",
        colorDanger: "#dc2626",
        fontFamily: "Barlow, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  } : null;

  return (
    <div style={{
      position:"fixed",inset:0,background:"#00000050",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:400,padding:16,
      backdropFilter:"blur(6px)",
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,
        padding:26,maxWidth:480,width:"100%",boxShadow:"0 8px 40px #00000020",
      }}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:18,textTransform:"uppercase",letterSpacing:".04em",color:"#212121"}}>
              💳 Card Payment
            </div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>
              Invoice {sale.id} · {customer?.name}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#6b7280",fontSize:13}}>✕</button>
        </div>

        {loading && (
          <div style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>
            <div style={{fontSize:13}}>Connecting to payment processor…</div>
          </div>
        )}

        {error && (
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"14px",color:"#dc2626",fontSize:13}}>
            <strong>Error:</strong> {error}
            <br/>
            <span style={{fontSize:11,color:"#9ca3af",marginTop:4,display:"block"}}>
              Make sure the backend is running and STRIPE_SECRET_KEY is configured.
            </span>
          </div>
        )}

        {clientSecret && stripeOptions && (
          <Elements stripe={stripePromise} options={stripeOptions}>
            <CheckoutForm
              amount={invoiceTotal}
              surcharge={surcharge}
              total={chargeTotal}
              invoiceId={sale.id}
              customerId={customer?.id}
              customerName={customer?.name}
              driverName={driver}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}

        <div style={{marginTop:14,textAlign:"center",fontSize:10,color:"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Secured by Stripe · PCI compliant · Card details never touch our servers
        </div>
      </div>
    </div>
  );
}
