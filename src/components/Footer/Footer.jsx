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
              <li>
                <a 
                  href="https://docs.google.com/document/d/1mv1nM7cxvZ7gLDJpHmMSlIG9MDVm1kzuAT-TfqJpyuk/edit?usp=drivesdk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Peraturan
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Kontak Kami</h4>
            <ul>
              <li><a href="mailto:usditdays@gmail.com">usditdays@gmail.com</a></li>
              <li><a href="https://instagram.com/itdays_usd" target="_blank" rel="noopener noreferrer">Instagram @itdays_usd</a></li>
              <li>
                <a href="https://wa.me/6289662414908" target="_blank" rel="noopener noreferrer">
                  CP: +62 896-6241-4908 - Jodi
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Pembayaran</h4>
            <ul>
              <li>
                <span className="footer-info-text">
                  Rekening: 1383 0100 3277 502 (BRI) a/n Elisabeth Laura A
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 IT DAYS Universitas Sanata Dharma. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
