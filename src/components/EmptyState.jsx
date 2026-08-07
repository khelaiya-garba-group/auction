import React from 'react';
import { Ghost } from 'lucide-react';

const EmptyState = ({ title = "No Results Found", description = "Try adjusting your filters or search criteria." }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center glass-panel" style={{ padding: '4rem 2rem', margin: '2rem auto', maxWidth: '600px' }}>
      <Ghost size={64} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '1.5rem' }} />
      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  );
};

export default EmptyState;
