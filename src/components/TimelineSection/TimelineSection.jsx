import './TimelineSection.css';

const TimelineSection = () => {
  const events = [
    {
      date: "01 Agustus – 08 September 2026",
      title: "Pendaftaran Lomba",
      desc: "Masa pendaftaran dan pengunggahan berkas administratif untuk seluruh cabang kompetisi IT DAYS 2026.",
      status: "upcoming"
    },
    {
      date: "09 September 2026",
      title: "Technical Meeting",
      desc: "Penjelasan regulasi, tata tertib, dan teknis pelaksanaan masing-masing cabang lomba.",
      status: "upcoming"
    },
    {
      date: "12 September 2026",
      title: "Penyisihan ML & Badminton",
      desc: "Babak kualifikasi awal untuk cabang kompetisi Mobile Legends dan Badminton.",
      status: "upcoming"
    },
    {
      date: "13 September 2026",
      title: "Final ML & Badminton",
      desc: "Babak final penentu juara untuk cabang kompetisi Mobile Legends dan Badminton.",
      status: "upcoming"
    },
    {
      date: "23 September 2026",
      title: "Deadline Pengumpulan UI/UX & Poster",
      desc: "Batas akhir pengumpulan karya kreatif dan desain untuk cabang lomba UI/UX serta Poster.",
      status: "upcoming"
    },
    {
      date: "27 September 2026",
      title: "Penilaian UI/UX & Poster",
      desc: "Proses penjurian karya yang telah dikumpulkan untuk menentukan pemenang lomba UI/UX dan Poster.",
      status: "upcoming"
    },
    {
      date: "03 – 04 Oktober 2026",
      title: "Penyisihan Futsal",
      desc: "Babak penyisihan grup pertandingan futsal.",
      status: "upcoming"
    },
    {
      date: "04 Oktober 2026",
      title: "Seleksi Web Dev",
      desc: "Proses kurasi dan presentasi seleksi karya Web Development.",
      status: "upcoming"
    },
    {
      date: "10 Oktober 2026",
      title: "Final Futsal",
      desc: "Pertandingan final perebutan juara futsal.",
      status: "upcoming"
    },
    {
      date: "10 Oktober 2026",
      title: "Final Web Dev",
      desc: "Presentasi finalis dan penilaian akhir karya Web Development.",
      status: "upcoming"
    },
    {
      date: "17 Oktober 2026",
      title: "Kompetisi Vocal",
      desc: "Penampilan langsung peserta dan penjurian cabang lomba Vocal.",
      status: "upcoming"
    },
    {
      date: "18 Oktober 2026",
      title: "Malam Apresiasi Mahasiswa",
      desc: "Acara puncak penutupan IT DAYS 2026 dan penyerahan penghargaan kepada para pemenang.",
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
