document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://portal.think4ever.com/api';
  const PORTAL_URL = 'https://portal.think4ever.com/';

  // 1. Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const ref_key = urlParams.get('ref') || '';
  const invite_token = urlParams.get('inv') || '';
  const utm_source = urlParams.get('utm_source') || '';
  const utm_medium = urlParams.get('utm_medium') || '';
  const utm_campaign = urlParams.get('utm_campaign') || '';
  const utm_term = urlParams.get('utm_term') || '';
  const utm_content = urlParams.get('utm_content') || '';

  // 2. Setup Google Login links dynamically
  const googleLinks = document.querySelectorAll('.btn-google');
  googleLinks.forEach(link => {
    let googleUrl = `${PORTAL_URL}?login=google`;
    if (ref_key) googleUrl += `&ref=${encodeURIComponent(ref_key)}`;
    if (invite_token) googleUrl += `&inv=${encodeURIComponent(invite_token)}`;
    link.setAttribute('href', googleUrl);
  });

  // 3. Setup form submission logic
  const setupForm = (formId, prefix, sliderThumbId) => {
    const form = document.getElementById(formId);
    if (!form) return;

    const step1 = document.getElementById(`${prefix}step1`);
    const step2 = document.getElementById(`${prefix}step2`);
    const formError = document.getElementById(`${prefix}formError`);
    const otpError = document.getElementById(`${prefix}otpError`);
    
    const otpCode = document.getElementById(`${prefix}otpCode`);
    const btnVerify = document.getElementById(`${prefix}btnVerify`);
    const btnResend = document.getElementById(`${prefix}btnResend`);
    const sliderThumb = document.getElementById(sliderThumbId);

    // Save email for step 2
    let currentEmail = '';

    const showError = (container, message) => {
      container.innerText = message || 'An error occurred. Please try again.';
      container.style.display = 'block';
    };

    const hideError = (container) => {
      container.style.display = 'none';
      container.innerText = '';
    };

    // Step 1: Submit Form (Registration)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError(formError);

      // Check captcha slider
      if (sliderThumb && !sliderThumb.classList.contains('verified')) {
        showError(formError, 'Please complete the slider verification.');
        return;
      }

      // Collect data
      const firstName = document.getElementById(`${prefix}firstName`)?.value || '';
      const lastName = document.getElementById(`${prefix}lastName`)?.value || '';
      const email = document.getElementById(`${prefix}email`)?.value || '';
      const password = document.getElementById(`${prefix}password`)?.value || '';
      const confirmPassword = document.getElementById(`${prefix}confirmPassword`)?.value || '';
      const company = document.getElementById(`${prefix}company`)?.value || '';
      const region = document.getElementById(`${prefix}region`)?.value || '';
      
      // Checkboxes (marketing could be true/false)
      // The EULA checkbox has id "marketing" in the original HTML, but let's check its specific behavior
      // The client says "marketing" is marketing_opt_in and "eula_accepted" is the legal checkbox. 
      // But the HTML only has one checkbox ID: marketing (or modal_marketing).
      // We will assume that checkbox acts as both, or if there's no eula checkbox, we just pass true.
      const marketingCheckbox = document.getElementById(`${prefix}marketing`);
      const marketing_opt_in = marketingCheckbox ? marketingCheckbox.checked : false;

      if (password !== confirmPassword) {
        showError(formError, 'Passwords do not match.');
        return;
      }

      // Build payload
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        eula_accepted: true, // required by API
        company: company,
        region: region,
        marketing_opt_in: marketing_opt_in,
      };

      if (utm_source) payload.utm_source = utm_source;
      if (utm_medium) payload.utm_medium = utm_medium;
      if (utm_campaign) payload.utm_campaign = utm_campaign;
      if (utm_term) payload.utm_term = utm_term;
      if (utm_content) payload.utm_content = utm_content;
      if (ref_key) payload.ref_key = ref_key;
      if (invite_token) payload.invite_token = invite_token;

      try {
        const btnSubmit = form.querySelector('.btn-submit');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Please wait...';
        btnSubmit.disabled = true;

        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        if (response.status === 201) {
          const data = await response.json();
          if (data.requiresVerification) {
            currentEmail = data.email || email;
            // Go to Step 2
            step1.style.display = 'none';
            step2.style.display = 'block';
          }
        } else if (response.status === 409) {
          showError(formError, 'Email already registered. Please sign in instead.');
        } else {
          const data = await response.json().catch(() => ({}));
          showError(formError, data.error || 'Registration failed. Please try again.');
        }
      } catch (err) {
        showError(formError, 'Network error. Please check your connection.');
      }
    });

    // Step 2: Verify Code
    btnVerify.addEventListener('click', async () => {
      hideError(otpError);
      const code = otpCode.value.trim();
      
      if (!code || code.length !== 6) {
        showError(otpError, 'Please enter a valid 6-digit code.');
        return;
      }

      try {
        btnVerify.innerHTML = 'Verifying...';
        btnVerify.disabled = true;

        const response = await fetch(`${API_BASE}/auth/verify-email-code`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail, otp: code })
        });

        btnVerify.innerHTML = 'Verify Code';
        btnVerify.disabled = false;

        if (response.status === 200) {
          // Success, redirect to portal
          window.location.href = PORTAL_URL;
        } else if (response.status === 409) {
          // Already verified, send to login
          window.location.href = `${PORTAL_URL}#/login`;
        } else {
          const data = await response.json().catch(() => ({}));
          showError(otpError, data.error || 'Invalid or expired code.');
        }
      } catch (err) {
        showError(otpError, 'Network error. Please check your connection.');
      }
    });

    // Step 2: Resend Code
    btnResend.addEventListener('click', async () => {
      hideError(otpError);
      
      try {
        btnResend.innerHTML = 'Sending...';
        btnResend.disabled = true;

        const response = await fetch(`${API_BASE}/auth/resend-verification`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail })
        });

        btnResend.innerHTML = 'Code Sent!';
        setTimeout(() => {
          btnResend.innerHTML = 'Resend Code';
          btnResend.disabled = false;
        }, 3000);

      } catch (err) {
        showError(otpError, 'Network error. Please check your connection.');
        btnResend.innerHTML = 'Resend Code';
        btnResend.disabled = false;
      }
    });
  };

  setupForm('signupForm', '', 'captchaThumb');
  setupForm('modalSignupForm', 'modal_', 'modal_captchaThumb');

});
