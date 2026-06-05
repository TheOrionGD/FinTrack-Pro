document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Perform simulated redirect
            window.location.href = 'tracker.html';
        });
    }

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const currentType = passwordInput.getAttribute('type');
            if (currentType === 'password') {
                passwordInput.setAttribute('type', 'text');
                togglePassword.innerHTML = '&#128275;'; // Unlocked lock
            } else {
                passwordInput.setAttribute('type', 'password');
                togglePassword.innerHTML = '&#128274;'; // Locked lock
            }
        });
    }
});
