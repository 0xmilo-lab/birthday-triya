/* Isi file ini saja untuk mengganti semua teks, foto, video, dan musik. */
const CONFIG = {
  namaIstri: "Triya Devi",
  namaSaya: "Muhammad Hanafi",
  /* true = mode produksi (countdown mengunci tombol). false = mode develop (semua terbuka). */
  terkunci: false,
  /* Format: "YYYY-MM-DDTHH:mm:ss". Kosongkan ("") agar tombol hadiah langsung aktif. */
  tanggalUlangTahun: "2026-10-02T00:00:00",
  suratJudul: "Happy Birthday",
  suratIsi: [
    "Selamat ulang untuk istri ku Triya Devi yang ke 28thn.",
    "Semoga selalu diberikan kesehatan dan perlindungan ketika kita berjauhan, segala yang diingin tercapai dan selalu dimudahkan segala urusan.",
    "Maaf kalau aku masih banyak kurang dan selalu terus belajar setiap hari nya."
  ],
  /* Baris baru = paragraf baru di halaman Wishes. */
  ucapanSingkat: "Semoga selalu diberikan kesehatan dan perlindungan ketika kita berjauhan.\nSegala yang diingin tercapai dan selalu dimudahkan segala urusan.",
  penutup: [
    "Maaf kalau aku masih banyak kurang dan selalu terus belajar setiap hari nya.",
    "Selamat ulang tahun yang ke-28 untuk istriku tercinta."
  ],
  /* 6-12 foto. Contoh: { src: "assets/photos/1.webp", caption: "Senja itu" } */
  foto: [
    { src: "assets/photos/1.webp", caption: "" },
    { src: "assets/photos/2.webp", caption: "" },
    { src: "assets/photos/3.webp", caption: "" },
    { src: "assets/photos/4.webp", caption: "" },
    { src: "assets/photos/5.webp", caption: "" },
    { src: "assets/photos/6.webp", caption: "" }
  ],
  video: { src: "assets/video/pesan.mp4", poster: "assets/video/poster.webp" },
  musik: "",
  /* Milo si kucing mandiri: jalan random, lari ke titik klik. aktif:false untuk sembunyikan. */
  kucing: { nama: "Milo", aktif: true }
};
