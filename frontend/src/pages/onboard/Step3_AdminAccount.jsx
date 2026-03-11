import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useState } from 'react';

function PasswordStrength({ password }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score - 1] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs mt-1 ${score >= 3 ? 'text-green-600' : 'text-orange-500'}`}>
          {labels[score - 1]}
        </p>
      )}
    </div>
  );
}

export default function Step3_AdminAccount({ data, onNext, onBack }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: data
  });
  const [showPass, setShowPass] = useState(false);
  const password = watch('password', '');

  const onSubmit = (values) => onNext(values);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <h2 className="font-display text-2xl font-bold text-maroon-800 mb-1">Admin Account</h2>
      <p className="text-gray-500 mb-6 text-sm">Create your secure admin login.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Your Name *</label>
          <input
            {...register('name', { required: 'Name is required' })}
            className="input"
            placeholder="e.g. Priya Sharma"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }
            })}
            className="input"
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Password *</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' }
              })}
              className="input pr-12"
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
          <PasswordStrength password={password} />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Confirm Password *</label>
          <input
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === password || 'Passwords do not match'
            })}
            className="input"
            placeholder="••••••••"
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="btn-secondary flex-1 py-3">
            ← Back
          </button>
          <button type="submit" className="btn-primary flex-1 py-3">
            Next →
          </button>
        </div>
      </form>
    </motion.div>
  );
}
