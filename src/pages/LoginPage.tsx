import React, { useState } from 'react';
import { PortalSelectionPage } from './PortalSelectionPage';
import { EmployeeLoginPage } from './EmployeeLoginPage';
import { HRLoginPage } from './HRLoginPage';

export const LoginPage: React.FC = () => {
  const [currentPortal, setCurrentPortal] = useState<'selection' | 'employee' | 'hr'>('selection');

  if (currentPortal === 'employee') {
    return <EmployeeLoginPage onBack={() => setCurrentPortal('selection')} />;
  }

  if (currentPortal === 'hr') {
    return <HRLoginPage onBack={() => setCurrentPortal('selection')} />;
  }

  return <PortalSelectionPage onSelectPortal={(portal) => setCurrentPortal(portal)} />;
};
