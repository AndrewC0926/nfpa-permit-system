import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { PermitDetail } from './pages/PermitDetail';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import { Switch } from '@headlessui/react';

const DemoModeToggle: React.FC = () => {
    const { isDemoMode, toggleDemoMode } = useDemoMode();

    return (
        <Switch.Group as="div" className="flex items-center">
            <Switch.Label as="span" className="mr-3">
                <span className="text-sm font-medium text-gray-900">Demo Mode</span>
            </Switch.Label>
            <Switch
                checked={isDemoMode}
                onChange={toggleDemoMode}
                className={`${
                    isDemoMode ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
                <span
                    aria-hidden="true"
                    className={`${
                        isDemoMode ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </Switch>
        </Switch.Group>
    );
};

const App: React.FC = () => {
    return (
        <DemoModeProvider>
            <Router>
                <div className="min-h-screen bg-gray-100">
                    <nav className="bg-white shadow">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="flex h-16 justify-between">
                                <div className="flex">
                                    <div className="flex flex-shrink-0 items-center">
                                        <Link to="/" className="text-xl font-bold text-gray-900">
                                            NFPA Permit System
                                        </Link>
                                    </div>
                                    <div className="ml-6 flex space-x-8">
                                        <Link
                                            to="/"
                                            className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            to="/permits"
                                            className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        >
                                            Permits
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <DemoModeToggle />
                                </div>
                            </div>
                        </div>
                    </nav>

                    <main>
                        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                            <Routes>
                                <Route path="/permits/:id" element={<PermitDetail />} />
                                <Route
                                    path="/"
                                    element={
                                        <div className="text-center">
                                            <h1 className="text-2xl font-bold text-gray-900">
                                                Welcome to NFPA Permit System
                                            </h1>
                                            <p className="mt-2 text-gray-600">
                                                Select a permit to view its details
                                            </p>
                                        </div>
                                    }
                                />
                            </Routes>
                        </div>
                    </main>
                </div>
            </Router>
        </DemoModeProvider>
    );
};

export default App;
