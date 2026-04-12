import React from 'react';

const Dialog = ({ isOpen, title, message, onConfirm, onCancel, type = 'confirm' }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}
      </style>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        padding: '32px',
        width: '90%',
        maxWidth: '450px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}>
          {type === 'confirm' ? '❓' : (type === 'warning' ? '⚠️' : 'ℹ️')}
        </div>
        
        <h3 style={{
          fontSize: '22px',
          fontWeight: '800',
          color: '#1e293b',
          marginBottom: '12px',
          margin: 0
        }}>{title}</h3>
        
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          lineHeight: '1.6',
          marginBottom: '32px',
          whiteSpace: 'pre-wrap'
        }}>{message}</p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          {onCancel && (
            <button 
              onClick={onCancel}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                border: '2px solid #e2e8f0',
                backgroundColor: 'white',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.target.style.backgroundColor = '#f8fafc'}
              onMouseOut={e => e.target.style.backgroundColor = 'white'}
            >
              Cancel
            </button>
          )}
          <button 
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              border: 'none',
              backgroundColor: type === 'warning' ? '#ef4444' : '#0062ff',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 98, 255, 0.2)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
          >
            {type === 'confirm' ? 'Confirm' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
