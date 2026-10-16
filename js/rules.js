// Every offence and praise in one table. Detection lives in code; text, penalty and voice key live here.
// pen = Keselamatan lost (and competition marks lost); say = what the polis/cikgu says (pre-rendered ms-MY voice).

export const RULES = {
  // --- pejalan kaki ---
  LINTAS_BUKAN_TEMPAT: { t: 'Melintas bukan di tempat lintasan', why: 'Ada lintasan berdekatan. Gunakan lintasan zebra, lintasan pelikan atau lampu isyarat untuk melintas.', topic: 'Pejalan Kaki', pen: 20, say: 'Saman! Awak melintas bukan di tempat lintasan. Gunakan lintasan yang berdekatan.' },
  TIADA_KERB_DRILL: { t: 'Tidak buat latihan kerb', why: 'Sebelum melintas: berhenti di tepi jalan, lihat kanan, lihat kiri, lihat kanan semula, dan dengar.', topic: 'Pejalan Kaki', pen: 15, say: 'Saman! Berhenti dulu. Lihat kanan, kiri dan kanan semula sebelum melintas.' },
  LINTAS_MERAH: { t: 'Melintas ketika lampu orang merah', why: 'Tunggu lampu orang hijau menyala. Lampu merah bermaksud jangan melintas.', topic: 'Lampu Isyarat', pen: 25, say: 'Saman! Lampu orang masih merah. Tunggu lampu hijau.' },
  NYARIS: { t: 'Hampir dilanggar kenderaan', why: 'Kenderaan terpaksa membrek mengejut. Pastikan jalan selamat dan kenderaan berhenti sebelum melintas.', topic: 'Pejalan Kaki', pen: 30, say: 'Bahaya! Awak hampir dilanggar. Pastikan jalan benar-benar selamat.' },
  LINTAS_DEPAN_BAS: { t: 'Melintas di hadapan bas yang berhenti', why: 'Bas menghalang pandangan pemandu lain. Tunggu bas bergerak pergi, kemudian lintas di tempat yang selamat.', topic: 'Bas Sekolah', pen: 25, say: 'Saman! Jangan melintas di hadapan atau belakang bas. Tunggu bas pergi dahulu.' },
  BERJALAN_DI_JALAN: { t: 'Berjalan di atas jalan raya', why: 'Gunakan kaki lima atau bahu jalan. Jalan raya untuk kenderaan.', topic: 'Pejalan Kaki', pen: 15, say: 'Saman! Jangan berjalan di atas jalan raya. Gunakan kaki lima.' },
  BAS_GARISAN: { t: 'Tidak menunggu di belakang garisan kuning', why: 'Tunggu bas di belakang garisan kuning dan beratur. Naik bas hanya selepas bas berhenti sepenuhnya.', topic: 'Bas Sekolah', pen: 10, say: 'Tunggu di belakang garisan kuning dan beratur ya.' },
  BAJU_GELAP_MALAM: { t: 'Berjalan waktu senja tanpa pakaian cerah', why: 'Waktu senja dan malam, pakai baju cerah atau pemantul cahaya dan bawa lampu suluh supaya pemandu nampak awak.', topic: 'Pejalan Kaki', pen: 10, say: 'Waktu senja, pakai baju cerah supaya pemandu nampak awak.' },

  // --- basikal / kereta pedal ---
  TIADA_TOPI_KELEDAR: { t: 'Tidak memakai topi keledar', why: 'Topi keledar melindungi kepala jika terjatuh. Pakai dan ikat talinya setiap kali menunggang.', topic: 'Penunggang Basikal', pen: 20, say: 'Saman! Pakai topi keledar setiap kali menunggang basikal.' },
  MELAWAN_ARUS: { t: 'Menunggang melawan arus', why: 'Di Malaysia kita memandu di sebelah KIRI jalan. Sentiasa ikut arus lalu lintas.', topic: 'Penunggang Basikal', pen: 20, say: 'Saman! Awak melawan arus. Tunggang di sebelah kiri jalan.' },
  LANGGAR_LAMPU_MERAH: { t: 'Melanggar lampu isyarat merah', why: 'Lampu merah bermaksud BERHENTI di belakang garisan. Tunggu sehingga lampu hijau.', topic: 'Lampu Isyarat', pen: 30, say: 'Saman! Awak melanggar lampu merah. Berhenti di belakang garisan.' },
  TIDAK_BERHENTI: { t: 'Tidak berhenti di tanda BERHENTI', why: 'Di tanda BERHENTI, kenderaan mesti berhenti penuh di garisan, lihat kiri dan kanan, kemudian baru bergerak.', topic: 'Papan Tanda', pen: 20, say: 'Saman! Ada tanda berhenti. Awak mesti berhenti penuh dahulu.' },
  TIADA_ISYARAT: { t: 'Membelok tanpa isyarat', why: 'Beri isyarat tangan atau lampu sebelum membelok supaya pengguna jalan lain tahu arah awak.', topic: 'Penunggang Basikal', pen: 10, say: 'Saman! Beri isyarat sebelum membelok.' },
  ISYARAT_SALAH: { t: 'Memberi isyarat yang salah', why: 'Isyarat mesti sama dengan arah awak membelok. Isyarat salah mengelirukan pemandu lain.', topic: 'Penunggang Basikal', pen: 10, say: 'Isyarat awak salah arah. Hati-hati.' },
  KAKI_LIMA: { t: 'Menunggang di atas kaki lima', why: 'Kaki lima untuk pejalan kaki. Tunggang di jalan raya sebelah kiri atau di laluan basikal.', topic: 'Penunggang Basikal', pen: 10, say: 'Saman! Kaki lima untuk pejalan kaki.' },
  TIDAK_BERI_LALUAN: { t: 'Tidak memberi laluan kepada pejalan kaki', why: 'Pejalan kaki di lintasan mesti diberi laluan. Berhenti dan tunggu mereka selesai melintas.', topic: 'Papan Tanda', pen: 25, say: 'Saman! Beri laluan kepada pejalan kaki di lintasan.' },
  LANGGAR: { t: 'Berlanggar', why: 'Kawal kelajuan dan jaga jarak selamat dengan kenderaan di hadapan.', topic: 'Penunggang Basikal', pen: 30, say: 'Aduh! Kawal kelajuan dan jaga jarak selamat.' },
  MALAM_TANPA_LAMPU: { t: 'Menunggang waktu gelap tanpa lampu', why: 'Pasang lampu hadapan dan pemantul cahaya belakang ketika senja dan malam.', topic: 'Penunggang Basikal', pen: 15, say: 'Saman! Hari sudah gelap. Pasang lampu basikal.' },
  PARKIR_SALAH: { t: 'Tidak meletak kenderaan di dalam petak', why: 'Letak kenderaan di dalam petak dengan kemas dan lurus.', topic: 'Kereta Pedal', pen: 10, say: 'Letak kenderaan di dalam petak dengan kemas.' },

  // --- penumpang ---
  TIADA_TALI_PINGGANG: { t: 'Tidak memakai tali pinggang keledar', why: 'Semua penumpang, termasuk di belakang, wajib memakai tali pinggang keledar.', topic: 'Penumpang', pen: 20, say: 'Saman! Pakai tali pinggang keledar walaupun duduk di belakang.' },
  DUDUK_DEPAN: { t: 'Kanak-kanak duduk di kerusi hadapan', why: 'Kanak-kanak lebih selamat duduk di kerusi belakang, menggunakan kerusi keselamatan kanak-kanak atau tali pinggang.', topic: 'Penumpang', pen: 15, say: 'Kanak-kanak lebih selamat duduk di belakang.' },
  KELUAR_SEBELAH_JALAN: { t: 'Keluar kereta di sebelah jalan', why: 'Keluar di sebelah kiri, iaitu sebelah kaki lima, supaya tidak dilanggar kenderaan yang lalu.', topic: 'Penumpang', pen: 20, say: 'Bahaya! Keluar ikut pintu sebelah kaki lima.' },
  TOPI_TIDAK_DIIKAT: { t: 'Topi keledar tidak diikat', why: 'Topi keledar yang tidak diikat boleh tercabut ketika kemalangan. Ikat tali sehingga kemas.', topic: 'Penumpang', pen: 15, say: 'Saman! Ikat tali topi keledar dengan kemas.' },
  BONCENG_TIDAK_PEGANG: { t: 'Membonceng tanpa berpegang', why: 'Duduk tegak menghadap hadapan, kaki di tempat letak kaki dan berpegang pada pinggang penunggang.', topic: 'Penumpang', pen: 10, say: 'Pegang pinggang ayah dan duduk tegak.' },
};

export const GOOD = {
  KERB_OK: { t: 'Latihan kerb sempurna', pts: 10, say: 'Bagus! Kanan, kiri, kanan. Selamat melintas.' },
  TUNGGU_HIJAU: { t: 'Sabar menunggu lampu hijau', pts: 10, say: 'Syabas, awak sabar menunggu lampu hijau.' },
  GUNA_LINTASAN: { t: 'Melintas di lintasan', pts: 10, say: 'Bagus, awak guna lintasan pejalan kaki.' },
  BERHENTI_OK: { t: 'Berhenti penuh di tanda BERHENTI', pts: 10, say: 'Bagus, berhenti penuh di tanda berhenti.' },
  ISYARAT_OK: { t: 'Beri isyarat dengan betul', pts: 5, say: 'Isyarat yang betul.' },
  PILIHAN_BIJAK: { t: 'Pilihan yang selamat', pts: 10, say: 'Pilihan yang bijak!' },
  BERI_LALUAN_OK: { t: 'Memberi laluan kepada pejalan kaki', pts: 10, say: 'Terima kasih kerana memberi laluan.' },
  PARKIR_OK: { t: 'Letak kereta dengan kemas', pts: 15, say: 'Cantik! Letak kereta dalam petak dengan kemas.' },
};

// shared voice lines that are not rules
export const LINES = {
  kerb_berhenti: 'Berhenti di tepi jalan.',
  kerb_kanan: 'Lihat kanan.',
  kerb_kiri: 'Lihat kiri.',
  kerb_kanan2: 'Lihat kanan sekali lagi.',
  tekan_butang: 'Tekan butang dan tunggu lampu orang hijau.',
  misi_selesai: 'Tahniah! Misi selesai dengan selamat.',
  misi_gagal: 'Keselamatan awak terlalu rendah. Cuba lagi ya.',
  selamat_datang: 'Selamat datang ke Taman Bijak. Jom jadi pengguna jalan raya yang bijak!',
  piala_mula: 'Selamat datang ke Piala Lalu Lintas. Tunjukkan kemahiran keselamatan jalan raya anda!',
  stesen_mula: 'Bersedia. Mula!',
  stesen_tamat: 'Tamat! Mari lihat markah anda.',
  kuiz_betul: 'Betul!',
  kuiz_salah: 'Kurang tepat.',
  johan: 'Tahniah, johan Piala Lalu Lintas!',
  bas_tiba: 'Bas sudah tiba. Tunggu bas berhenti sepenuhnya.',
  bas_turun: 'Tunggu bas bergerak pergi sebelum melintas.',
};
