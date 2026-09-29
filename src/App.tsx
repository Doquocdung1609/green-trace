import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthProvider";
import { ToastProvider } from "./contexts/ToastProvider";
import { AppShell } from "./layouts/AppShell";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { AssetEvidence } from "./pages/operator/AssetEvidence";
import { CreateAsset } from "./pages/operator/CreateAsset";
import { OperatorDashboard } from "./pages/operator/OperatorDashboard";
import { AssetPassport } from "./pages/passport/AssetPassport";
import { Home } from "./pages/public/Home";
import { ReviewerDashboard } from "./pages/reviewer/ReviewerDashboard";
import { VerificationRequestDetail } from "./pages/verifier/VerificationRequestDetail";
import { VerificationRequests } from "./pages/verifier/VerificationRequests";
import { SignedAttestations } from "./pages/verifier/SignedAttestations";
import { VerifierDashboard } from "./pages/verifier/VerifierDashboard";
import { SolanaProvider } from "./solana/SolanaProvider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000 } },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SolanaProvider>
          <ToastProvider>
            <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/passport/:assetCode"
                  element={<AssetPassport />}
                />
                <Route element={<AppShell />}>
                  <Route element={<ProtectedRoute roles={["operator"]} />}>
                    <Route path="/operator" element={<OperatorDashboard />} />
                    <Route
                      path="/operator/assets/new"
                      element={<CreateAsset />}
                    />
                    <Route
                      path="/operator/assets/:id/evidence"
                      element={<AssetEvidence />}
                    />
                  </Route>
                  <Route element={<ProtectedRoute roles={["verifier"]} />}>
                    <Route path="/verifier" element={<VerifierDashboard />} />
                    <Route
                      path="/verifier/requests"
                      element={<VerificationRequests />}
                    />
                    <Route
                      path="/verifier/requests/:id"
                      element={<VerificationRequestDetail />}
                    />
                    <Route path="/verifier/attestations" element={<SignedAttestations />} />
                  </Route>
                  <Route
                    element={<ProtectedRoute roles={["reviewer", "admin"]} />}
                  >
                    <Route path="/reviewer" element={<ReviewerDashboard />} />
                  </Route>
                  <Route element={<ProtectedRoute roles={["admin"]} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </SolanaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
