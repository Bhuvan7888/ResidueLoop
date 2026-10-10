import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VerificationCard: React.FC<{ verification?: Record<string, unknown> }> = ({ verification }) => {
  return <div>Verification Placeholder {String(verification?.verdict || '')}</div>;
};

export default VerificationCard;
