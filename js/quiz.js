// Kuiz PKJR question bank. c = index of the correct answer, sign = picture, lvl 1 easy … 3 hard.
export const QUIZ = [
  { lvl: 1, sign: 'berhenti', q: 'Apakah maksud papan tanda ini?', a: ['Berhenti penuh di garisan', 'Perlahankan kenderaan', 'Dilarang masuk'], c: 0, why: 'Tanda BERHENTI: kenderaan mesti berhenti penuh, lihat kiri dan kanan, kemudian baru bergerak.' },
  { lvl: 1, sign: 'lintasan', q: 'Papan tanda ini menunjukkan…', a: ['Lintasan pejalan kaki', 'Kawasan permainan', 'Perhentian bas'], c: 0, why: 'Tanda biru dengan pejalan kaki menunjukkan lintasan pejalan kaki.' },
  { lvl: 1, sign: 'kawasan_sekolah', q: 'Apakah maksud papan tanda ini?', a: ['Awas, kawasan sekolah', 'Taman permainan', 'Dilarang berjalan'], c: 0, why: 'Tanda kuning bergambar kanak-kanak bermaksud kawasan sekolah. Pemandu mesti perlahan.' },
  { lvl: 1, q: 'Lampu isyarat warna apakah bermaksud BERHENTI?', a: ['Merah', 'Kuning', 'Hijau'], c: 0, why: 'Merah = berhenti, kuning = bersedia untuk berhenti, hijau = jalan dengan berhati-hati.' },
  { lvl: 1, q: 'Sebelum melintas jalan, awak perlu melihat ke arah…', a: ['Kanan, kiri, kanan semula', 'Kiri sahaja', 'Hadapan sahaja'], c: 0, why: 'Di Malaysia kenderaan di lorong terdekat datang dari kanan. Lihat kanan, kiri, kanan semula.' },
  { lvl: 1, q: 'Di manakah tempat paling selamat untuk melintas jalan?', a: ['Di lintasan zebra atau jejantas', 'Di antara kereta yang diletak', 'Di selekoh jalan'], c: 0, why: 'Gunakan lintasan zebra, lintasan pelikan, lampu isyarat atau jejantas.' },
  { lvl: 1, q: 'Apakah yang mesti dipakai ketika menunggang basikal?', a: ['Topi keledar', 'Topi koboi', 'Cermin mata hitam'], c: 0, why: 'Topi keledar melindungi kepala jika terjatuh.' },
  { lvl: 1, q: 'Di dalam kereta, kanak-kanak paling selamat duduk di…', a: ['Kerusi belakang', 'Kerusi depan', 'Riba ibu di depan'], c: 0, why: 'Kanak-kanak paling selamat di kerusi belakang dengan tali pinggang atau kerusi keselamatan.' },
  { lvl: 1, q: 'Lampu orang berwarna hijau bermaksud…', a: ['Boleh melintas dengan berhati-hati', 'Jangan melintas', 'Berlari cepat'], c: 0, why: 'Lampu orang hijau: boleh melintas, tetapi masih perlu melihat kiri dan kanan.' },
  { lvl: 1, q: 'Di Malaysia, kenderaan bergerak di sebelah…', a: ['Kiri jalan', 'Kanan jalan', 'Tengah jalan'], c: 0, why: 'Malaysia memandu di sebelah kiri jalan.' },
  { lvl: 1, sign: 'had_laju_30', q: 'Nombor 30 dalam bulatan merah bermaksud…', a: ['Had laju 30 km/j', 'Jarak 30 meter', 'Jalan nombor 30'], c: 0, why: 'Bulatan merah bernombor ialah had laju maksimum.' },
  { lvl: 1, q: 'Apakah nombor talian kecemasan di Malaysia?', a: ['999', '911', '123'], c: 0, why: 'Hubungi 999 untuk polis, ambulans dan bomba.' },
  { lvl: 1, q: 'Waktu malam, pakaian apakah yang sesuai ketika berjalan?', a: ['Pakaian cerah atau berpemantul', 'Pakaian hitam', 'Pakaian gelap'], c: 0, why: 'Pakaian cerah dan pemantul cahaya membuat awak mudah dilihat pemandu.' },
  { lvl: 1, q: 'Ketika menunggu bas sekolah, awak perlu…', a: ['Beratur di belakang garisan', 'Berdiri di atas jalan', 'Berlari mengejar bas'], c: 0, why: 'Tunggu di belakang garisan dan beratur. Naik selepas bas berhenti.' },
  { lvl: 1, q: 'Bolehkah kita bermain bola di tepi jalan raya?', a: ['Tidak, ia bahaya', 'Boleh jika tiada kereta', 'Boleh pada waktu petang'], c: 0, why: 'Bermain di tepi jalan sangat bahaya. Bermain di taman atau padang.' },

  { lvl: 2, sign: 'beri_laluan', q: 'Apakah tindakan pemandu apabila melihat tanda ini?', a: ['Beri laluan kepada kenderaan di jalan utama', 'Memecut laju', 'Membunyikan hon'], c: 0, why: 'BERI LALUAN: perlahan dan beri laluan, berhenti jika perlu.' },
  { lvl: 2, sign: 'dilarang_masuk', q: 'Apakah maksud papan tanda ini?', a: ['Dilarang masuk', 'Jalan mati', 'Berhenti sebentar'], c: 0, why: 'Bulatan merah dengan palang putih: kenderaan dilarang masuk.' },
  { lvl: 2, sign: 'lampu_isyarat', q: 'Papan tanda amaran ini bermaksud…', a: ['Ada lampu isyarat di hadapan', 'Lampu jalan rosak', 'Kawasan pesta'], c: 0, why: 'Tanda kuning bergambar lampu isyarat memberi amaran ada lampu isyarat di hadapan.' },
  { lvl: 2, sign: 'laluan_basikal', q: 'Papan tanda biru ini menunjukkan…', a: ['Laluan basikal', 'Basikal dilarang', 'Kedai basikal'], c: 0, why: 'Bulatan biru bergambar basikal ialah laluan basikal.' },
  { lvl: 2, sign: 'bas', q: 'Papan tanda ini menunjukkan…', a: ['Perhentian bas', 'Bas dilarang', 'Terminal kapal terbang'], c: 0, why: 'Tanda BAS menunjukkan perhentian bas.' },
  { lvl: 2, sign: 'awas_pejalan', q: 'Tanda amaran kuning ini bermaksud…', a: ['Awas pejalan kaki', 'Jalan licin', 'Kawasan larian'], c: 0, why: 'Pemandu perlu berhati-hati kerana ada pejalan kaki.' },
  { lvl: 2, q: 'Jika tiada kaki lima, pejalan kaki patut berjalan…', a: ['Di sebelah kanan jalan, menghadap kenderaan', 'Di tengah jalan', 'Membelakangi kenderaan di kiri'], c: 0, why: 'Berjalan menghadap lalu lintas supaya awak nampak kenderaan yang datang.' },
  { lvl: 2, q: 'Apakah isyarat tangan untuk membelok ke KANAN ketika berbasikal?', a: ['Hulur tangan kanan lurus ke sisi', 'Angkat kedua-dua tangan', 'Lambai tangan kiri'], c: 0, why: 'Hulurkan tangan kanan lurus ke sisi sebelum membelok ke kanan.' },
  { lvl: 2, q: 'Selepas turun dari bas, bilakah boleh melintas jalan?', a: ['Selepas bas bergerak pergi', 'Terus di hadapan bas', 'Di belakang bas yang masih berhenti'], c: 0, why: 'Bas menghalang pandangan. Tunggu bas pergi supaya awak dan pemandu boleh nampak.' },
  { lvl: 2, q: 'Lampu kuning (ambar) pada lampu isyarat bermaksud…', a: ['Bersedia untuk berhenti', 'Pecut sebelum merah', 'Boleh terus jalan'], c: 0, why: 'Kuning bermaksud bersedia untuk berhenti jika selamat berbuat demikian.' },
  { lvl: 2, q: 'Di lintasan pelikan, apakah yang perlu dibuat dahulu?', a: ['Tekan butang dan tunggu lampu orang hijau', 'Terus melintas', 'Melambai kepada pemandu'], c: 0, why: 'Lintasan pelikan dikawal oleh butang. Tunggu lampu orang hijau.' },
  { lvl: 2, q: 'Apakah fungsi pemantul cahaya pada basikal?', a: ['Supaya basikal mudah dilihat pada waktu gelap', 'Sebagai hiasan', 'Supaya basikal laju'], c: 0, why: 'Pemantul memantulkan cahaya lampu kenderaan lain supaya awak dilihat.' },
  { lvl: 2, q: 'Ketika membonceng motosikal, topi keledar mesti…', a: ['Dipakai dan diikat kemas', 'Dipegang di tangan', 'Diletak di dalam bakul'], c: 0, why: 'Topi keledar yang tidak diikat boleh tercabut ketika kemalangan.' },
  { lvl: 2, q: 'Keluar dari kereta, guna pintu di sebelah…', a: ['Kaki lima (kiri)', 'Jalan raya (kanan)', 'Mana-mana sahaja'], c: 0, why: 'Keluar di sebelah kaki lima, jauh dari kenderaan yang lalu.' },
  { lvl: 2, q: 'Apakah yang dimaksudkan dengan "zon sekolah"?', a: ['Kawasan sekitar sekolah, kenderaan perlu perlahan', 'Kawasan letak kereta guru', 'Padang sekolah'], c: 0, why: 'Zon sekolah mempunyai had laju rendah kerana ramai murid.' },

  { lvl: 3, sign: 'bulatan', q: 'Papan tanda ini memberi amaran tentang…', a: ['Bulatan di hadapan', 'Jalan berpusing-pusing', 'Kawasan kitar semula'], c: 0, why: 'Anak panah dalam bulatan menunjukkan bulatan di hadapan. Beri laluan kepada kenderaan dari kanan.' },
  { lvl: 3, sign: 'dilarang_pusing_u', q: 'Apakah maksud papan tanda ini?', a: ['Dilarang membuat pusingan U', 'Pusingan U di hadapan', 'Jalan sehala'], c: 0, why: 'Palang merah pada anak panah U: pusingan U dilarang.' },
  { lvl: 3, sign: 'dilarang_basikal', q: 'Papan tanda ini bermaksud…', a: ['Basikal tidak dibenarkan', 'Laluan basikal', 'Pertandingan basikal'], c: 0, why: 'Bulatan merah dengan basikal bermaksud basikal dilarang memasuki jalan itu.' },
  { lvl: 3, sign: 'simpang_empat', q: 'Tanda amaran ini bermaksud…', a: ['Simpang empat di hadapan', 'Hospital', 'Gereja'], c: 0, why: 'Tanda + pada papan kuning: simpang empat di hadapan.' },
  { lvl: 3, sign: 'dilarang_letak', q: 'Apakah maksud papan tanda ini?', a: ['Dilarang meletak kenderaan', 'Tempat letak kereta', 'Dilarang berhenti makan'], c: 0, why: 'Bulatan biru berbingkai merah dengan satu palang: dilarang meletak kenderaan.' },
  { lvl: 3, sign: 'jalan_licin', q: 'Papan tanda ini memberi amaran…', a: ['Jalan licin', 'Kereta berlumba', 'Jalan berbukit'], c: 0, why: 'Kereta dengan kesan tayar berliku: jalan licin, terutama waktu hujan.' },
  { lvl: 3, q: 'Di bulatan, kenderaan perlu memberi laluan kepada kenderaan dari arah…', a: ['Kanan', 'Kiri', 'Belakang'], c: 0, why: 'Di Malaysia, beri laluan kepada kenderaan yang sudah berada di dalam bulatan, iaitu dari kanan.' },
  { lvl: 3, q: 'Mengapakah kita perlu melihat ke KANAN dahulu sebelum melintas?', a: ['Kenderaan di lorong terdekat datang dari kanan', 'Kerana kanan lebih penting', 'Supaya nampak kedai'], c: 0, why: 'Di Malaysia kenderaan bergerak di kiri, jadi lorong terdekat membawa kenderaan dari kanan.' },
  { lvl: 3, q: 'Jarak berhenti kenderaan bertambah jauh apabila…', a: ['Kenderaan laju dan jalan basah', 'Kenderaan perlahan', 'Hari panas'], c: 0, why: 'Semakin laju dan semakin licin jalan, semakin jauh jarak untuk berhenti.' },
  { lvl: 3, q: 'Apakah maksud lampu orang hijau yang berkelip?', a: ['Jangan mula melintas; jika sudah di tengah, teruskan', 'Mula melintas cepat', 'Lampu rosak'], c: 0, why: 'Lampu berkelip bermaksud masa hampir tamat. Jangan mula melintas.' },
  { lvl: 3, q: 'Apakah titik buta (blind spot) bagi kenderaan besar?', a: ['Kawasan yang tidak dapat dilihat oleh pemandu', 'Lampu belakang', 'Tempat duduk pemandu'], c: 0, why: 'Pemandu lori dan bas tidak nampak kawasan tertentu di sekeliling kenderaan. Jauhi kawasan itu.' },
  { lvl: 3, q: 'Apakah yang perlu dilakukan jika melihat kemalangan?', a: ['Beritahu orang dewasa dan hubungi 999', 'Pergi dekat untuk melihat', 'Ambil gambar sahaja'], c: 0, why: 'Jauhkan diri dari bahaya, beritahu orang dewasa dan hubungi 999.' },
  { lvl: 3, q: 'Penunggang basikal patut menunggang…', a: ['Satu barisan di sebelah kiri jalan', 'Berpasangan di tengah jalan', 'Melawan arus supaya nampak kereta'], c: 0, why: 'Tunggang satu barisan di sebelah kiri, ikut arus lalu lintas.' },
  { lvl: 3, q: 'Pertandingan Lalu Lintas Shell di Sarawak mula diadakan pada tahun…', a: ['1963', '2015', '1990'], c: 0, why: 'Shell Traffic Games bermula pada 1963 dan kini diteruskan sebagai Sarawak Traffic Games.' },
];

export function pickQuiz(level, n = 10) {
  const pool = QUIZ.filter(q => q.lvl <= level);
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  // shuffle answers too, keeping track of the right one
  return pool.slice(0, n).map(q => {
    const order = q.a.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { ...q, a: order.map(i => q.a[i]), c: order.indexOf(q.c) };
  });
}
