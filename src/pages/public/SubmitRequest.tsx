import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  DollarSign,
  User,
  Package,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useCategories } from '@/features/categories';
import { useActiveCurrencies } from '@/features/currencies';
import { useSubscriptionRequests } from '@/features/requests';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Id } from '../../../convex/_generated/dataModel';

const steps = [
  { id: 1, title: 'Subscription Details', icon: Package },
  { id: 2, title: 'Cost & Requester', icon: DollarSign },
  { id: 3, title: 'Review & Submit', icon: Check },
];

type BillingCycle = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

export default function SubmitRequest() {
  const navigate = useNavigate();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { currencies, isLoading: currenciesLoading } = useActiveCurrencies();
  const { submit } = useSubscriptionRequests();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedReferenceNumber, setSubmittedReferenceNumber] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: '',
    categoryId: '',
    cost: '',
    currencyId: '',
    billingCycle: 'monthly' as BillingCycle,
    requestedBy: '',
    requesterEmail: '',
    requesterDepartment: '',
    justification: '',
  });

  // Set default currency when currencies load
  useEffect(() => {
    if (currencies && currencies.length > 0 && !formData.currencyId) {
      const inr = currencies.find(c => c.code === 'INR');
      if (inr) {
        setFormData(prev => ({ ...prev, currencyId: inr._id }));
      }
    }
  }, [currencies, formData.currencyId]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.description && formData.provider && formData.categoryId;
      case 2:
        return (
          formData.cost &&
          formData.requestedBy &&
          formData.requesterEmail &&
          formData.requesterDepartment &&
          formData.justification
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submit({
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        categoryId: formData.categoryId as Id<"categories">,
        cost: parseFloat(formData.cost),
        currencyId: formData.currencyId as Id<"currencies">,
        billingCycle: formData.billingCycle,
        requestedBy: formData.requestedBy,
        requesterEmail: formData.requesterEmail,
        requesterDepartment: formData.requesterDepartment,
        justification: formData.justification,
      });

      setSubmittedReferenceNumber(result.referenceNumber);
      setIsSuccess(true);
      toast.success('Request submitted successfully!', {
        description: `Reference: ${result.referenceNumber}`,
      });
    } catch (error) {
      toast.error('Failed to submit request', {
        description: 'Please try again later.',
      });
    }
    setIsSubmitting(false);
  };

  const selectedCategory = categories?.find((c) => c._id === formData.categoryId);
  const selectedCurrency = currencies?.find((c) => c._id === formData.currencyId);

  const isLoading = categoriesLoading || currenciesLoading;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-12"
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
        <p className="text-gray-500 mb-6">
          Your subscription request has been submitted for review.
        </p>
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Reference Number</p>
          <p className="text-xl font-mono font-bold text-gray-900">{submittedReferenceNumber}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
            Go to Dashboard
          </Button>
          <Button onClick={() => navigate('/subscriptions')} className="flex-1">
            View Subscriptions
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Submit Subscription Request
        </h1>
        <p className="text-gray-500 mt-1">
          Request a new subscription for your team
        </p>
      </div>

      {/* Reference Number Info */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Request Information</p>
              <p className="text-sm text-blue-900">Reference number will be generated upon submission</p>
            </div>
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
        </CardContent>
      </Card>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={`flex flex-col items-center ${
                  step.id === currentStep
                    ? 'text-blue-600'
                    : step.id < currentStep
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    step.id === currentStep
                      ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-600/20'
                      : step.id < currentStep
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </div>
                <span className="text-xs mt-2 font-medium hidden sm:block">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 md:mx-4 rounded-full ${
                    step.id < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-slate-200/60">
            <CardContent className="p-5 md:p-6">
              {/* Step 1: Subscription Details */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Subscription Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Figma Professional"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="What is this subscription for?"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="mt-1.5 rounded-xl min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider" className="text-sm font-medium">
                      Provider <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="provider"
                      placeholder="e.g., Figma Inc."
                      value={formData.provider}
                      onChange={(e) => updateField('provider', e.target.value)}
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                      {categories?.map((category) => (
                        <button
                          key={category._id}
                          onClick={() => updateField('categoryId', category._id)}
                          className={`p-3 md:p-4 rounded-xl border-2 text-left transition-all ${
                            formData.categoryId === category._id
                              ? 'border-blue-600 bg-blue-50 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className="w-6 h-6 md:w-8 md:h-8 rounded-lg mb-2"
                            style={{ backgroundColor: category.color }}
                          />
                          <p className="font-medium text-gray-900 text-sm">{category.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Cost & Requester */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost" className="text-sm font-medium">
                        Cost <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cost"
                        type="number"
                        placeholder="e.g., 450"
                        value={formData.cost}
                        onChange={(e) => updateField('cost', e.target.value)}
                        className="mt-1.5 h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                      <Select
                        value={formData.currencyId}
                        onValueChange={(value) => updateField('currencyId', value)}
                      >
                        <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies?.map((currency) => (
                            <SelectItem key={currency._id} value={currency._id}>
                              {currency.code} ({currency.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="billingCycle" className="text-sm font-medium">
                      Billing Cycle <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.billingCycle}
                      onValueChange={(value) => updateField('billingCycle', value)}
                    >
                      <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-t border-slate-200 pt-5">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Your Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="requestedBy" className="text-sm font-medium">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="requestedBy"
                          placeholder="e.g., John Doe"
                          value={formData.requestedBy}
                          onChange={(e) => updateField('requestedBy', e.target.value)}
                          className="mt-1.5 h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="requesterEmail" className="text-sm font-medium">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="requesterEmail"
                          type="email"
                          placeholder="e.g., john@company.com"
                          value={formData.requesterEmail}
                          onChange={(e) => updateField('requesterEmail', e.target.value)}
                          className="mt-1.5 h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="requesterDepartment" className="text-sm font-medium">
                          Department <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="requesterDepartment"
                          placeholder="e.g., Engineering"
                          value={formData.requesterDepartment}
                          onChange={(e) => updateField('requesterDepartment', e.target.value)}
                          className="mt-1.5 h-11 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="justification" className="text-sm font-medium">
                      Justification <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="justification"
                      placeholder="Why do you need this subscription? How will it benefit the team/organization?"
                      rows={4}
                      value={formData.justification}
                      onChange={(e) => updateField('justification', e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Please provide a detailed justification to help with the approval process.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="bg-slate-50 rounded-xl p-4 md:p-5 space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: selectedCategory?.color + '20' }}
                      >
                        <Package className="w-6 h-6" style={{ color: selectedCategory?.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{formData.name}</p>
                        <p className="text-sm text-gray-500">{selectedCategory?.name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Provider</p>
                        <p className="font-medium">{formData.provider}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cost</p>
                        <p className="font-medium">
                          {selectedCurrency?.symbol}{formData.cost} / {formData.billingCycle}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Requested By</p>
                        <p className="font-medium">{formData.requestedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-medium">{formData.requesterDepartment}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-sm text-gray-700 mt-1">{formData.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Justification</p>
                      <p className="text-sm text-gray-700 mt-1">{formData.justification}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Your request will be reviewed by the admin team.
                      You will be notified via email once a decision is made.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6 pt-6 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="rounded-xl h-11"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    className="rounded-xl h-11 bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-xl h-11 bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
