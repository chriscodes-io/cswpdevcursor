import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { paymentsAPI } from '../lib/api';

const StripeCheckout = ({ paymentToast, onClear }) => {
  if (!paymentToast) return null;

  const getStatusIcon = () => {
    switch (paymentToast.status) {
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 flex-shrink-0" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      default:
        return <CheckCircle2 className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStatusStyles = () => {
    switch (paymentToast.status) {
      case 'paid':
        return 'bg-[#00FF9D]/10 border-[#00FF9D]/40 text-[#00FF9D]';
      case 'expired':
        return 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400';
      default:
        return 'bg-[#1a1a1a] border-[#2a2a2a] text-white';
    }
  };

  const getStatusMessage = () => {
    switch (paymentToast.status) {
      case 'paid':
        return 'Payment successful!';
      case 'expired':
        return 'Payment session expired.';
      case 'pending':
        return 'Payment processing...';
      default:
        return 'Payment error. Please try again.';
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 border max-w-sm shadow-lg rounded ${getStatusStyles()}`}
      data-testid="payment-toast"
    >
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusMessage()}</span>
      {paymentToast.status !== 'pending' && (
        <button
          onClick={onClear}
          className="ml-auto text-xs font-semibold hover:opacity-80"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default StripeCheckout;
