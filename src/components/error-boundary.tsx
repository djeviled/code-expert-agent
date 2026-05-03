import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean; errorMessage: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-8 text-sm">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-6 py-3 rounded-xl hover:opacity-90 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
