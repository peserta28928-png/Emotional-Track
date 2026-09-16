import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const MOODS = [
  ['happy', 'Senang', '☀️'],
  ['calm', 'Tenang', '🌿'],
  ['excited', 'Semangat', '✨'],
  ['sad', 'Sedih', '☁️'],
  ['anxious', 'Cemas', '🌫️'],
  ['angry', 'Marah', '⚡'],
];

const moodLabel = (id) => MOODS.find((x) => x[0] === id)?.[1] || id;
const moodEmoji = (id) => MOODS.find((x) => x[0] === id)?.[2] || '🙂';
const NEGATIVE = new Set(['sad', 'anxious', 'angry']);

const css = `
*{box-sizing:border-box}
body{margin:0;background:#eef1f7;color:#202334;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,textarea,select{font:inherit}
button{cursor:pointer}
.app{min-height:100vh;padding:24px}
.shell{max-width:1120px;margin:auto;background:#fff;border-radius:24px;box-shadow:0 18px 50px rgba(30,38,70,.12);overflow:hidden}
.top{padding:18px 24px;border-bottom:1px solid #e9ebf2;display:flex;align-items:center;justify-content:space-between}
.brand{font-weight:800;font-size:20px}
.muted{color:#747b91}
.content{padding:28px}
.grid{display:grid;gap:18px}
.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.card{border:1px solid #e5e8f0;border-radius:18px;padding:20px;background:#fff}
.soft{background:#f7f8fc}
.btn{border:0;border-radius:12px;padding:11px 15px;font-weight:700}
.primary{background:#202334;color:#fff}
.secondary{background:#eef0f6;color:#30364b}
.danger{background:#fff0ef;color:#b33d35}
.input{width:100%;border:1px solid #dfe3ec;border-radius:12px;padding:12px;margin-top:6px;background:#fff}
.label{font-size:13px;font-weight:700}
.nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}
.nav button{border:1px solid #e2e5ed;background:#fff;padding:9px 13px;border-radius:999px;font-weight:700}
.nav button.active{background:#202334;color:#fff}
.moodgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mood{border:1px solid #e1e5ed;background:#fff;border-radius:15px;padding:14px;text-align:center}
.mood.selected{border:2px solid #202334;background:#f3f4f8}
.stat{font-size:28px;font-weight:800}
.tablewrap{overflow:auto}
.table{width:100%;border-collapse:collapse}
.table th,.table td{padding:11px 9px;border-bottom:1px solid #eceef4;text-align:left;font-size:13px;vertical-align:top}
.pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#eef0f6;font-size:12px;font-weight:700}
.alert{padding:12px 14px;border-radius:12px;background:#fff5df;color:#76521c}
.error{padding:12px 14px;border-radius:12px;background:#fff0ef;color:#a43d35}
.success{padding:12px 14px;border-radius:12px;background:#ecfaf4;color:#247451}
.login{max-width:470px;margin:7vh auto}
.center{text-align:center}
.small{font-size:12px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.bar{height:9px;border-radius:99px;background:#edf0f5;overflow:hidden}
.bar>i{display:block;height:100%;background:#5b6ee1}
.modal{position:fixed;inset:0;background:rgba(25,30,50,.45);display:flex;align-items:center;justify-content:center;padding:20px}
.modal .card{max-width:560px;width:100%;max-height:90vh;overflow:auto}
@media(max-width:760px){
  .app{padding:10px}
  .content{padding:18px}
  .two,.three{grid-template-columns:1fr}
  .moodgrid{grid-template-columns:repeat(2,1fr)}
}
`;

function csvDownload(rows, name) {
  if (!rows.length) return;

  const keys = Object.keys(rows[0]);
  const quote = (value) =>
    `"${String(value ?? '').replaceAll('"', '""').replace(/\r?\n/g, ' ')}"`;

  const csv =
    '\ufeff' +
    [
      keys.map(quote).join(','),
      ...rows.map((row) => keys.map((key) => quote(row[key])).join(',')),
    ].join('\r\n');

  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' })
  );

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Auth({ onAuth }) {
  const [signup, setSignup] = useState(false);
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      let result;

      if (signup) {
        result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role,
              full_name: name.trim() || email.trim().split('@')[0],
            },
          },
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;

      if (signup) {
        if (!result.data.user) {
          throw new Error('Akun belum dibuat.');
        }

        // Profil dibuat otomatis oleh trigger Supabase
        // setelah user baru masuk ke auth.users.
        if (!result.data.session) {
          setError(
            'Akun berhasil dibuat. Silakan cek email untuk verifikasi, lalu login.'
          );
          return;
        }
      }

      await onAuth();
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
    }
  }

  if (!supabase) {
    return (
      <div className="login card">
        <h1>EmoTrack AutoBK</h1>
        <div className="error">
          Supabase belum dikonfigurasi. Isi <b>VITE_SUPABASE_URL</b> dan{' '}
          <b>VITE_SUPABASE_ANON_KEY</b>.
        </div>
      </div>
    );
  }

  return (
    <div className="login card">
      <div className="center">
        <div style={{ fontSize: 42 }}>🌤️</div>
        <h1>EmoTrack AutoBK</h1>
        <p className="muted">
          Check-in emosi, jurnal, dan pemantauan Guru BK dalam satu tempat.
        </p>
      </div>

      <div className="nav">
        <button
          className={!signup ? 'active' : ''}
          onClick={() => setSignup(false)}
        >
          Masuk
        </button>
        <button
          className={signup ? 'active' : ''}
          onClick={() => setSignup(true)}
        >
          Buat akun
        </button>
      </div>

      <form onSubmit={submit} className="grid">
        <div>
          <label className="label">Peran</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="student">Siswa</option>
            <option value="teacher">Guru BK</option>
          </select>
        </div>

        {signup && (
          <div>
            <label className="label">Nama lengkap</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nama lengkap"
            />
          </div>
        )}

        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            minLength="6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className={error.startsWith('Akun dibuat') ? 'success' : 'error'}>
            {error}
          </div>
        )}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Memproses…' : signup ? 'Buat akun' : 'Masuk'}
        </button>
      </form>

      <p className="small muted">
        Data tersimpan di Supabase dan akses dibatasi oleh Row Level Security.
      </p>
    </div>
  );
}

function Student({ user, profile }) {
  const [classes, setClasses] = useState([]);
  const [active, setActive] = useState(null);
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState('checkin');
  const [mood, setMood] = useState('');
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error: loadError } = await supabase
      .from('class_students')
      .select('class_id, classes(id,name,join_code,active)')
      .eq('student_id', user.id);

    if (loadError) {
      setError(loadError.message);
      return;
    }

    const studentClasses = (data || [])
      .map((item) => item.classes)
      .filter(Boolean);

    setClasses(studentClasses);
    setActive((current) => current || studentClasses[0] || null);
  }

  async function loadEntries(classId) {
    if (!classId) {
      setEntries([]);
      return;
    }

    const { data, error: loadError } = await supabase
      .from('emotion_entries')
      .select('*')
      .eq('student_id', user.id)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (loadError) setError(loadError.message);
    else setEntries(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadEntries(active?.id);
  }, [active?.id]);

  async function join() {
    setError('');
    setMsg('');

    if (!code.trim()) return;

    setBusy(true);

    const { error: joinError } = await supabase.rpc('join_class_by_code', {
      p_join_code: code.trim().toUpperCase(),
    });

    if (joinError) {
      setError(joinError.message);
    } else {
      setMsg('Berhasil bergabung ke kelas.');
      setCode('');
      await load();
    }

    setBusy(false);
  }

  async function checkin() {
    if (!active) return setError('Gabung kelas terlebih dahulu.');
    if (!mood) return setError('Pilih emosi terlebih dahulu.');

    setBusy(true);

    const { error: checkinError } = await supabase
      .from('emotion_entries')
      .insert({
        student_id: user.id,
        class_id: active.id,
        mood_id: mood,
        intensity,
        private_note: note.trim() || null,
      });

    if (checkinError) {
      setError(checkinError.message);
    } else {
      setMsg(
        'Check-in tersimpan. Jurnal otomatis tersedia di dashboard Guru BK kelas ini.'
      );
      setMood('');
      setNote('');
      await loadEntries(active.id);
    }

    setBusy(false);
  }

  const negativeLastThree =
    entries.length >= 3 &&
    entries.slice(0, 3).every((entry) => NEGATIVE.has(entry.mood_id));

  return (
    <>
      <Header
        title={`Halo, ${profile.full_name}`}
        onLogout={() => supabase.auth.signOut()}
      />

      <div className="content">
        <div
          className="actions"
          style={{
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <b>Kelas aktif:</b> {active?.name || 'Belum ada kelas'}
          </div>

          <div className="actions">
            <input
              className="input"
              style={{ width: 180, margin: 0 }}
              placeholder="Kode kelas"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn primary" onClick={join} disabled={busy}>
              Gabung kelas
            </button>
          </div>
        </div>

        <div className="nav">
          {[
            ['checkin', 'Check-in'],
            ['journal', 'Jurnal saya'],
            ['history', 'Riwayat'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && (
          <div className="success" style={{ marginBottom: 12 }}>
            {msg}
          </div>
        )}

        {error && (
          <div className="error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        {negativeLastThree && (
          <div className="alert" style={{ marginBottom: 12 }}>
            Tiga check-in terakhir menunjukkan emosi yang masuk kategori perlu
            dipantau. Jika kamu membutuhkan bantuan, kamu bisa menghubungi Guru
            BK atau orang dewasa yang dipercaya.
          </div>
        )}

        {tab === 'checkin' && (
          <div className="grid two">
            <div className="card">
              <h2>Bagaimana perasaanmu?</h2>

              <div className="moodgrid">
                {MOODS.map(([id, label, emoji]) => (
                  <button
                    key={id}
                    className={`mood ${mood === id ? 'selected' : ''}`}
                    onClick={() => setMood(id)}
                  >
                    <div style={{ fontSize: 28 }}>{emoji}</div>
                    <b>{label}</b>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <label className="label">
                  Intensitas: {intensity}/5
                </label>
                <input
                  style={{ width: '100%' }}
                  type="range"
                  min="1"
                  max="5"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <label className="label">Jurnal singkat (opsional)</label>
                <textarea
                  className="input"
                  rows="5"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Apa yang ingin kamu ceritakan hari ini?"
                />
              </div>

              <button
                className="btn primary"
                style={{ marginTop: 12 }}
                onClick={checkin}
                disabled={busy}
              >
                Simpan check-in
              </button>
            </div>

            <div className="card soft">
              <h2>Ruang aman untukmu</h2>
              <p>
                Check-in bukan diagnosis. Catatanmu dipakai untuk membantu Guru
                BK memahami pola yang kamu bagikan dan menentukan tindak lanjut
                yang sesuai.
              </p>
              <p className="small muted">
                Jurnal yang kamu tulis pada check-in akan masuk otomatis ke Guru
                BK yang mengelola kelas tersebut, sesuai pengaturan aplikasi
                ini.
              </p>
            </div>
          </div>
        )}

        {tab === 'journal' && <Journal entries={entries} />}
        {tab === 'history' && <History entries={entries} />}
      </div>
    </>
  );
}

function Journal({ entries }) {
  const journals = entries.filter((entry) => entry.private_note);

  return (
    <div className="grid">
      {journals.length ? (
        journals.map((entry) => (
          <div className="card" key={entry.id}>
            <div
              className="actions"
              style={{ justifyContent: 'space-between' }}
            >
              <b>
                {moodEmoji(entry.mood_id)} {moodLabel(entry.mood_id)}
              </b>
              <span className="small muted">
                {new Date(entry.created_at).toLocaleString('id-ID')}
              </span>
            </div>

            <p style={{ whiteSpace: 'pre-wrap' }}>{entry.private_note}</p>
            <span className="pill">
              Intensitas {entry.intensity}/5
            </span>
          </div>
        ))
      ) : (
        <div className="card soft">Belum ada jurnal.</div>
      )}
    </div>
  );
}

function History({ entries }) {
  return (
    <div className="card">
      <h2>Riwayat check-in</h2>

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Emosi</th>
              <th>Intensitas</th>
              <th>Jurnal</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleString('id-ID')}</td>
                <td>
                  {moodEmoji(entry.mood_id)} {moodLabel(entry.mood_id)}
                </td>
                <td>{entry.intensity}/5</td>
                <td>{entry.private_note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Teacher({ user, profile }) {
  const [classes, setClasses] = useState([]);
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [tab, setTab] = useState('overview');
  const [newClass, setNewClass] = useState('');
  const [journal, setJournal] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function loadClasses() {
    const { data, error: loadError } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at');

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setClasses(data || []);
    setCls((current) => current || (data || [])[0] || null);
  }

  async function loadData(classId) {
    if (!classId) return;

    setError('');

    // Ambil daftar siswa melalui RPC khusus Guru BK.
    // Ini menghindari RLS join class_students -> profiles yang sebelumnya
    // membuat nama siswa tidak muncul di dashboard.
    const [
      { data: studentData, error: studentError },
      { data: entryData, error: entryError },
      { data: followupData, error: followupError },
    ] = await Promise.all([
      supabase.rpc('get_teacher_students', { p_class_id: classId }),

      supabase
        .from('emotion_entries')
        .select(
          'id,student_id,mood_id,intensity,private_note,created_at,profiles(full_name)'
        )
        .eq('class_id', classId)
        .order('created_at', { ascending: false }),

      supabase
        .from('bk_followups')
        .select('*')
        .eq('class_id', classId)
        .order('updated_at', { ascending: false }),
    ]);

    const firstError = studentError || entryError || followupError;

    if (firstError) setError(firstError.message);

    setStudents(
      (studentData || []).map((item) => ({
        id: item.student_id,
        name: item.full_name || 'Siswa',
      }))
    );

    setEntries(entryData || []);
    setFollowups(followupData || []);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadData(cls?.id);
  }, [cls?.id]);

  async function createClass() {
    setMsg('');
    setError('');

    if (!newClass.trim()) return;

    const code = Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

    const { data, error: createError } = await supabase
      .from('classes')
      .insert({
        teacher_id: user.id,
        name: newClass.trim(),
        join_code: code,
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return;
    }

    setNewClass('');
    setMsg(`Kelas dibuat. Kode bergabung: ${data.join_code}`);
    await loadClasses();
    setCls(data);
  }

  async function saveFollowup(studentId) {
    if (!cls) return;

    const old = followups.find((item) => item.student_id === studentId);

    const status = old?.status || 'baru';
    const serviceType = old?.service_type || 'Pemantauan';
    const followupNote = old?.followup_note || '';

    const { error: saveError } = await supabase
      .from('bk_followups')
      .upsert(
        {
          id: old?.id,
          student_id: studentId,
          class_id: cls.id,
          teacher_id: user.id,
          status,
          service_type: serviceType,
          followup_note: followupNote,
          followup_at:
            old?.followup_at || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMsg('Tindak lanjut tersimpan.');
    await loadData(cls.id);
  }

  const summaries = useMemo(() => {
    return students.map((student) => {
      const studentEntries = entries.filter(
        (entry) => entry.student_id === student.id
      );

      const counts = Object.fromEntries(
        MOODS.map(([id]) => [
          id,
          studentEntries.filter((entry) => entry.mood_id === id).length,
        ])
      );

      const flag =
        studentEntries.length >= 3 &&
        studentEntries
          .slice(0, 3)
          .every((entry) => NEGATIVE.has(entry.mood_id));

      return {
        ...student,
        entries: studentEntries,
        total: studentEntries.length,
        counts,
        last: studentEntries[0],
        flag,
      };
    });
  }, [students, entries]);

  const total = entries.length;
  const negative = entries.filter((entry) =>
    NEGATIVE.has(entry.mood_id)
  ).length;

  function exportData() {
    if (!cls) return;

    csvDownload(
      summaries.map((student) => ({
        'Nama Siswa': student.name,
        'Total Check-in': student.total,
        Senang: student.counts.happy,
        Tenang: student.counts.calm,
        Semangat: student.counts.excited,
        Sedih: student.counts.sad,
        Cemas: student.counts.anxious,
        Marah: student.counts.angry,
        'Check-in Terakhir': student.last
          ? new Date(student.last.created_at).toLocaleString('id-ID')
          : '',
        'Indikator 3 Terakhir Negatif': student.flag ? 'Ya' : 'Tidak',
      })),
      `EmoTrack_${cls.name.replace(/\s+/g, '_')}_ringkasan.csv`
    );

    csvDownload(
      entries.map((entry) => ({
        'Nama Siswa': entry.profiles?.full_name || '',
        Waktu: new Date(entry.created_at).toLocaleString('id-ID'),
        Emosi: moodLabel(entry.mood_id),
        Intensitas: entry.intensity,
        Jurnal: entry.private_note || '',
      })),
      `EmoTrack_${cls.name.replace(/\s+/g, '_')}_jurnal.csv`
    );
  }

  return (
    <>
      <Header
        title={`Guru BK · ${profile.full_name}`}
        onLogout={() => supabase.auth.signOut()}
      />

      <div className="content">
        <div className="card soft" style={{ marginBottom: 18 }}>
          <div className="actions">
            <input
              className="input"
              style={{ margin: 0, flex: 1 }}
              placeholder="Nama kelas baru"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
            />

            <button className="btn primary" onClick={createClass}>
              Buat kelas
            </button>

            <button
              className="btn secondary"
              onClick={exportData}
              disabled={!cls}
            >
              Export CSV
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <select
              className="input"
              value={cls?.id || ''}
              onChange={(e) =>
                setCls(
                  classes.find((item) => item.id === e.target.value) || null
                )
              }
            >
              {classes.length ? (
                classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · kode {item.join_code}
                  </option>
                ))
              ) : (
                <option value="">Belum ada kelas</option>
              )}
            </select>
          </div>
        </div>

        {msg && (
          <div className="success" style={{ marginBottom: 12 }}>
            {msg}
          </div>
        )}

        {error && (
          <div className="error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div className="nav">
          {[
            ['overview', 'Ringkasan'],
            ['students', 'Siswa'],
            ['journals', 'Jurnal'],
            ['followup', 'Tindak lanjut'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid three">
              <Stat title="Siswa" value={students.length} />
              <Stat title="Total check-in" value={total} />
              <Stat
                title="Check-in emosi negatif"
                value={negative}
              />
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <h2>Pola emosi kelas</h2>

              {MOODS.map(([id, label, emoji]) => {
                const count = entries.filter(
                  (entry) => entry.mood_id === id
                ).length;

                return (
                  <div key={id} style={{ margin: '13px 0' }}>
                    <div
                      className="actions"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>
                        {emoji} {label}
                      </span>
                      <b>{count}</b>
                    </div>

                    <div className="bar">
                      <i
                        style={{
                          width: `${
                            total
                              ? Math.round((count / total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'students' && (
          <StudentTable
            summaries={summaries}
            onJournal={(student) => setJournal(student)}
          />
        )}

        {tab === 'journals' && (
          <JournalTable
            entries={entries}
            onOpen={(entry) => setJournal(entry)}
          />
        )}

        {tab === 'followup' && (
          <FollowupTable
            summaries={summaries}
            followups={followups}
            onSave={saveFollowup}
          />
        )}
      </div>

      {journal && (
        <div className="modal" onClick={() => setJournal(null)}>
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="actions"
              style={{ justifyContent: 'space-between' }}
            >
              <h2>
                Catatan ·{' '}
                {journal.name || journal.profiles?.full_name}
              </h2>

              <button
                className="btn secondary"
                onClick={() => setJournal(null)}
              >
                Tutup
              </button>
            </div>

            {(journal.entries || [journal])
              .filter((entry) => entry.private_note)
              .map((entry) => (
                <div className="card soft" key={entry.id}>
                  <b>
                    {moodEmoji(entry.mood_id)}{' '}
                    {moodLabel(entry.mood_id)} · {entry.intensity}/5
                  </b>

                  <div className="small muted">
                    {new Date(entry.created_at).toLocaleString('id-ID')}
                  </div>

                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    {entry.private_note}
                  </p>
                </div>
              ))}

            {!(journal.entries || [journal]).some(
              (entry) => entry.private_note
            ) && <p className="muted">Belum ada jurnal.</p>}
          </div>
        </div>
      )}
    </>
  );
}

function StudentTable({ summaries, onJournal }) {
  return (
    <div className="card">
      <h2>Daftar siswa</h2>

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Check-in</th>
              <th>Terakhir</th>
              <th>Indikator</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {summaries.map((student) => (
              <tr key={student.id}>
                <td>
                  <b>{student.name}</b>
                </td>
                <td>{student.total}</td>
                <td>
                  {student.last
                    ? `${moodEmoji(student.last.mood_id)} ${moodLabel(
                        student.last.mood_id
                      )} · ${student.last.intensity}/5`
                    : '—'}
                </td>
                <td>
                  {student.flag ? (
                    <span className="pill">Pantau</span>
                  ) : (
                    <span className="pill">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn secondary"
                    onClick={() => onJournal(student)}
                  >
                    Jurnal
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalTable({ entries }) {
  const journals = entries.filter((entry) => entry.private_note);

  return (
    <div className="card">
      <h2>Jurnal siswa</h2>

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Siswa</th>
              <th>Emosi</th>
              <th>Jurnal</th>
            </tr>
          </thead>

          <tbody>
            {journals.map((entry) => (
              <tr key={entry.id}>
                <td>
                  {new Date(entry.created_at).toLocaleString('id-ID')}
                </td>
                <td>{entry.profiles?.full_name}</td>
                <td>
                  {moodEmoji(entry.mood_id)} {moodLabel(entry.mood_id)}
                </td>
                <td>{entry.private_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FollowupTable({ summaries, followups, onSave }) {
  return (
    <div className="card">
      <h2>Tindak lanjut</h2>

      {summaries.map((student) => {
        const followup =
          followups.find((item) => item.student_id === student.id) || {};

        return (
          <div
            className="card soft"
            style={{ marginTop: 12 }}
            key={student.id}
          >
            <div
              className="actions"
              style={{ justifyContent: 'space-between' }}
            >
              <b>{student.name}</b>

              <select
                className="input"
                style={{ width: 150, margin: 0 }}
                value={followup.status || 'baru'}
                onChange={(e) => {
                  followup.status = e.target.value;
                }}
              >
                <option value="baru">baru</option>
                <option value="dipantau">dipantau</option>
                <option value="dihubungi">dihubungi</option>
                <option value="selesai">selesai</option>
              </select>
            </div>

            <textarea
              className="input"
              rows="2"
              defaultValue={followup.followup_note || ''}
              placeholder="Catatan tindak lanjut"
              onChange={(e) => {
                followup.followup_note = e.target.value;
              }}
            />

            <button
              className="btn primary"
              style={{ marginTop: 8 }}
              onClick={() => onSave(student.id)}
            >
              Simpan tindak lanjut
            </button>
          </div>
        );
      })}

      {!summaries.length && (
        <p className="muted">Belum ada siswa di kelas.</p>
      )}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="card soft">
      <div className="muted small">{title}</div>
      <div className="stat">{value}</div>
    </div>
  );
}

function Header({ title, onLogout }) {
  return (
    <div className="top">
      <div>
        <div className="brand">
          EmoTrack <span style={{ fontWeight: 500 }}>AutoBK</span>
        </div>
        <div className="small muted">{title}</div>
      </div>

      <button className="btn secondary" onClick={onLogout}>
        Keluar
      </button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);

    if (data.session) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      setProfile(profileData);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!supabase || loading) {
    return (
      <div className="app">
        <style>{css}</style>
        <Auth onAuth={load} />
      </div>
    );
  }

  return (
    <div className="app">
      <style>{css}</style>

      <div className="shell">
        {!session || !profile ? (
          <Auth onAuth={load} />
        ) : profile.role === 'teacher' ? (
          <Teacher user={session.user} profile={profile} />
        ) : (
          <Student user={session.user} profile={profile} />
        )}
      </div>
    </div>
  );
}
