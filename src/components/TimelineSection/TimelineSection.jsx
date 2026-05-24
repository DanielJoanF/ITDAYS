import './TimelineSection.css';

const TimelineSection = () => {
  const events = [
    {
      date: "01 – 30 Juni 2026",
      title: "Pendaftaran Gelombang 1",
      desc: "Pembukaan pendaftaran periode awal (Early Bird) untuk seluruh cabang kompetisi dengan tarif pendaftaran khusus.",
      status: "upcoming"
    },
    {
      date: "01 Juli – 15 Agustus 2026",
      title: "Pendaftaran Gelombang 2",
      desc: "Masa pendaftaran reguler dan batas akhir pengunggahan dokumen kelengkapan administratif tim peserta.",
      status: "upcoming"
    },
    {
      date: "16 – 25 Agustus 2026",
      title: "Penyisihan & Pengumpulan Karya",
      desc: "Periode submisi karya utama (proposal/desain/link repositori) dan proses kurasi oleh dewan juri ahli.",
      status: "upcoming"
    },
    {
      date: "30 Agustus 2026",
      title: "Pengumuman Finalis",
      desc: "Publikasi tim yang berhasil lolos ke babak utama untuk mempresentasikan karya mereka di hadapan para juri.",
      status: "upcoming"
    },
    {
      date: "05 September 2026",
      title: "Main Event & Awarding",
      desc: "Puncak acara IT DAYS 2026: presentasi finalis, seminar nasional, pengumuman juara, dan sesi penutupan.",
      status: "highlight"
    }
  ];

  return (
    <section className="timeline-section container" id="timeline">
      <div className="timeline-header">
        <h2 className="timeline-title text-display">TIMELINE<br />KEGIATAN</h2>
        <p className="timeline-subtitle">Ikuti alur rangkaian kegiatan IT DAYS 2026 dan catat tanggal-tanggal pentingnya.</p>
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>
        {events.map((event, idx) => (
          <div key={idx} className={`timeline-item ${idx % 2 === 0 ? 'left' : 'right'} ${event.status}`}>
            <div className="timeline-dot-wrapper">
              <div className="timeline-dot"></div>
            </div>
            <div className="timeline-content-card glass-panel">
              <span className="timeline-date text-display">{event.date}</span>
              <h3 className="timeline-event-title text-display">{event.title}</h3>
              <p className="timeline-event-desc">{event.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TimelineSection;
