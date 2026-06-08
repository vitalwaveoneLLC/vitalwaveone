/**
 * Session Manager - Handles automatic logout on idle
 * Admin: 10 minutes
 * Ordering Portal: 15 minutes
 */

export class SessionManager {
  constructor(timeoutMinutes = 15, onTimeout = null) {
    this.timeoutMinutes = timeoutMinutes;
    this.timeoutSeconds = timeoutMinutes * 60;
    this.onTimeout = onTimeout;
    this.timeoutId = null;
    this.lastActivityTime = Date.now();
    this.isActive = true;

    this.setupEventListeners();
    this.resetTimer();
  }

  setupEventListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => this.onUserActivity(), true);
    });
  }

  onUserActivity() {
    this.lastActivityTime = Date.now();
    this.resetTimer();
  }

  resetTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.timeoutSeconds * 1000);
  }

  handleTimeout() {
    this.isActive = false;
    console.log(`Session expired after ${this.timeoutMinutes} minutes of inactivity`);

    if (this.onTimeout) {
      this.onTimeout();
    } else {
      // Default: logout and redirect to login
      localStorage.removeItem('vw_admin_session');
      localStorage.removeItem('vw_user_session');
      window.location.href = '/login';
    }
  }

  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  getTimeRemaining() {
    const elapsed = (Date.now() - this.lastActivityTime) / 1000;
    const remaining = Math.max(0, this.timeoutSeconds - elapsed);
    return Math.round(remaining);
  }

  isSessionActive() {
    return this.isActive && (Date.now() - this.lastActivityTime) / 1000 < this.timeoutSeconds;
  }
}

export default SessionManager;
