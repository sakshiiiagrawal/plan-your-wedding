import { motion } from 'framer-motion';

interface Step4Data {
  brideName: string;
  groomName: string;
  weddingDate: string;
  slug: string;
  name: string;
  email: string;
}

interface Step4Props {
  data: Step4Data;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export default function Step4_Review({ data, onSubmit, onBack, loading }: Step4Props) {
  const { brideName, groomName, weddingDate, slug, name, email } = data;
  const host = typeof window !== 'undefined' ? window.location.host : 'yourapp.com';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <h2 className="font-display text-2xl font-bold text-maroon-800 mb-1">Review & Launch</h2>
      <p className="text-gray-500 mb-6 text-sm">Everything look right?</p>

      <div className="bg-cream border border-gold-200 rounded-2xl p-6 space-y-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">The Couple</p>
          <p className="font-display font-semibold text-maroon-800 text-lg">
            {brideName} &amp; {groomName}
          </p>
        </div>
        {weddingDate && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Wedding Date</p>
            <p className="text-gray-700">
              {new Date(weddingDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}
        {slug && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Wedding URL</p>
            <p className="text-maroon-700 font-medium text-sm">
              {host}/<span className="font-bold">{slug}</span>
            </p>
          </div>
        )}
        <div className="border-t border-gold-100 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Account</p>
          <p className="text-gray-700 font-medium">{name}</p>
          <p className="text-gray-500 text-sm">{email}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="btn-secondary flex-1 py-3"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="btn-primary flex-1 py-3 disabled:opacity-50"
        >
          {loading ? 'Launching...' : 'Launch My Wedding Planner'}
        </button>
      </div>
    </motion.div>
  );
}
