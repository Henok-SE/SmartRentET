import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Calendar, 
  User, 
  Receipt, 
  CreditCard, 
  Clock, 
  Copy, 
  Check, 
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { inquireRentalAgreement, initiatePayment, DEMO_AGREEMENTS } from '../services/paymentService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

const STEPS = [
  { id: 1, name: 'Inquiry' },
  { id: 2, name: 'Review' },
  { id: 3, name: 'Method' },
  { id: 4, name: 'Confirm' },
];

export default function PayRentPage() {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [referenceInput, setReferenceInput] = useState(initialRef);
  const [inquiryResult, setInquiryResult] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('TELEBIRR');
  const [paymentResult, setPaymentResult] = useState(null);

  // Status & Error state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDemoModeNotice, setIsDemoModeNotice] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-inquire if query param exists on mount
  useEffect(() => {
    if (initialRef && initialRef.trim().length >= 5) {
      handleInquiry(initialRef.trim());
    }
  }, [initialRef]);

  // Handle Inquiry API call
  const handleInquiry = async (refToQuery) => {
    const ref = (refToQuery || referenceInput).trim();
    if (!ref) {
      setErrorMsg('Please enter a valid rental reference number.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setIsDemoModeNotice(false);

    try {
      const response = await inquireRentalAgreement(ref);
      if (response.success && response.data) {
        setInquiryResult(response.data);
        setIsDemoModeNotice(Boolean(response.isDemoData));
        setCurrentStep(2); // Advance to Review step
      } else {
        setErrorMsg('Unable to retrieve agreement information for this reference.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Agreement reference not found or backend service is unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Payment Initiation API call
  const handleConfirmPayment = async () => {
    if (!inquiryResult) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        referenceNumber: inquiryResult.referenceNumber,
        amount: inquiryResult.amount,
        paymentMethod: selectedMethod,
        customerName: inquiryResult.customerName,
        customerPhoneNumber: inquiryResult.customerPhoneNumber,
      };

      const response = await initiatePayment(payload);
      if (response.success && response.data) {
        setPaymentResult(response.data);
        setCurrentStep(5); // Receipt state
      } else {
        setErrorMsg('Payment initiation could not be completed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick reset
  const handleReset = () => {
    setCurrentStep(1);
    setReferenceInput('');
    setInquiryResult(null);
    setSelectedMethod('TELEBIRR');
    setPaymentResult(null);
    setErrorMsg('');
    setIsDemoModeNotice(false);
  };

  const handleCopyTx = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="primary" size="md" dot>
              Simulated Payment Rail
            </Badge>
            <span className="text-xs font-semibold text-slate-500">
              Telebirr & CBE Utility Architecture
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pay Your Rent
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-lg mx-auto">
            Inquire your rental agreement with your official reference code and initiate payment via Telebirr or CBE.
          </p>
        </div>

        {/* Step Progress Bar (Steps 1 to 4) */}
        {currentStep <= 4 && (
          <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              {STEPS.map((s, idx) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;

                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                      </div>
                      <span
                        className={`text-[11px] font-medium mt-1.5 ${
                          isActive ? 'text-brand-700 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {s.name}
                      </span>
                    </div>

                    {idx < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 transition-colors ${
                          currentStep > s.id ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Demo Mode Notice Alert */}
        {isDemoModeNotice && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <span className="font-semibold">Simulated Demo Environment:</span> The agreement data was populated using the standard SmartRent test fixture while the backend service is being reached.
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="font-semibold">Unable to proceed</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            STEP 1: INQUIRY (ENTER REFERENCE NUMBER)
           ------------------------------------------------------------- */}
        {currentStep === 1 && (
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-md">
            <form onSubmit={(e) => { e.preventDefault(); handleInquiry(); }} className="space-y-6 text-left">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Rental Reference Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referenceInput}
                    onChange={(e) => {
                      setReferenceInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. AGR-2026-X0MTKL6A"
                    className="w-full uppercase font-mono text-base px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This identifier is provided on your SmartRent tenancy contract or SMS registration notification.
                </p>
              </div>

              {/* Quick Demo Pre-fills for Testing */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <span className="font-semibold text-slate-700 block mb-1.5">
                  Sample Demo References:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceInput('AGR-2026-X0MTKL6A');
                      setErrorMsg('');
                    }}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-brand-700 font-mono font-medium hover:border-brand-300 hover:bg-brand-50"
                  >
                    AGR-2026-X0MTKL6A (betselot Wodere - 12,000 ETB)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceInput('AGR-2026-KZ9210B4');
                      setErrorMsg('');
                    }}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-brand-700 font-mono font-medium hover:border-brand-300 hover:bg-brand-50"
                  >
                    AGR-2026-KZ9210B4 (Helina Tadesse - 8,500 ETB)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="xl"
                  className="w-full"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Continue
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* -------------------------------------------------------------
            STEP 2: REVIEW AGREEMENT INFORMATION
           ------------------------------------------------------------- */}
        {currentStep === 2 && inquiryResult && (
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-md text-left space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rental Agreement</span>
                <h3 className="text-xl font-extrabold text-slate-900 font-mono">
                  {inquiryResult.referenceNumber}
                </h3>
              </div>
              <Badge variant="success" size="lg" dot>
                Verified Lease
              </Badge>
            </div>

            {/* Main Rent Highlight */}
            <div className="bg-gradient-to-br from-brand-50 to-emerald-50/50 p-5 rounded-2xl border border-brand-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-900 uppercase tracking-wider">Amount Due</p>
                <p className="text-3xl font-extrabold text-brand-700 mt-0.5">
                  {formatCurrency(inquiryResult.amount, inquiryResult.currency || 'ETB')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Due Date</p>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-end mt-0.5">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  {formatDate(inquiryResult.dueDate)}
                </p>
              </div>
            </div>

            {/* Customer & Lease Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Tenant / Customer Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {inquiryResult.customerName || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Phone Number</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                  {inquiryResult.customerPhoneNumber || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                <span className="text-xs text-slate-500 block">Description / Property</span>
                <span className="text-slate-800 mt-0.5 block font-medium">
                  {inquiryResult.description || 'Monthly residential rental payment'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setCurrentStep(1)}
              >
                Change Reference
              </Button>

              <Button
                variant="primary"
                size="lg"
                className="w-full sm:flex-1"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setCurrentStep(3)}
              >
                Continue to Payment
              </Button>
            </div>
          </Card>
        )}

        {/* -------------------------------------------------------------
            STEP 3: PAYMENT METHOD SELECTION
           ------------------------------------------------------------- */}
        {currentStep === 3 && inquiryResult && (
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-md text-left space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900">
                Select Payment Method
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose the digital channel you wish to use for this rental payment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Telebirr */}
              <div
                onClick={() => setSelectedMethod('TELEBIRR')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  selectedMethod === 'TELEBIRR'
                    ? 'border-[#0072CE] bg-sky-50/40 ring-2 ring-[#0072CE]/20 shadow-sm'
                    : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/50 bg-white'
                }`}
              >
                {/* Brand top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-opacity ${
                  selectedMethod === 'TELEBIRR' ? 'bg-gradient-to-r from-[#0072CE] via-[#00A3FF] to-[#F8B700] opacity-100' : 'opacity-0'
                }`} />

                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0072CE] text-white shadow-xs">
                    <span className="font-extrabold text-xs tracking-wide">telebirr</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F8B700]"></span>
                  </div>
                  
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedMethod === 'TELEBIRR' ? 'border-[#0072CE] bg-[#0072CE] text-white' : 'border-slate-300'
                  }`}>
                    {selectedMethod === 'TELEBIRR' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">Telebirr SuperApp / USSD</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ethio telecom mobile wallet & digital payment service.
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Provider:</span>
                  <span className="font-semibold text-[#0072CE]">Ethio telecom</span>
                </div>
              </div>

              {/* Option 2: CBE (Commercial Bank of Ethiopia) */}
              <div
                onClick={() => setSelectedMethod('CBE')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  selectedMethod === 'CBE'
                    ? 'border-[#6A1A5B] bg-purple-50/40 ring-2 ring-[#6A1A5B]/20 shadow-sm'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50/50 bg-white'
                }`}
              >
                {/* Brand top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-opacity ${
                  selectedMethod === 'CBE' ? 'bg-gradient-to-r from-[#6A1A5B] via-[#8E24AA] to-[#E5A823] opacity-100' : 'opacity-0'
                }`} />

                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6A1A5B] text-white shadow-xs">
                    <span className="font-extrabold text-xs tracking-wide">CBE Birr</span>
                    <span className="text-[10px] text-[#E5A823] font-bold">★</span>
                  </div>
                  
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedMethod === 'CBE' ? 'border-[#6A1A5B] bg-[#6A1A5B] text-white' : 'border-slate-300'
                  }`}>
                    {selectedMethod === 'CBE' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">Commercial Bank of Ethiopia</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  CBE Birr & CBE Mobile Banking payments.
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Provider:</span>
                  <span className="font-semibold text-[#6A1A5B]">CBE Direct Banking</span>
                </div>
              </div>
            </div>

            {/* Provider Notice */}
            <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 transition-colors ${
              selectedMethod === 'TELEBIRR'
                ? 'bg-sky-50/80 border-sky-200 text-sky-950'
                : 'bg-purple-50/80 border-purple-200 text-purple-950'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Info className={`w-4 h-4 shrink-0 ${selectedMethod === 'TELEBIRR' ? 'text-[#0072CE]' : 'text-[#6A1A5B]'}`} />
                <span>Utility Flow Simulation Notice ({selectedMethod === 'TELEBIRR' ? 'Telebirr Rail' : 'CBE Rail'}):</span>
              </div>
              <p className={selectedMethod === 'TELEBIRR' ? 'text-sky-900' : 'text-purple-900'}>
                In the production system, this payment will be initiated directly inside the {selectedMethod === 'TELEBIRR' ? 'Telebirr Mini-App' : 'CBE mobile banking portal'} with native biometric or PIN authorization.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setCurrentStep(2)}
              >
                Back
              </Button>

              <Button
                variant="primary"
                size="lg"
                className="w-full sm:flex-1"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setCurrentStep(4)}
              >
                Continue to Confirmation
              </Button>
            </div>
          </Card>
        )}

        {/* -------------------------------------------------------------
            STEP 4: CONFIRM RENTAL PAYMENT
           ------------------------------------------------------------- */}
        {currentStep === 4 && inquiryResult && (
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-md text-left space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 4 of 4</span>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Confirm Rental Payment
              </h3>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Tenant:</span>
                <span className="font-bold text-slate-900">{inquiryResult.customerName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-bold text-brand-700">{inquiryResult.referenceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Payment Channel:</span>
                <div>
                  {selectedMethod === 'TELEBIRR' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0072CE] text-white text-xs font-bold shadow-xs">
                      telebirr <span className="w-1.5 h-1.5 rounded-full bg-[#F8B700]"></span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#6A1A5B] text-white text-xs font-bold shadow-xs">
                      CBE Birr <span className="text-[#E5A823]">★</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-700">Total Settlement:</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatCurrency(inquiryResult.amount, inquiryResult.currency || 'ETB')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                Backend Payment Initiation (Mocked Provider Rail)
              </div>
              <p className="text-blue-800">
                Clicking confirm will register this payment intent with the SmartRent backend API (`POST /api/payments`). It will return a <strong>PENDING</strong> status transaction reference awaiting provider callback/webhook confirmation.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setCurrentStep(3)}
                disabled={isLoading}
              >
                Back
              </Button>

              <Button
                variant="primary"
                size="xl"
                className="w-full sm:flex-1 font-bold"
                isLoading={isLoading}
                onClick={handleConfirmPayment}
                rightIcon={<Check className="w-5 h-5" />}
              >
                Confirm Payment
              </Button>
            </div>
          </Card>
        )}

        {/* -------------------------------------------------------------
            STEP 5: PENDING TRANSACTION RECEIPT / RESULT SCREEN
           ------------------------------------------------------------- */}
        {currentStep === 5 && paymentResult && (
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-xl text-left space-y-6 animate-fadeIn">
            
            {/* Status Header */}
            <div className="text-center pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 ring-8 ring-blue-50">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              
              <Badge variant="pending" size="lg" dot className="mb-2">
                PAYMENT INITIATED • PENDING CONFIRMATION
              </Badge>

              <h2 className="text-2xl font-extrabold text-slate-900">
                Rental Payment Initiated
              </h2>

              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Your payment request has been registered in the SmartRent ET registry. Final settlement will be confirmed once the {selectedMethod === 'TELEBIRR' ? 'Telebirr' : 'CBE'} provider webhook is processed.
              </p>
            </div>

            {/* Transaction Receipt Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3.5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">Transaction Reference</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {paymentResult.transactionReference || paymentResult.paymentId || paymentResult.id || 'TXN-PENDING-REF'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyTx(paymentResult.transactionReference || paymentResult.paymentId || paymentResult.id || '')}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy Transaction Reference"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Rental Reference</span>
                  <span className="font-mono font-bold text-brand-700 mt-0.5 block">
                    {paymentResult.referenceNumber || inquiryResult.referenceNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payer / Tenant</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {paymentResult.customerName || inquiryResult.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Channel</span>
                  <div className="mt-1">
                    {(paymentResult.provider === 'TELEBIRR' || paymentResult.paymentMethod === 'TELEBIRR' || paymentResult.paymentMethod === 'MOBILE_MONEY' || selectedMethod === 'TELEBIRR') ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0072CE] text-white text-[11px] font-bold">
                        telebirr <span className="w-1 h-1 rounded-full bg-[#F8B700]"></span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#6A1A5B] text-white text-[11px] font-bold">
                        CBE Birr <span className="text-[#E5A823]">★</span>
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Initiated Timestamp</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDateTime(paymentResult.initiatedAt || new Date().toISOString())}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-700 text-sm">Amount:</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatCurrency(paymentResult.amount || inquiryResult.amount, paymentResult.currency || 'ETB')}
                </span>
              </div>
            </div>

            {/* Architecture Explanatory Box */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block">
                Lifecycle Explanation (For Developers & Stakeholders)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="block font-bold text-emerald-700 text-[11px]">1. Initiated</span>
                  <span className="text-[10px] text-slate-500">API intent recorded</span>
                </div>
                <div className="p-2 rounded bg-blue-50 border border-blue-200">
                  <span className="block font-bold text-blue-700 text-[11px]">2. Pending</span>
                  <span className="text-[10px] text-blue-600">Awaiting Provider</span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 opacity-60">
                  <span className="block font-bold text-slate-600 text-[11px]">3. Paid</span>
                  <span className="text-[10px] text-slate-500">Via signed callback</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-1/2"
                onClick={handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Pay Another Rent
              </Button>

              <Link to="/" className="w-full sm:w-1/2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Return to Portal Home
                </Button>
              </Link>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
