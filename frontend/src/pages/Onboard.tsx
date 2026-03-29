import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

import Step1_Welcome from './onboard/Step1_Welcome';
import Step2_WeddingDetails from './onboard/Step2_WeddingDetails';
import Step4_Review from './onboard/Step4_Review';
import OnboardSuccess from './onboard/OnboardSuccess';
import Step3_Account from './onboard/Step3_Account';

interface FormData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  slug: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Onboard() {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    brideName: '',
    groomName: '',
    weddingDate: '',
    slug: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const mergeData = (updates: Partial<FormData>) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { slug } = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        brideName: formData.brideName,
        groomName: formData.groomName,
        ...(formData.weddingDate ? { weddingDate: formData.weddingDate } : {}),
        slug: formData.slug,
      });
      setSuccessSlug(slug);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="font-script text-3xl text-cream">Wedding Planner Setup</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          {!successSlug && (
            <div className="flex justify-center gap-2 mb-8">
              {Array.from({ length: STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i + 1 < step
                      ? 'w-6 bg-maroon-800'
                      : i + 1 === step
                        ? 'w-8 bg-gold-500'
                        : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {successSlug ? (
              <OnboardSuccess
                key="success"
                brideName={formData.brideName}
                groomName={formData.groomName}
                slug={successSlug}
              />
            ) : step === 1 ? (
              <Step1_Welcome key="step1" onNext={() => setStep(2)} />
            ) : step === 2 ? (
              <Step2_WeddingDetails
                key="step2"
                data={{
                  brideName: formData.brideName,
                  groomName: formData.groomName,
                  weddingDate: formData.weddingDate,
                  slug: formData.slug,
                }}
                onNext={(v) => {
                  mergeData(v);
                  setStep(3);
                }}
                onBack={() => setStep(1)}
              />
            ) : step === 3 ? (
              <Step3_Account
                key="step3"
                data={{
                  name: formData.name,
                  email: formData.email,
                  password: formData.password,
                  confirmPassword: formData.confirmPassword,
                }}
                onNext={(v) => {
                  mergeData(v);
                  setStep(4);
                }}
                onBack={() => setStep(2)}
              />
            ) : (
              <Step4_Review
                key="step4"
                data={formData}
                onSubmit={handleSubmit}
                onBack={() => setStep(3)}
                loading={submitting}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
