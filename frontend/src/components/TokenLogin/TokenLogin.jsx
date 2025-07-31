import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginThunk, restoreUser } from '../../store/session';

import './TokenLogin.css';

export default function TokenLogin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const sessionUser = useSelector(state => state.session.user);

    //Redirects Home if user is already logged in
    useEffect(() => {
        if (sessionUser) {
            navigate('/');
        }
    }, [sessionUser, navigate]);

    // State Variables for form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    const [token, setToken] = useState('');

    useEffect(() => {
        const errors = {};
        if (!email) errors.email = 'Email is required';
        if (!password) errors.password = 'Password is required';
        setErrors(errors);
        setIsButtonDisabled(Object.keys(errors).length > 0);
    }, [email, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        try {
            await dispatch(loginThunk(email, password));

            const cookies = document.cookie;
            const tokenCookie = cookies.split('; ').find(c => c.startsWith('token='));

            if (!tokenCookie) {
                return;
            }

            const blob = new Blob([tokenCookie], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '.smart-cookie.txt';
            a.click();

            navigate('/');
        } catch (error) {
            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors({ general: 'Login failed. Please try again.' });
            }
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2>Obtener Token de Autenticación</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ padding: '8px', width: '80%', marginBottom: '1rem' }}
                />
                <br />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ padding: '8px', width: '80%', marginBottom: '1rem' }}
                />
                <br />
                <button type="submit" style={{ padding: '10px 20px' }} disabled={isButtonDisabled}>Generar Token</button>
            </form>

            {token && (
                <div style={{ marginTop: '2rem' }}>
                    <p><strong>Token generado:</strong></p>
                    <textarea readOnly value={token} style={{ width: '100%', height: '150px' }} />
                    <p>Se ha descargado el archivo <code>.smart-token.txt</code> automáticamente.</p>
                </div>
            )}

            {errors && <p style={{ color: 'red', marginTop: '1rem' }}>{errors.general}</p>}
        </div>
    );
}