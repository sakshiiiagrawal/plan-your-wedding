import { useForm, useWatch, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import DatePicker from '../../components/ui/DatePicker';

interface SlugCheck {
  exists: boolean;
}

function useSlugAvailability(slug: string) {
  return useQuery<SlugCheck>({
    queryKey: ['wedding-slug', slug],
    queryFn: () => api.get(`/weddings/${slug}`).then((r) => r.data),
    enabled: !!slug && slug.length >= 3 && /^[a-z0-9-]+$/.test(slug),
    staleTime: 0,
  });
}

interface Step2Data {
  brideName: string;
  groomName: string;
  weddingDate: string;
  slug: string;
}

interface Step2Props {
  data: Step2Data;
  onNext: (values: Step2Data) => void;
  onBack: () => void;
}

export default function Step2_WeddingDetails({ data, onNext, onBack }: Step2Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step2Data>({
    defaultValues: data,
  });

  const slugValue = useWatch({ control, name: 'slug', defaultValue: data.slug || '' });
  const slugValid = slugValue && slugValue.length >= 3 && /^[a-z0-9-]+$/.test(slugValue);
  const { data: slugCheck, isFetching: slugChecking } = useSlugAvailability(slugValue);
  const slugTaken = slugValid && !slugChecking && slugCheck?.exists === true;
  const slugAvailable = slugValid && !slugChecking && slugCheck?.exists === false;

  const onSubmit = (values: Step2Data) => {
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
          <label className="label">Bride&apos;s Name *</label>
          <input
            {...register('brideName', { required: "Bride's name is required" })}
            className="input"
            placeholder="e.g. Khushi Sharma"
          />
          {errors.brideName && (
            <p className="text-red-500 text-xs mt-1">{errors.brideName.message}</p>
          )}
        </div>

        <div>
          <label className="label">Groom&apos;s Name *</label>
          <input
            {...register('groomName', { required: "Groom's name is required" })}
            className="input"
            placeholder="e.g. Arjun Verma"
          />
          {errors.groomName && (
            <p className="text-red-500 text-xs mt-1">{errors.groomName.message}</p>
          )}
        </div>

        <div>
          <label className="label">
            Wedding Date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Controller
            control={control}
            name="weddingDate"
            render={({ field }) => (
              <DatePicker
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Pick your wedding date"
              />
            )}
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
            placeholder="e.g. khushi-and-arjun"
          />
          {slugValue && (
            <p className="text-xs text-gray-400 mt-1">
              {host}/<span className="font-medium text-maroon-700">{slugValue}</span>
            </p>
          )}
          {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
          {slugValid &&
            !errors.slug &&
            (slugChecking ? (
              <p className="text-gray-400 text-xs mt-1">Checking availability...</p>
            ) : slugAvailable ? (
              <p className="text-green-600 text-xs mt-1">Available!</p>
            ) : slugTaken ? (
              <p className="text-red-500 text-xs mt-1">That URL is already taken. Try another.</p>
            ) : null)}
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
