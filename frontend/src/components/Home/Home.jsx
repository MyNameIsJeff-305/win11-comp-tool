import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as sessionActions from '../../store/session';
import { getTokenThunk } from '../../store/win11comp';
import './Home.css';

export default function Home() {
    const dispatch = useDispatch();
    const user = useSelector(state => state.session.user);
    const token = useSelector(state => state.win11comp.token);

    const [email, setEmail] = useState('');
    const [stationName, setStationName] = useState('');
    const [clientName, setClientName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loadForm, setLoadForm] = useState(true);

    useEffect(() => {
        setLoadForm(!user);
    }, [user]);

    const handleLogout = () => {
        dispatch(sessionActions.logoutThunk());
        setLoadForm(true);
        setEmail('');
        setStationName('');
        setClientName('');
        setPassword('');
        setConfirmPassword('');
        setErrors({});
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
        setErrors(errors);
        if (Object.keys(errors).length) return;

        await dispatch(sessionActions.signupThunk(email, stationName, clientName, password));
    };

    const downloadTool = async () => {

        await dispatch(getTokenThunk(user.id));
        
        // Download the tool located at public/SMART-Win11Check.exe, no need to fetch it
        const link = document.createElement('a');
        link.href = '/SMART-Win11Check.exe';
        link.download = 'SMART-Win11Check.exe';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (token) {
            const blob = new Blob([token], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'smart-cookie.txt';
            a.click();
            a.remove();
        }

    }

    return (
        <div className="home-wrapper">
            <header className="hero-banner">
                <h1>SMART Solutions</h1>
                <p>Windows 11 Compatibility Tool</p>
                {user && (
                    <button className="logout-btn" onClick={handleLogout}>
                        Cerrar sesión
                    </button>
                )}
            </header>

            <main className="home-content">
                {loadForm ? (
                    <section className="form-section">
                        <h2>Sign up to Download the Tool</h2>
                        <p>Register your station and download our compatibility checker.</p>
                        <form className="signup-form" onSubmit={handleSubmit}>
                            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            <input type="text" placeholder="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} required />
                            <input type="text" placeholder="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
                            <button type="submit" className="btn-red">Sign Up & Download</button>
                        </form>
                    </section>
                ) : (
                    <section className="welcome-section">
                        <h2>Welcome, {user.email}</h2>
                        <p>Your report has been emailed to you. You can download the tool again below:</p>
                        <a className="btn-red" onClick={downloadTool}>Download Tool</a>
                    </section>
                )}
            </main>
        </div>
    );
}
