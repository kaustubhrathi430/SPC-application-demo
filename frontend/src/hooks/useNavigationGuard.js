import { useEffect } from 'react';

export function useNavigationGuard(shouldBlock, message) {
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message || 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock, message]);
}
