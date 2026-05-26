import { useEffect, useState } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'success' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => setVisible(false), 5600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`reg-toast ${type}${visible ? ' show' : ''}`}>
      <div className="toast-icon">
        {type === 'success' ? '✓' : '✗'}
      </div>
      <div className="toast-message">
        {message}
      </div>
    </div>
  );
}
