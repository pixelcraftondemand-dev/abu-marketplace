import React from 'react';
import { AuthModal } from './AuthModal';
import { UserProfile } from '../types';

interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

export const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = (props) => {
  return <AuthModal {...props} />;
};
