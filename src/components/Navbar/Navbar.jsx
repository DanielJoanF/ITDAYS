import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar glass-panel">
      <div className="nav-container">
        <div className="nav-logo">
          <span className="logo-text">IT DAYS</span>
          <span className="logo-dot">.</span>
        </div>
        <ul className="nav-menu">
          <li className="nav-item"><a href="#" className="nav-link active">Beranda</a></li>
          <li className="nav-item"><a href="#about" className="nav-link">Tentang</a></li>
          <li className="nav-item"><a href="#timeline" className="nav-link">Timeline</a></li>
          <li className="nav-item"><a href="#registration" className="nav-link">Pendaftaran</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
