import React from 'react';

export default function ErrorMessage({ error }) {
  if (!error) return null;
  const message = error.response?.data?.message || error.message || 'An error occurred';
  return <div style={{ color: 'red' }}>{message}</div>;
}

