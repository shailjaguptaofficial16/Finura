document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = Array.from(document.querySelectorAll('.auth-tab'));
    const messageBox = document.getElementById('form-message');

    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const registerNameInput = document.getElementById('register-name');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');

    const loginEmailError = document.getElementById('login-email-error');
    const loginPasswordError = document.getElementById('login-password-error');
    const registerNameError = document.getElementById('register-name-error');
    const registerEmailError = document.getElementById('register-email-error');
    const registerPasswordError = document.getElementById('register-password-error');
    const registerConfirmPasswordError = document.getElementById('register-confirm-password-error');

    function setMessage(type, text) {
        messageBox.className = `form-message ${type}`;
        messageBox.textContent = text;
    }

    function clearMessage() {
        messageBox.className = 'form-message';
        messageBox.textContent = '';
    }

    function clearFieldErrors() {
        [loginEmailError, loginPasswordError, registerNameError, registerEmailError, registerPasswordError, registerConfirmPasswordError].forEach((el) => {
            if (el) el.textContent = '';
        });
    }

    function switchTab(mode) {
        clearMessage();
        clearFieldErrors();
        tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
        loginForm.classList.toggle('hidden', mode !== 'login');
        registerForm.classList.toggle('hidden', mode !== 'register');
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => switchTab(tab.dataset.mode));
    });

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function fetchUsers(email, password) {
        const response = await fetch('http://localhost:4000/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Unable to reach the authentication service.');
        }

        return response.json();
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        clearFieldErrors();

        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;
        let hasError = false;

        // 1. Pehle validation check karein
        if (!validateEmail(email)) {
            loginEmailError.textContent = 'Please enter a valid email address.';
            hasError = true;
        }

        if (password.length < 6) {
            loginPasswordError.textContent = 'Password must be at least 6 characters.';
            hasError = true;
        }

        // 2. Agar koi error NAI hai, toh data backend ko bhejo 🚀
        if (!hasError) {
            try {
                const result = await fetchUsers(email, password);
                alert('MongoDB Atlas mein aapka data save ho gaya! 🎉');
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Backend se jodne mein dikkat aayi:", error);
                alert('Signup nakaam rahi, server check kijiye.');
            }
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        clearFieldErrors();

        const name = registerNameInput.value.trim();
        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value;
        const confirmPassword = registerConfirmPasswordInput.value;
        let hasError = false;

        if (!name) {
            registerNameError.textContent = 'Please enter your full name.';
            hasError = true;
        }

        if (!validateEmail(email)) {
            registerEmailError.textContent = 'Please enter a valid email address.';
            hasError = true;
        }

        if (password.length < 6) {
            registerPasswordError.textContent = 'Password must be at least 6 characters.';
            hasError = true;
        }

        if (password !== confirmPassword) {
            registerConfirmPasswordError.textContent = 'Passwords do not match.';
            hasError = true;
        }

        if (hasError) return;

        try {
            const users = await fetchUsers();
            const emailExists = users.some((user) => user.email?.toLowerCase() === email.toLowerCase());

            if (emailExists) {
                setMessage('error', 'An account with that email already exists.');
                return;
            }

            const userData = {
                email,
                password
            };

            const response = await fetch('http://localhost:5000/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Sign-up failed. Please try again.');
            }

            alert(data.message); // Wahan se success message aayega!
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error(error);
            setMessage('error', error.message || 'Unable to create your account right now.');
        }
    });

    switchTab('login');
});
