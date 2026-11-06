import type { HTMLAttributes } from 'react';

/** Glass surface (HANDOVER §5.4). */
export function Glass({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass ${className}`} {...rest} />;
}
