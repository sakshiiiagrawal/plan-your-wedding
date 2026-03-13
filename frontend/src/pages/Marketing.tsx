import { useNavigate } from 'react-router-dom';

export default function Marketing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-script text-6xl sm:text-7xl text-cream mb-4">
          Wedding Planner
        </h1>
        <p className="text-gold-200 text-xl mb-3 font-display">
          Your beautiful wedding website, all in one place.
        </p>
        <p className="text-cream/70 mb-10 text-base">
          Create your personalized wedding website, manage guests, track your budget, coordinate vendors, and more.
        </p>
        <button
          onClick={() => navigate('/onboard')}
          className="btn-primary px-10 py-4 text-lg"
        >
          Get Started Free
        </button>
      </div>
    </div>
  );
}
