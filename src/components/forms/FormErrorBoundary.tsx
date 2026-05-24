import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: React.ReactNode; formCode?: string; }
interface State { hasError: boolean; message?: string; }

export class FormErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[FormErrorBoundary] ${this.props.formCode} crashed:`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            تعذّر عرض هذا النموذج ({this.props.formCode || '—'})
          </div>
          <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
            حدث خطأ برمجي أثناء تحميل النموذج. يمكنك إغلاق هذه النافذة والمتابعة؛
            بقية النظام يعمل بشكل طبيعي.
          </p>
          <pre className="mt-2 text-[10px] text-red-500 dark:text-red-400 overflow-x-auto whitespace-pre-wrap" dir="ltr">
            {this.state.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
