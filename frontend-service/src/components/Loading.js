import React from 'react';

export default function Loading({ text = 'Loading...' }) {
  return (
    <div className="d-flex justify-content-center align-items-center py-4">
      <div className="spinner-border text-primary me-2" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <span>{text}</span>
    </div>
  );
}
