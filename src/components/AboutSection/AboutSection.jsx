import './AboutSection.css';

const AboutSection = () => {
  const highlights = [
    {
      title: "INOVASI TEKNOLOGI",
      description: "Mendorong lahirnya ide-ide solutif dan kreatif yang relevan dalam menjawab berbagai tantangan riil di era transformasi digital saat ini.",
      icon: "💡"
    },
    {
      title: "KOMPETISI NASIONAL",
      description: "Wadah kompetisi bergengsi tingkat nasional untuk menguji kemampuan terbaikmu dalam cabang UI/UX Design dan Web Development.",
      icon: "🏆"
    },
    {
      title: "JEJARING KOLABORATIF",
      description: "Membangun koneksi profesional, bertukar wawasan, dan berkolaborasi bersama ratusan talenta digital dari berbagai instansi di Indonesia.",
      icon: "🤝"
    }
  ];

  return (
    <section className="about-section container" id="about">
      <div className="about-header">
        <h2 className="about-title text-display">TENTANG<br />IT DAYS 2026</h2>
        <div className="about-subtitle-wrapper">
          <p className="about-subtitle-lead">
            Mens et Corpus — Memadukan Ketangguhan Pikiran dan Kekuatan Karya Digital.
          </p>
          <p className="about-desc">
            IT DAYS 2026 adalah festival teknologi tahunan terbesar yang dirancang khusus untuk mewadahi minat, bakat, serta kreativitas generasi muda di bidang teknologi informasi. Kami percaya bahwa inovasi sejati lahir dari sinergi pemikiran yang tajam serta ekosistem yang kolaboratif. Tahun ini, kami hadir untuk menantang batas kemampuanmu dan membantumu tumbuh menjadi inovator masa depan yang siap memberikan dampak nyata bagi masyarakat.
          </p>
        </div>
      </div>

      <div className="about-grid">
        {highlights.map((item, idx) => (
          <div key={idx} className="about-card glass-panel">
            <div className="about-card-icon">{item.icon}</div>
            <h3 className="about-card-title text-display">{item.title}</h3>
            <p className="about-card-desc">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AboutSection;
