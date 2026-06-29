import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Root error boundary. Without this, any render-time throw anywhere in the tree
 * unmounts everything and leaves a blank/black window with no clue why. Here we
 * catch it, surface the message + stack, and offer two escape hatches: a plain
 * reload, and a hard reset that clears persisted renderer state (localStorage +
 * any cached query data) for when a corrupt persisted value is the cause.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a copy in the console for the devtools/logs.
    console.error("[ErrorBoundary] render crash:", error, info.componentStack);
  }

  private reload = () => window.location.reload();

  private hardReset = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore — best effort
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-svh w-full items-center justify-center bg-background p-6 text-foreground">
        <div className="flex w-full max-w-lg flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error and couldn't render this screen.
            </p>
          </div>

          <pre className="max-h-64 overflow-auto rounded-lg bg-destructive/10 p-3 text-xs text-destructive whitespace-pre-wrap">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.reload}
              className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.hardReset}
              className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:border-brand hover:ring-1 hover:ring-brand"
            >
              Reset & reload
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            "Reset &amp; reload" clears local app state (you may need to sign in again).
          </p>
        </div>
      </div>
    );
  }
}
