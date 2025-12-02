/**
 * Script untuk halaman login
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    // Cek jika ada error dari URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error === 'invalid') {
        showError('Username atau password salah');
    } else if (error === 'empty') {
        showError('Username dan password harus diisi');
    } else if (error === 'timeout') {
        showError('Session telah berakhir. Silakan login kembali.');
    }
    
    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                e.preventDefault();
                showError('Username dan password harus diisi');
                return false;
            }
        });
    }
    
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
        }
    }
});

