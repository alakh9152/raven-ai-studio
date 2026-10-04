// Raven AI Studio - Frontend JavaScript

const API_BASE = window.location.origin;

// Auth state
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initMobileMenu();
  initAnimations();
  initForms();
});

// Check authentication status
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include'
    });
    
    if (res.ok) {
      currentUser = await res.json();
      updateNavForUser(currentUser);
    } else {
      currentUser = null;
      updateNavForGuest();
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    currentUser = null;
    updateNavForGuest();
  }
}

// Update navigation based on auth state
function updateNavForUser(user) {
  const navLinks = document.querySelector('.nav__links');
  const navRight = document.querySelector('.nav__right');
  
  if (navRight) {
    navRight.innerHTML = `
      <span style="font-size: 13px; color: var(--text-muted)">Welcome, ${user.user.firstName || user.user.email.split('@')[0]}</span>
      <a href="/dashboard" class="btn btn--ghost" style="font-size: 13px">Dashboard</a>
      <button onclick="handleLogout()" class="btn btn--secondary" style="font-size: 13px">Sign Out</button>
    `;
  }
}

function updateNavForGuest() {
  const navRight = document.querySelector('.nav__right');
  
  if (navRight) {
    navRight.innerHTML = `
      <a href="/login" class="btn btn--ghost" style="font-size: 13px">Sign In</a>
      <a href="/login?register=true" class="btn btn--primary" style="font-size: 13px">Get Started</a>
    `;
  }
}

// Handle logout
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    currentUser = null;
    window.location.href = '/';
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// Initialize mobile menu
function initMobileMenu() {
  const menuBtn = document.querySelector('.nav__menu-btn');
  const navLinks = document.querySelector('.nav__links');
  
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      menuBtn.setAttribute('aria-expanded', isOpen);
    });
  }
}

// Initialize animations on scroll
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  document.querySelectorAll('.card, .step, .price-card, .faq-item').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// Initialize forms
function initForms() {
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Contact form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContact);
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = document.getElementById('loginEmail')?.value || form.email?.value;
  const password = document.getElementById('loginPassword')?.value || form.password?.value;
  const errorEl = form.querySelector('.alert');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // Reset errors
  if (errorEl) errorEl.remove();
  
  // Show loading
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div>';
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    currentUser = data;
    updateNavForUser(data);
    window.location.href = '/dashboard';
    
  } catch (err) {
    const alert = document.createElement('div');
    alert.className = 'alert alert--error';
    alert.textContent = err.message;
    form.prepend(alert);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();
  
  const form = e.target;
  const firstName = document.getElementById('registerFirstName')?.value || form.firstName?.value;
  const lastName = document.getElementById('registerLastName')?.value || form.lastName?.value;
  const email = document.getElementById('registerEmail')?.value || form.email?.value;
  const password = document.getElementById('registerPassword')?.value || form.password?.value;
  const errorEl = form.querySelector('.alert');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  if (errorEl) errorEl.remove();
  
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div>';
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, firstName, lastName })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    window.location.href = '/dashboard';
    
  } catch (err) {
    const alert = document.createElement('div');
    alert.className = 'alert alert--error';
    alert.textContent = err.message;
    form.prepend(alert);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Handle contact form
async function handleContact(e) {
  e.preventDefault();
  
  const form = e.target;
  const name = form.name.value;
  const email = form.email.value;
  const message = form.message.value;
  const errorEl = form.querySelector('.alert');
  const successEl = form.querySelector('.alert--success');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  if (errorEl) errorEl.remove();
  if (successEl) successEl.remove();
  
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div>';
  
  try {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit');
    }
    
    const success = document.createElement('div');
    success.className = 'alert alert--success';
    success.textContent = 'Thank you! We will get back to you soon.';
    form.prepend(success);
    form.reset();
    
  } catch (err) {
    const alert = document.createElement('div');
    alert.className = 'alert alert--error';
    alert.textContent = err.message;
    form.prepend(alert);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Utility: Show error toast
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'alert alert--error';
  toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000;';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Utility: Show success toast
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'alert alert--success';
  toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000;';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}