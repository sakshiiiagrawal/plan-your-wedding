import { motion } from 'framer-motion';

interface Step1Props {
  onNext: () => void;
}

export default function Step1_Welcome({ onNext }: Step1Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="text-center space-y-6"
    >
      <div className="text-6xl mb-4">💍</div>
      <h2 className="font-script text-5xl text-maroon-800">Welcome!</h2>
      <p className="text-xl text-gray-600 font-display">Let&apos;s set up your wedding planner.</p>
      <p className="text-gray-500 max-w-sm mx-auto">
        This quick wizard will help you personalise your wedding website, create your account, and
        get everything ready for your big day.
      </p>
      <button onClick={onNext} className="btn-primary px-10 py-3 text-lg mt-4">
        Get Started →
      </button>
    </motion.div>
  );
}
