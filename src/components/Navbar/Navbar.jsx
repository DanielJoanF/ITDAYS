import { useState, useEffect } from 'react';
import './Navbar.css';
import logoImg from '../../assets/logo-itdays.png';

const Navbar = () => {
  const [activeSection, setActiveSection] = useState('home');

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
        <ul className="nav-menu">
          <li className="nav-item">
            <a href="#home" className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}>Beranda</a>
          </li>
          <li className="nav-item">
            <a href="#about" className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}>Tentang</a>
          </li>
          <li className="nav-item">
            <a href="#timeline" className={`nav-link ${activeSection === 'timeline' ? 'active' : ''}`}>Timeline</a>
          </li>
          <li className="nav-item">
            <a href="#registration" className={`nav-link ${activeSection === 'registration' ? 'active' : ''}`}>Pendaftaran</a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
