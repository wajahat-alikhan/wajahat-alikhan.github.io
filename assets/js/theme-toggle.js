// assets/js/theme-toggle.js

document.addEventListener('DOMContentLoaded', function () {
  const toggleButton = document.getElementById('theme-toggle-button');
  const body = document.body;
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');

  // Function to apply the saved theme or default to light
  function applyTheme() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
      body.classList.add('dark-mode');
      if (sunIcon) sunIcon.style.display = 'inline-block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      body.classList.remove('dark-mode');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline-block';
    }
  }

  // Function to toggle the theme
  function toggleTheme() {
    if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline-block';
    } else {
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
      if (sunIcon) sunIcon.style.display = 'inline-block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
  }

  // Apply theme on initial load
  applyTheme();

  // Add event listener to the button
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleTheme);
  } else {
    console.warn('Theme toggle button not found');
  }
});
