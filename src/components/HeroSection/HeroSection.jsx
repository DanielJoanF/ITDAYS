import { useState, useEffect } from 'react';
import './HeroSection.css';

const HeroSection = () => {
  const targetDate = new Date('2026-09-05T00:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const difference = targetDate - now;

    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">IT DAYS 2026</h1>
        <p className="hero-subtitle">Mens et Cospus</p>
        
        <div className="countdown-container glass-panel">
          <h2 className="countdown-label">Menuju Acara Utama</h2>
          <div className="countdown-timer">
            <div className="time-box">
              <span className="time-value">{timeLeft.days}</span>
              <span className="time-label">Hari</span>
            </div>
            <span className="time-separator">:</span>
            <div className="time-box">
              <span className="time-value">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="time-label">Jam</span>
            </div>
            <span className="time-separator">:</span>
            <div className="time-box">
              <span className="time-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="time-label">Menit</span>
            </div>
            <span className="time-separator">:</span>
            <div className="time-box">
              <span className="time-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="time-label">Detik</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
