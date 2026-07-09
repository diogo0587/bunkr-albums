import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'success' | 'error';
}

const variants = {
  primary: 'from-purple-500 to-cyan-500 hover:shadow-[0_4px_12px_rgba(168,85,247,0.3)]',
  success: 'from-green-500 to-emerald-500 hover:shadow-[0_4px_12px_rgba(34,197,94,0.3)]',
  error: 'from-red-500 to-rose-500 hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)]',
};

export function GradientButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  className,
  type = 'button',
  variant = 'primary',
}: GradientButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r text-white font-semibold rounded-lg',
        'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'flex items-center justify-center gap-2 min-h-[44px]',
        variants[variant],
        className
      )}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {children}
    </button>
  );
}
