import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "Erreur inconnue" };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 py-16 text-center text-mist">
          <p className="font-display text-lg font-semibold text-coral">Le site n’a pas pu s’afficher correctement</p>
          <p className="mt-3 max-w-lg text-sm text-white/55">{this.state.message}</p>
          <p className="mt-6 max-w-md text-xs text-white/35">
            Si vous venez de mettre à jour le site, videz le cache du navigateur ou ouvrez une fenêtre privée. En hébergement
            sous-dossier, il faut définir la même base dans Vite (<code className="text-white/50">VITE_BASE_PATH</code>) et
            rebuilder.
          </p>
          <button
            type="button"
            className="mt-8 rounded-full border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-mist transition hover:border-white/35"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
