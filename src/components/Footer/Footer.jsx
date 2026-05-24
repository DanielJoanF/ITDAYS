import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer glass-panel">
      <div className="footer-content">
        <div className="footer-brand">
          <h3 className="footer-title">IT DAYS 2026</h3>
          <p className="footer-desc">
            Acara teknologi tahunan terbesar yang menyatukan inovator, kreator, dan peminat teknologi dalam satu ekosistem digital.
          </p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Tautan Cepat</h4>
            <ul>
              <li><a href="#">Beranda</a></li>
              <li><a href="#about">Tentang</a></li>
              <li><a href="#timeline">Timeline</a></li>
              <li><a href="#registration">Pendaftaran</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Kontak Kami</h4>
            <ul>
              <li><a href="mailto:info@itdays.id">info@itdays.id</a></li>
              <li><a href="#">Instagram @itdays</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 IT DAYS. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
