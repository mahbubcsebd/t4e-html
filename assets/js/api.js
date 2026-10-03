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
    let googleUrl = `https://portal.think4ever.com/#/login?login=google`;
    if (ref_key) googleUrl += `&ref=${encodeURIComponent(ref_key)}`;
    if (invite_token) googleUrl += `&inv=${encodeURIComponent(invite_token)}`;
    
    if (utm_source) googleUrl += `&utm_source=${encodeURIComponent(utm_source)}`;
    if (utm_medium) googleUrl += `&utm_medium=${encodeURIComponent(utm_medium)}`;
    if (utm_campaign) googleUrl += `&utm_campaign=${encodeURIComponent(utm_campaign)}`;
    if (utm_term) googleUrl += `&utm_term=${encodeURIComponent(utm_term)}`;
    if (utm_content) googleUrl += `&utm_content=${encodeURIComponent(utm_content)}`;
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
    
    
    const otpInputs = document.querySelectorAll(`#${prefix}otpGroup .otp-input`);
    const btnVerify = document.getElementById(`${prefix}btnVerify`);
    const btnResend = document.getElementById(`${prefix}btnResend`);
    const sliderThumb = document.getElementById(sliderThumbId);

    // Setup OTP Inputs behavior
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        // Only allow numbers
        input.value = input.value.replace(/[^0-9]/g, '');
        
        if (input.value.length === 1) {
          if (index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          } else {
            input.blur();
          }
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
      
      // Handle paste
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
        if (pastedData) {
          for (let i = 0; i < Math.min(pastedData.length, otpInputs.length - index); i++) {
            otpInputs[index + i].value = pastedData[i];
            if (index + i < otpInputs.length - 1) {
              otpInputs[index + i + 1].focus();
            } else {
              otpInputs[index + i].blur();
            }
          }
        }
      });
    });

    const getOtpCode = () => {
      let code = '';
      otpInputs.forEach(input => code += input.value);
      return code;
    };


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
        email: email,
        password: password,
        eula_accepted: true,
        marketing_opt_in: marketing_opt_in,
      };
      if (firstName) payload.first_name = firstName;
      if (lastName) payload.last_name = lastName;
      if (company) payload.company = company;
      if (region) payload.region = region;

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
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
      const code = getOtpCode();
      
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
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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

  // Setup Login Form
  const setupLoginForm = () => {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const step1 = document.getElementById('login_step1');
    const step2 = document.getElementById('login_step2');
    const formError = document.getElementById('login_formError');
    const otpError = document.getElementById('login_otpError');
    
    // OTP Inputs setup
    const otpInputs = document.querySelectorAll('#login_otpGroup .otp-input');
    const btnVerify = document.getElementById('login_btnVerify');
    const btnResend = document.getElementById('login_btnResend');

    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value.length === 1) {
          if (index < otpInputs.length - 1) otpInputs[index + 1].focus();
          else input.blur();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) otpInputs[index - 1].focus();
      });
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
        if (pastedData) {
          for (let i = 0; i < Math.min(pastedData.length, otpInputs.length - index); i++) {
            otpInputs[index + i].value = pastedData[i];
            if (index + i < otpInputs.length - 1) otpInputs[index + i + 1].focus();
            else otpInputs[index + i].blur();
          }
        }
      });
    });

    const getOtpCode = () => {
      let code = '';
      otpInputs.forEach(input => code += input.value);
      return code;
    };

    let currentEmail = '';

    const showError = (container, message) => {
      container.innerText = message || 'An error occurred. Please try again.';
      container.style.display = 'block';
    };
    const hideError = (container) => {
      container.style.display = 'none';
      container.innerText = '';
    };

    // Submit Login
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError(formError);
      
      const email = document.getElementById('login_email').value;
      const password = document.getElementById('login_password').value;
      
      try {
        const btnSubmit = form.querySelector('.btn-submit');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Logging in...';
        btnSubmit.disabled = true;

        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        if (response.status === 200) {
          window.location.href = PORTAL_URL;
        } else if (response.status === 403) {
          const data = await response.json().catch(() => ({}));
          if (data.requiresVerification) {
            currentEmail = data.email || email;
            step1.style.display = 'none';
            step2.style.display = 'block';
          } else {
            showError(formError, data.error || 'Access denied.');
          }
        } else {
          const data = await response.json().catch(() => ({}));
          showError(formError, data.error || 'Invalid credentials. Please try again.');
        }
      } catch (err) {
        showError(formError, 'Network error. Please check your connection.');
      }
    });

    // Verify OTP
    btnVerify.addEventListener('click', async () => {
      hideError(otpError);
      const code = getOtpCode();
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
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: currentEmail, otp: code })
        });

        btnVerify.innerHTML = 'Verify Code';
        btnVerify.disabled = false;

        if (response.status === 200) {
          window.location.href = PORTAL_URL;
        } else {
          const data = await response.json().catch(() => ({}));
          showError(otpError, data.error || 'Invalid or expired code.');
        }
      } catch (err) {
        showError(otpError, 'Network error. Please check your connection.');
      }
    });

    // Resend OTP
    btnResend.addEventListener('click', async () => {
      hideError(otpError);
      try {
        btnResend.innerHTML = 'Sending...';
        btnResend.disabled = true;
        await fetch(`${API_BASE}/auth/resend-verification`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: currentEmail })
        });
        btnResend.innerHTML = 'Code Sent!';
        setTimeout(() => {
          btnResend.innerHTML = 'Resend Code';
          btnResend.disabled = false;
        }, 3000);
      } catch (err) {
        showError(otpError, 'Network error.');
        btnResend.innerHTML = 'Resend Code';
        btnResend.disabled = false;
      }
    });
  };

  setupLoginForm();


});
