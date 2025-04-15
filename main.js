// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');

  // Mobile menu functionality
  const mobileMenuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeMenuButton = document.querySelector('.close-menu-btn');

  console.log('Mobile menu button:', mobileMenuButton);
  console.log('Mobile menu:', mobileMenu);
  console.log('Close menu button:', closeMenuButton);

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function(e) {
      console.log('Mobile menu button clicked');
      e.preventDefault();
      mobileMenu.classList.add('active');
      document.body.classList.add('overflow-hidden');
    });
  }

  if (closeMenuButton && mobileMenu) {
    closeMenuButton.addEventListener('click', function(e) {
      console.log('Close menu button clicked');
      e.preventDefault();
      mobileMenu.classList.remove('active');
      document.body.classList.remove('overflow-hidden');
    });
  }

  // Also close menu when clicking outside
  if (mobileMenu) {
    mobileMenu.addEventListener('click', function(e) {
      if (e.target === mobileMenu) {
        console.log('Clicked outside menu content');
        mobileMenu.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
      }
    });
  }

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }

      // Close mobile menu if open
      if (mobileMenu && mobileMenu.classList.contains('active')) {
        mobileMenu.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
      }
    });
  });

  // Fix for FontAwesome
  const fontAwesomeScript = document.querySelector('script[src="https://kit.fontawesome.com/a076d05399.js"]');
  if (fontAwesomeScript) {
    fontAwesomeScript.remove();
    const newScript = document.createElement('script');
    newScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/js/all.min.js';
    document.head.appendChild(newScript);
  }
});
