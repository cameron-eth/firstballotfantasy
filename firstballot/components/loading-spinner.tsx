import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg'
  text?: string
  className?: string
}

export function LoadingSpinner({
  size = 'default',
  text = 'Loading...',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'border-4 border-yellow-400 border-t-transparent rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
      {text && <span className="ml-2 text-gray-400 text-sm">{text}</span>}
    </div>
  )
}
