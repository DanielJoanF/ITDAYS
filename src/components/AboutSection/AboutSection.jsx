import './AboutSection.css';

const AboutSection = () => {
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
    </section>
  );
};

export default AboutSection;
