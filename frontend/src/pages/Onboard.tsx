import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useCreateWedding } from '../hooks/useApi';

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

/**
 * Two shapes of the same wizard:
 *  - default (/onboard): the signup funnel. Couples get account + wedding in
 *    one pass (register, then POST /weddings — split API, single flow);
 *    partners/helpers get an account-only signup and land on /hub.
 *  - createOnly (/weddings/new): a logged-in user adding a(nother) wedding —
 *    just the wedding-details and review steps, no account screens.
 */
export default function Onboard({ createOnly = false }: { createOnly?: boolean }) {
  const { user, register, isAuthenticated, slug, loading } = useAuth();
  const createWedding = useCreateWedding();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  // Set once register() succeeds mid-submit: a slug conflict on the wedding
  // call must not re-register (and re-fail) on retry.
  const [accountCreated, setAccountCreated] = useState(false);

  // Already signed in → leave the signup wizard (accounts without a wedding
  // live on /hub, which links back to /weddings/new). Only bounce from the
  // welcome screen so a submit-in-progress or retry isn't yanked away.
  useEffect(() => {
    if (createOnly || loading || !isAuthenticated || successSlug || submitting) return;
    if (step !== 1 || accountCreated) return;
    navigate(slug ? `/${slug}/dashboard` : '/hub', { replace: true });
  }, [
    createOnly,
    loading,
    isAuthenticated,
    slug,
    successSlug,
    submitting,
    step,
    accountCreated,
    navigate,
  ]);

  // createOnly requires a session — it's reached from the hub/switcher.
  useEffect(() => {
    if (createOnly && !loading && !isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent('/weddings/new')}`, { replace: true });
    }
  }, [createOnly, loading, isAuthenticated, navigate]);

  // 'couple' creates a wedding + website; 'collaborator' (planner / family /
  // friend) and 'partner' (spouse whose partner already started planning)
  // both create an account-only signup — they join weddings via invites.
  // 'partner' differs only in where it lands afterwards (a nudge to ask
  // their partner for an invite, rather than the generic invites empty state).
  const [mode, setMode] = useState<'couple' | 'collaborator' | 'partner'>('couple');
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
      if (!createOnly && !isAuthenticated && !accountCreated) {
        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        setAccountCreated(true);
      }
      const wedding = await createWedding.mutateAsync({
        slug: formData.slug,
        brideName: formData.brideName,
        groomName: formData.groomName,
        ...(formData.weddingDate ? { weddingDate: formData.weddingDate } : {}),
      });
      setSuccessSlug(wedding.slug);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCollaboratorSubmit = async (values: {
    name: string;
    email: string;
    password: string;
  }) => {
    setSubmitting(true);
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
        accountType: 'collaborator',
      });
      toast.success('Account created!');
      navigate(mode === 'partner' ? '/hub?partner=1' : '/hub', { replace: true });
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // createOnly: details → review. Couple: welcome → details → account → review.
  const STEPS = createOnly ? 2 : mode === 'collaborator' || mode === 'partner' ? 2 : 4;
  const detailsStep = createOnly ? 1 : 2;
  const reviewStep = createOnly ? 2 : 4;

  if (createOnly && (loading || !isAuthenticated)) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="font-script text-3xl text-cream">
            {createOnly ? 'Plan a New Wedding' : 'Wedding Planner Setup'}
          </p>
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
                email={createOnly ? '' : formData.email}
              />
            ) : !createOnly && step === 1 ? (
              <Step1_Welcome
                key="step1"
                onNext={() => {
                  setMode('couple');
                  setStep(2);
                }}
                onCollaborator={() => {
                  setMode('collaborator');
                  setStep(2);
                }}
                onPartner={() => {
                  setMode('partner');
                  setStep(2);
                }}
              />
            ) : !createOnly && (mode === 'collaborator' || mode === 'partner') ? (
              <Step3_Account
                key="collab-account"
                data={{
                  name: formData.name,
                  email: formData.email,
                  password: formData.password,
                  confirmPassword: formData.confirmPassword,
                }}
                submitting={submitting}
                nextLabel="Create account →"
                onNext={(v) => {
                  mergeData(v);
                  void handleCollaboratorSubmit(v);
                }}
                onBack={() => setStep(1)}
              />
            ) : step === detailsStep ? (
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
                  setStep(detailsStep + 1);
                }}
                onBack={createOnly ? () => navigate('/hub') : () => setStep(1)}
              />
            ) : !createOnly && step === 3 ? (
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
            ) : step === reviewStep ? (
              <Step4_Review
                key="step4"
                data={
                  createOnly
                    ? { ...formData, name: user?.name ?? '', email: user?.email ?? '' }
                    : formData
                }
                onSubmit={handleSubmit}
                onBack={() => setStep(reviewStep - 1)}
                loading={submitting}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
