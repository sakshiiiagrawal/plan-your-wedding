import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface OnboardSuccessProps {
  brideName: string;
  groomName: string;
  slug: string;
  email: string;
}

export default function OnboardSuccess({ brideName, groomName, slug, email }: OnboardSuccessProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-6xl"
      >
        🎉
      </motion.div>

      <div>
        <h2 className="font-script text-5xl text-maroon-800 mb-2">
          {brideName} &amp; {groomName}
        </h2>
        <p className="text-xl text-gray-600 font-display">Your wedding planner is ready!</p>
      </div>

      <p className="text-gray-500">
        Your account has been created and your wedding website is live. What would you like to do
        first?
      </p>

      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 max-w-sm mx-auto">
        We&apos;ve sent a verification link to <b>{email}</b> — please click it to secure your
        account. (Check spam if it doesn&apos;t arrive; you can resend it from Settings.)
      </p>

      <p className="text-sm text-gray-400 max-w-sm mx-auto">
        Planning together? Invite your partner (as an admin), family, or wedding planner from{' '}
        <button
          onClick={() => navigate(`/${slug}/dashboard/settings`)}
          className="text-maroon-700 underline"
        >
          Settings → Members
        </button>{' '}
        — everyone works on this same wedding.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button onClick={() => navigate(`/${slug}`)} className="btn-secondary px-8 py-3">
          View Wedding Website
        </button>
        <button onClick={() => navigate(`/${slug}/dashboard`)} className="btn-primary px-8 py-3">
          Go to Planner →
        </button>
      </div>
    </motion.div>
  );
}
