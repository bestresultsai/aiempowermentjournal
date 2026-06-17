import { Component } from "react";
import { captureError } from "../lib/observability";

// ---------------------------------------------------------------------------
// ErrorBoundary — catches render-time errors in the child tree and shows a
// readable error panel instead of a blank page. Bumps the error to the
// console too so anyone with devtools open can grab the stack.
//
// Wrap individual routes/pages with this when they're complex enough that a
// silent blank page would be confusing.
// ---------------------------------------------------------------------------

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
    // Forward to Sentry when a DSN is configured. No-ops in dev/local.
    captureError(error, {
      source: "ErrorBoundary",
      componentStack: info?.componentStack,
      title: this.props.title || null,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface-paper flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-surface-card border border-rose-200 p-6 shadow-lift">
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-rose-700 mb-1">
              Something went wrong
            </div>
            <h1 className="font-heading text-[20px] font-extrabold text-ink mb-2">
              {this.props.title || "This page hit an error"}
            </h1>
            <p className="text-[13px] text-ink-muted leading-relaxed mb-4">
              Open the browser console to see the full stack. Then try
              reloading. If it persists, take a screenshot of the console
              and share it.
            </p>
            <pre className="text-[11.5px] bg-surface-soft p-3 rounded-lg overflow-x-auto whitespace-pre-wrap text-ink mb-4">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-2 rounded-lg bg-ink text-white text-[12.5px] font-heading font-bold"
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.reset}
                className="px-3 py-2 rounded-lg bg-surface-soft text-ink text-[12.5px] font-heading font-semibold"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
