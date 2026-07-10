import { motion } from 'framer-motion';

interface Step1Props {
  onNext: () => void;
  onCollaborator: () => void;
  onPartner: () => void;
}

export default function Step1_Welcome({ onNext, onCollaborator, onPartner }: Step1Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="text-center space-y-5"
    >
      <div className="text-6xl mb-2">💍</div>
      <h2 className="font-script text-5xl text-maroon-800">Welcome!</h2>
      <p className="text-xl text-gray-600 font-display">Who&apos;s setting up this account?</p>

      <div className="space-y-3 text-left">
        <button
          onClick={onNext}
          className="w-full border-2 border-maroon-200 hover:border-maroon-700 rounded-xl p-4 transition-colors"
        >
          <span className="block font-display font-bold text-maroon-800">
            We&apos;re getting married 💐
          </span>
          <span className="block text-sm text-gray-500 mt-1">
            Create your wedding, its website, and your account. You can invite your partner,
            family, and planner afterwards — everyone works on the same wedding.
          </span>
        </button>

        <button
          onClick={onPartner}
          className="w-full border-2 border-maroon-200 hover:border-maroon-700 rounded-xl p-4 transition-colors"
        >
          <span className="block font-display font-bold text-maroon-800">
            My partner already started planning 💑
          </span>
          <span className="block text-sm text-gray-500 mt-1">
            Create your account, then ask your partner to invite this email from Settings →
            Members — you&apos;ll join their wedding.
          </span>
        </button>

        <button
          onClick={onCollaborator}
          className="w-full border-2 border-maroon-200 hover:border-maroon-700 rounded-xl p-4 transition-colors"
        >
          <span className="block font-display font-bold text-maroon-800">
            I&apos;m helping plan 🗂️
          </span>
          <span className="block text-sm text-gray-500 mt-1">
            Wedding planner, family, or friend. You&apos;ll join weddings you&apos;re invited to —
            no wedding website of your own needed.
          </span>
        </button>
      </div>

      <p className="text-xs text-gray-400 max-w-sm mx-auto">
        Got an invite email? Just open its link — it takes you straight to the right place.
      </p>
    </motion.div>
  );
}
