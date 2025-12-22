// Button component
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantStyles = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300',
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 disabled:bg-secondary-300',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
