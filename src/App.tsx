import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm/LoginForm';
import DomofonList from './components/DomofonList/DomofonList';
import VideoStreamPage from './components/VideoStreamPage/VideoStreamPage';
import AdminPanel from './components/AdminPanel';
import './App.css';
import logo from './assets/logo.png';

const ProtectedRoute = ({ children, adminOnly = false }: { children: JSX.Element, adminOnly?: boolean }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/domofons" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="app">
        <div className="logo-container">
          <img src={logo} alt="Логотип" className="logo" />
        </div>

        <div className="page-container">
          <Routes>
            <Route path="/" element={<LoginForm />} />
            <Route
              path="/domofons"
              element={
                <ProtectedRoute>
                  <DomofonList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/video"
              element={
                <ProtectedRoute>
                  <VideoStreamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
