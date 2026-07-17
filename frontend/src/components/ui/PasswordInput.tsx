import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

// ponytail: one wrapper for every password field's show/hide toggle.
// Forwards all input props (including react-hook-form's register()) to the inner input.
const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = 'input', ...rest }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`${className} pr-12`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
