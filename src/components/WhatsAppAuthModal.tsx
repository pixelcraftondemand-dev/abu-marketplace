import React from 'react';
import { AuthModal } from './AuthModal';
import { UserProfile } from '../types';

export interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  initialTab?: 'phone' | 'email';
  initialEmailMode?: 'signin' | 'signup';
}

export const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = (props) => {
  return <AuthModal {...props} />;
};
