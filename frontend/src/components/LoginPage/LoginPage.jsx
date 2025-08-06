import { loginThunk } from "../../store/session";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});

    const user = useSelector(state => state.session.user);
    const navigate = useNavigate();

    const dispatch = useDispatch();

    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    useEffect(() => {
        // Validate user input
        const newErrors = {};
        if (!email) newErrors.email = "Email is required";
        if (!password) newErrors.password = "Password is required";
        if (password && password.length < 6) {
            newErrors.password = "Password must be at least 6 characters long";
        }
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Email is invalid";
        }

        setErrors(newErrors);
    }, [email, password]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        // Check for validation errors
        if (Object.keys(errors).length > 0) {
            return;
        }
        dispatch(loginThunk({ email, password }));

        // Redirect to home page after login
        if (user) {
            navigate("/");
        }
        //Show error if login fails
        else {
            setErrors({ login: "Login failed. Please check your credentials." });
        }
    };

    return (
        <div className="login-page">
            <h1>Login Page</h1>
            <form>
                <label htmlFor="email">Email:</label>
                <input type="email" id="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email && <p className="error">{errors.email}</p>}
                <label htmlFor="password">Password:</label>
                <input type="password" id="password" name="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

                <button type="submit" onClick={handleSubmit}>Login</button>
                {errors.password && <p className="error">{errors.password}</p>}
                {errors.login && <p className="error">{errors.login}</p>}
            </form>
        </div>
    );
}