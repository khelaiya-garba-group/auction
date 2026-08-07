import React from 'react';

const FilterBar = ({ filters, onFilterChange, options, children }) => {
  return (
    <div className="glass-panel" style={{ 
      padding: '1rem 1.5rem', 
      marginBottom: '2rem', 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '1.5rem', 
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-green)', letterSpacing: '1px', paddingRight: '1rem' }}>FILTERS</h3>
        
        {Object.entries(options).map(([key, list]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ textTransform: 'capitalize', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {key.replace(/([A-Z])/g, ' $1').replace('_', ' ').trim()}:
            </label>
            <select 
              className="form-select"
              value={filters[key] || ''}
              onChange={(e) => onFilterChange(key, e.target.value)}
              style={{ width: 'auto', minWidth: '130px', padding: '0.3rem 1.5rem 0.3rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="">All</option>
              {list.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
      </div>
      
      {/* Right side for view toggles or search bars */}
      {children && (
        <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
