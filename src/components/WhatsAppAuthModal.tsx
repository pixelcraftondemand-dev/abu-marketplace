import React from 'react';
import { AuthModal, AuthModalProps } from './AuthModal';

export type WhatsAppAuthModalProps = AuthModalProps;

export const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = (props) => {
  return <AuthModal {...props} />;
};

export default WhatsAppAuthModal;
