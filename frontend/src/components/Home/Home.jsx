import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as sessionActions from '../../store/session';
import './Home.css';

export default function Home() {
    const dispatch = useDispatch();
    const user = useSelector(state => state.session.user);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
        setErrors(errors);
        if (Object.keys(errors).length) return;

        await dispatch(sessionActions.signupThunk(email, stationName, clientName, password));


        const response = await fetch('/SMART-Win11Check.exe');
        if (!response.ok) {
            console.error('Failed to download the tool');
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SMART-Win11Check.exe';
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    console.log(loadForm, "THIS IS LOAD FORM")

    return (
        <div className="home-wrapper">
            <header className="hero-banner">
                <h1>SMART Solutions</h1>
                <p>Windows 11 Compatibility Tool</p>
                {user && (
                    <button className="logout-btn" onClick={() => dispatch(sessionActions.logoutThunk())}>
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
                        <a className="btn-red" href="/SMART-Win11Check.exe" download>Download Tool</a>
                    </section>
                )}
            </main>
        </div>
    );
}
