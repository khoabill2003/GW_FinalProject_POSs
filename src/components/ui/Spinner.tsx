// Loading Spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`
        animate-spin rounded-full
        border-primary-600 border-t-transparent
        ${sizeStyles[size]}
        ${className}
      `}
    />
  );
}

// Full page loading
export function PageLoader({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
