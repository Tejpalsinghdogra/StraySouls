/**
 * StraySouls - Main JavaScript
 */

// Navigation Toggle
document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Set current year in footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
    
    // Check authentication status (mock)
    checkAuth();
});

// Mock Authentication (localStorage)
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('straySoulsUser'));
    const authLinks = document.getElementById('auth-links');
    const currentPath = window.location.pathname;
    
    // Global redirection protection for dashboard pages
    if (user) {
        const isAdminPage = currentPath.includes('admin.html') || 
                    currentPath.includes('admin-reports.html') ||
                    currentPath.includes('admin-shelters.html') ||
                    currentPath.includes('admin-volunteers.html');
        if (isAdminPage && user.role !== 'admin') {
            window.location.href = 'dashboard.html';
        } else if (currentPath.includes('dashboard.html') && user.role === 'admin') {
            window.location.href = 'admin.html';
        }
    } else if (currentPath.includes('admin.html') || currentPath.includes('admin-reports.html') || currentPath.includes('dashboard.html')) {
        // Not logged in but trying to access a dashboard
        window.location.href = 'login.html';
    }

    if (authLinks) {
        if (user) {
            let dashboardPage = 'dashboard.html';
            let dashboardLabel = 'Dashboard';
            
            if (user.role === 'admin') {
                dashboardPage = 'admin.html';
                dashboardLabel = 'Admin Panel';
            } else if (user.role === 'volunteer') {
                dashboardLabel = 'Volunteer Portal';
            }
            
            authLinks.innerHTML = `
                <a href="${dashboardPage}" class="btn btn-outline" style="border-width: 2px;">${dashboardLabel}</a>
                <a href="#" onclick="logout()" class="btn btn-secondary">Logout</a>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="login.html" class="btn btn-outline">Login</a>
                <a href="signup.html" class="btn btn-primary">Join Us</a>
            `;
        }
    }
}

function logout() {
    localStorage.removeItem('straySoulsUser');
    localStorage.removeItem('straySoulsToken');
    window.location.href = 'index.html';
}

// Utility: Toast Notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <i class="fas fa-times" style="cursor: pointer;" onclick="this.parentElement.remove()"></i>
    `;

    container.appendChild(toast);

    // Trigger reflow
    void toast.offsetWidth;

    // Show
    toast.classList.add('show');

    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Utility: Custom Confirm Modal
function showConfirm(message, onConfirm) {
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3 class="mb-1">Are you sure?</h3>
                <p class="mb-2" id="confirm-message">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-outline" id="confirm-cancel">No, Keep it</button>
                    <button class="btn btn-danger" id="confirm-yes">Yes, Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add modal styles if they don't exist
        if (!document.getElementById('modal-basic-style')) {
            const style = document.createElement('style');
            style.id = 'modal-basic-style';
            style.textContent = `
                .modal {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); display: flex; justify-content: center;
                    align-items: center; z-index: 3000;
                }
                .modal.hidden { display: none; }
                .modal-content { background: white; padding: 2rem; border-radius: 12px; width: 90%; }
            `;
            document.head.appendChild(style);
        }
    }

    const msgEl = document.getElementById('confirm-message');
    msgEl.textContent = message;

    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-cancel');

    modal.classList.remove('hidden');

    const handleYes = () => {
        modal.classList.add('hidden');
        onConfirm();
        yesBtn.removeEventListener('click', handleYes);
    };

    const handleNo = () => {
        modal.classList.add('hidden');
        yesBtn.removeEventListener('click', handleYes);
    };

    yesBtn.onclick = handleYes;
    noBtn.onclick = handleNo;
    modal.onclick = (e) => { if (e.target === modal) handleNo(); };
}

// Global generic redirect with delay for smooth UX
function delayedRedirect(url, delay = 1500) {
    setTimeout(() => {
        window.location.href = url;
    }, delay);
}

// Utility: Mock API Call
async function mockApiCall(endpoint, data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`API Call to ${endpoint}:`, data);
            resolve({ success: true, message: 'Operation successful' });
        }, 800);
    });
}
