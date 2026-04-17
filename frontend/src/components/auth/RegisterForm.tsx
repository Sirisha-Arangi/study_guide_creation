import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserCreate } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

// Extended form type that includes confirmPassword
interface RegisterForm extends UserCreate {
  confirmPassword: string;
}

const RegisterForm: React.FC = () => {
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>();

  const password = watch('password');
  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError(null);
      // Extract only UserCreate fields, exclude confirmPassword
      const { confirmPassword, ...userData } = data;
      await registerUser(userData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Account Registration
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create your teacher or student account
        </p>
      </div>
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              className="mt-1 input-field"
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              type="email"
              className="mt-1 input-field"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Account Role
            </label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="mt-1 input-field"
              defaultValue="teacher"
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          {selectedRole !== 'student' && (
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department (Optional)
              </label>
              <input
                {...register('department')}
                type="text"
                className="mt-1 input-field"
                placeholder="Enter your department"
              />
            </div>
          )}

          {selectedRole === 'student' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                  Branch
                </label>
                <select
                  {...register(
                    'branch',
                    selectedRole === 'student' ? { required: 'Branch is required' } : {}
                  )}
                  className="mt-1 input-field"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select branch
                  </option>
                  {['CSC', 'CSM', 'ECE', 'EEE', 'IT', 'Civil', 'Mechanical'].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.branch && <p className="mt-1 text-sm text-red-600">{errors.branch.message}</p>}
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <select
                  {...register('year', selectedRole === 'student' ? { required: 'Year is required' } : {})}
                  className="mt-1 input-field"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select year
                  </option>
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>}
              </div>

              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-700">
                  Section
                </label>
                <select
                  {...register('section', selectedRole === 'student' ? { required: 'Section is required' } : {})}
                  className="mt-1 input-field"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select section
                  </option>
                  {['A', 'B', 'C', 'D'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.section && <p className="mt-1 text-sm text-red-600">{errors.section.message}</p>}
              </div>

              <div>
                <label htmlFor="roll_number" className="block text-sm font-medium text-gray-700">
                  Roll Number
                </label>
                <input
                  {...register('roll_number', selectedRole === 'student' ? { required: 'Roll number is required' } : {})}
                  type="text"
                  className="mt-1 input-field"
                  placeholder="Enter your roll number"
                />
                {errors.roll_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.roll_number.message}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              type="password"
              className="mt-1 input-field"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
              type="password"
              className="mt-1 input-field"
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full btn btn-primary disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Registering...
              </div>
            ) : (
              'Register'
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;
