import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './pages/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudentExams from './pages/StudentExams';
import StudentResults from './pages/StudentResults';
import TeacherSubmissions from './pages/TeacherSubmissions';

// Feature Components
import Summarization from './components/features/Summarization';
import Flashcards from './components/features/Flashcards';
import QA from './components/features/QA';
import LecturePlan from './components/features/LecturePlan';
import ContentGap from './components/features/ContentGap';
import DocumentComparison from './components/features/DocumentComparison';

import AssignmentGenerator from './components/features/AssignmentGenerator';

const TeacherOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'teacher') {
    return <Navigate to="/student-exams" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    
                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Navbar */}
                      <Navbar toggleSidebar={toggleSidebar} />
                      
                      {/* Page Content */}
                      <main className="flex-1 overflow-y-auto">
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/summarization" element={<TeacherOnlyRoute><Summarization /></TeacherOnlyRoute>} />
                          <Route path="/flashcards" element={<TeacherOnlyRoute><Flashcards /></TeacherOnlyRoute>} />
                          <Route path="/qa" element={<TeacherOnlyRoute><QA /></TeacherOnlyRoute>} />
                          <Route path="/lecture-plan" element={<TeacherOnlyRoute><LecturePlan /></TeacherOnlyRoute>} />
                          <Route path="/content-gap" element={<TeacherOnlyRoute><ContentGap /></TeacherOnlyRoute>} />
                          <Route path="/document-comparison" element={<TeacherOnlyRoute><DocumentComparison /></TeacherOnlyRoute>} />
                          <Route path="/assignment-generator" element={<TeacherOnlyRoute><AssignmentGenerator /></TeacherOnlyRoute>} />
                          <Route path="/teacher-submissions" element={<TeacherOnlyRoute><TeacherSubmissions /></TeacherOnlyRoute>} />
                          <Route path="/student-exams" element={<StudentExams />} />
                          <Route path="/student-results" element={<StudentResults />} />

                          {/* Placeholder routes for other features */}
                          <Route path="/assignment" element={<div className="p-6"><h1 className="text-2xl font-bold">Assignment Generation - Coming Soon</h1></div>} />
                          
                          {/* Default redirect */}
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
