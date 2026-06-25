'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const { t } = useI18n.getState();
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] p-4">
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--text-primary)]">{t("common.error")}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("common.networkError")}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
