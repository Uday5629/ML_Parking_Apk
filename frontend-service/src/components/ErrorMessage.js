import React from 'react';

export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;

  const message = error.response?.data?.message || error.message || 'An error occurred';

  return (
    <div className="alert alert-danger d-flex align-items-center" role="alert">
      <div className="flex-grow-1">{message}</div>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger ms-2" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
