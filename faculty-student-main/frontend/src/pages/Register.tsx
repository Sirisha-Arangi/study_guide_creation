import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold text-primary-600">
            AI Teaching Assistant
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Automated Academic Content Generation and Analysis
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;
