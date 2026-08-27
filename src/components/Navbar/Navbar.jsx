import { useState, useEffect } from 'react';
import './Navbar.css';
import logoImg from '../../assets/logo-itdays.png';

const Navbar = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'timeline', 'registration'];
      const scrollPosition = window.scrollY + 150; // offset for header height

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const offsetTop = el.offsetTop;
          const offsetHeight = el.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="navbar glass-panel">
      <div className="nav-container">
        <a href="#home" className="nav-logo">
          <img src={logoImg} alt="IT DAYS 2026 Logo" className="logo-img" />
        </a>
        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
          <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <ul className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <a href="#home" className={`nav-link ${activeSection === 'home' ? 'active' : ''}`} onClick={closeMobileMenu}>Beranda</a>
          </li>
          <li className="nav-item">
            <a href="#about" className={`nav-link ${activeSection === 'about' ? 'active' : ''}`} onClick={closeMobileMenu}>Tentang</a>
          </li>
          <li className="nav-item">
            <a href="#timeline" className={`nav-link ${activeSection === 'timeline' ? 'active' : ''}`} onClick={closeMobileMenu}>Timeline</a>
          </li>
          <li className="nav-item">
            <a href="#registration" className={`nav-link ${activeSection === 'registration' ? 'active' : ''}`} onClick={closeMobileMenu}>Pendaftaran</a>
          </li>
          <li className="nav-item">
            <a 
              href="https://docs.google.com/document/d/1mv1nM7cxvZ7gLDJpHmMSlIG9MDVm1kzuAT-TfqJpyuk/edit?usp=drivesdk" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="nav-link"
              onClick={closeMobileMenu}
            >
              Peraturan
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
