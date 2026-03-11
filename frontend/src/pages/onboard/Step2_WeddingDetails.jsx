import { useForm, useWatch } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

function useSlugAvailability(slug) {
  return useQuery({
    queryKey: ['wedding-slug', slug],
    queryFn: () => api.get(`/weddings/${slug}`).then(r => r.data),
    enabled: !!slug && slug.length >= 3 && /^[a-z0-9-]+$/.test(slug),
    staleTime: 0,
  });
}

export default function Step2_WeddingDetails({ data, onNext, onBack }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: data
  });

  const slugValue = useWatch({ control, name: 'slug', defaultValue: data.slug || '' });
  const slugValid = slugValue && slugValue.length >= 3 && /^[a-z0-9-]+$/.test(slugValue);
  const { data: slugCheck, isFetching: slugChecking } = useSlugAvailability(slugValue);
  const slugTaken = slugValid && !slugChecking && slugCheck?.exists === true;
  const slugAvailable = slugValid && !slugChecking && slugCheck?.exists === false;

  const onSubmit = (values) => {
    if (slugTaken) return;
    onNext(values);
  };

  const host = typeof window !== 'undefined' ? window.location.host : 'yourapp.com';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <h2 className="font-display text-2xl font-bold text-maroon-800 mb-1">Wedding Details</h2>
      <p className="text-gray-500 mb-6 text-sm">Tell us about the couple and the big day.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Bride's Name *</label>
          <input
            {...register('brideName', { required: "Bride's name is required" })}
            className="input"
            placeholder="e.g. Priya Sharma"
          />
          {errors.brideName && <p className="text-red-500 text-xs mt-1">{errors.brideName.message}</p>}
        </div>

        <div>
          <label className="label">Groom's Name *</label>
          <input
            {...register('groomName', { required: "Groom's name is required" })}
            className="input"
            placeholder="e.g. Rahul Verma"
          />
          {errors.groomName && <p className="text-red-500 text-xs mt-1">{errors.groomName.message}</p>}
        </div>

        <div>
          <label className="label">Wedding Date <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="date"
            {...register('weddingDate')}
            className="input"
          />
        </div>

        <div>
          <label className="label">Your Wedding URL *</label>
          <input
            {...register('slug', {
              required: 'URL slug is required',
              minLength: { value: 3, message: 'Must be at least 3 characters' },
              maxLength: { value: 50, message: 'Must be 50 characters or less' },
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: 'Only lowercase letters, numbers, and hyphens allowed',
              },
            })}
            className="input"
            placeholder="e.g. priya-and-rahul"
          />
          {/* URL preview */}
          {slugValue && (
            <p className="text-xs text-gray-400 mt-1">
              {host}/<span className="font-medium text-maroon-700">{slugValue}</span>
            </p>
          )}
          {/* Validation errors */}
          {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
          {/* Availability feedback */}
          {slugValid && !errors.slug && (
            slugChecking ? (
              <p className="text-gray-400 text-xs mt-1">Checking availability...</p>
            ) : slugAvailable ? (
              <p className="text-green-600 text-xs mt-1">Available!</p>
            ) : slugTaken ? (
              <p className="text-red-500 text-xs mt-1">That URL is already taken. Try another.</p>
            ) : null
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="btn-secondary flex-1 py-3">
            Back
          </button>
          <button
            type="submit"
            disabled={slugTaken || slugChecking}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </form>
    </motion.div>
  );
}
