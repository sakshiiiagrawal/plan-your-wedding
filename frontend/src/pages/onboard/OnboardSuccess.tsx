import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface OnboardSuccessProps {
  brideName: string;
  groomName: string;
  slug: string;
}

export default function OnboardSuccess({ brideName, groomName, slug }: OnboardSuccessProps) {
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
        Your account has been created and your wedding website is live.
        What would you like to do first?
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          onClick={() => navigate(`/${slug}`)}
          className="btn-secondary px-8 py-3"
        >
          View Wedding Website
        </button>
        <button
          onClick={() => navigate(`/${slug}/admin`)}
          className="btn-primary px-8 py-3"
        >
          Go to Admin Portal →
        </button>
      </div>
    </motion.div>
  );
}
