
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

import LoginPage from './components/LoginPage/LoginPage';
import Home from './components/Home/Home';
import Reports from './components/Reports';

import './index.css';


import * as sessionActions from './store/session';

function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);

  const user = useSelector(state => state.session.user);

  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => {
      setIsLoaded(true)
    });
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(sessionActions.logoutThunk());
  }

  return (
    <div className="app-container">
      <header className="hero-banner">
        <h1>SMART Solutions</h1>
        <p>Windows 11 Compatibility Tool</p>
        {
          user ? (
            <>
              <p>Welcome, {user?.email}!</p>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
              <a href='/reports' className="btn-red">View Reports</a>
            </>
          ) : (
            <a href='/login' style={{ color: 'white', textDecoration: 'underline' }}>Sign in</a>
          )
        }
      </header>
      {isLoaded && <Outlet />}
      <footer className='footer'>
        <p>&copy; 2025 SMART Solutions. All rights reserved.</p>
      </footer>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Home />
      },
      {
        path: '/login',
        element: <LoginPage />
      },
      {
        path: '/reports',
        element: <Reports />
      }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;