import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Permits from './pages/Permits';
import PermitDetail from './pages/PermitDetail';
import Checklist from './pages/Checklist';
import Chat from './pages/Chat';
import AuditLog from './pages/AuditLog';
import Landing from './pages/Landing';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <AuthProvider>
                    <Toaster position="top-right" />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Dashboard />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/permits"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Permits />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/permits/:id"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <PermitDetail />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/checklist"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Checklist />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/chat"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Chat />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/audit-log"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <AuditLog />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/" element={<Landing />} />
                    </Routes>
                </AuthProvider>
            </Router>
        </QueryClientProvider>
    );
}
