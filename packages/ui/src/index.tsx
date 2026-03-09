import type { HTMLAttributes, PropsWithChildren } from 'react';

export function SurfaceCard({
  children,
  className = '',
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,61,62,0.08)] backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
