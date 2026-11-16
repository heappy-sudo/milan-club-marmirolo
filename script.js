/**
 * Milan Club Marmirolo - Gestione Form Socio & Invio Email
 * Responsive & Mobile/Tablet Optimized
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('socioForm');
  const submitBtn = document.getElementById('submitBtn');
  const mailtoBtn = document.getElementById('mailtoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const successModal = document.getElementById('successModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const printBtn = document.getElementById('printBtn');
  const modalSummary = document.getElementById('modalSummary');
  const cfInput = document.getElementById('codice_fiscale');
  const cfCharCount = document.getElementById('cfCharCount');
  const provInput = document.getElementById('provincia');
  const capInput = document.getElementById('cap');
  const yearSpan = document.getElementById('currentYear');

  const DEST_EMAIL = 'milanclubmarmirolo@gmail.com';

  // Imposta anno corrente nel footer
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ---------------- Utility ---------------- */

  function normalizeName(s) {
    return (s || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function showFieldError(input, message) {
    if (!input) return;
    input.classList.add('error');
    const group = input.closest('.form-group');
    if (group) {
      const hint = group.querySelector('.field-hint');
      if (hint) {
        if (!hint.dataset.original) hint.dataset.original = hint.textContent;
        if (message) hint.textContent = message;
        hint.classList.add('error');
      }
    }
  }

  function clearFieldError(input) {
    if (!input) return;
    input.classList.remove('error');
    const group = input.closest('.form-group');
    if (group) {
      const hint = group.querySelector('.field-hint');
      if (hint) {
        hint.classList.remove('error');
        if (hint.dataset.original) hint.textContent = hint.dataset.original;
      }
    }
  }

  function clearAllErrors() {
    form.querySelectorAll('.form-control.error').forEach(el => clearFieldError(el));
  }

  function initCharCounter(input, counter, max) {
    if (!input || !counter) return;
    const update = () => { counter.textContent = `${input.value.length}/${max}`; };
    input.addEventListener('input', update);
    update();
  }

  /* ---------------- Dati comuni / CAP ---------------- */

  const COMUNI_DB = window.COMUNI_DB || {};
  const COMUNI_NAMES = window.COMUNI_NAMES || Object.keys(COMUNI_DB);
  const CAP_DB = window.CAP_DB || {};
  const LOCALITA_NAMES = window.LOCALITA_NAMES || Object.keys(CAP_DB);

  function fillDatalist(id, names) {
    const dl = document.getElementById(id);
    if (!dl) return;
    const frag = document.createDocumentFragment();
    names.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      frag.appendChild(opt);
    });
    dl.appendChild(frag);
  }

  fillDatalist('comuniList', COMUNI_NAMES);
  fillDatalist('localitaList', LOCALITA_NAMES);

  function resolveCodiceCatastale(nome) {
    const key = normalizeName(nome);
    if (COMUNI_DB[key]) return COMUNI_DB[key];
    // Prova a ripulire eventuali suffissi tipo "(Stato Estero)"
    const clean = key.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (COMUNI_DB[clean]) return COMUNI_DB[clean];
    return null;
  }

  // Località -> CAP e Provincia automatici
  const localitaInput = document.getElementById('localita');
  if (localitaInput) {
    localitaInput.addEventListener('change', () => {
      const rec = CAP_DB[normalizeName(localitaInput.value)];
      if (rec) {
        if (capInput) capInput.value = rec.c;
        if (provInput) provInput.value = rec.p;
      }
    });
  }

  // CAP -> Località (se univoca) e Provincia
  if (capInput) {
    capInput.addEventListener('change', () => {
      const cap = capInput.value.trim();
      if (!/^[0-9]{5}$/.test(cap)) return;
      const matches = LOCALITA_NAMES.filter(n => CAP_DB[n] && CAP_DB[n].c === cap);
      if (matches.length === 1) {
        if (localitaInput) localitaInput.value = matches[0];
        if (provInput) provInput.value = CAP_DB[matches[0]].p;
      } else if (matches.length > 1) {
        const dl = document.getElementById('localitaList');
        if (dl) {
          dl.innerHTML = '';
          fillDatalist('localitaList', matches);
        }
        if (provInput && CAP_DB[matches[0]]) provInput.value = CAP_DB[matches[0]].p;
      }
    });
  }

  /* ---------------- Codice Fiscale ---------------- */

  const CF_ODD = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };
  const CF_EVEN = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
    'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };

  function getControlChar(cf15) {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const ch = cf15[i];
      sum += (i % 2 === 0) ? CF_ODD[ch] : CF_EVEN[ch];
    }
    return String.fromCharCode(65 + (sum % 26));
  }

  function nameCode(str, isNome) {
    const clean = normalizeName(str).replace(/[^A-Z]/g, '');
    const consonants = clean.replace(/[AEIOU]/g, '');
    const vowels = clean.replace(/[^AEIOU]/g, '');
    let code;
    if (isNome && consonants.length >= 4) {
      code = consonants[0] + consonants[2] + consonants[3];
    } else {
      code = (consonants + vowels + 'XXX').substring(0, 3);
    }
    return code;
  }

  function calculateCF() {
    const cognome = document.getElementById('cognome').value;
    const nome = document.getElementById('nome').value;
    const dataNascita = document.getElementById('data_nascita').value;
    const luogo = document.getElementById('luogo_nascita').value;
    const sessoEl = form.querySelector('input[name="sesso"]:checked');
    const sesso = sessoEl ? sessoEl.value : 'M';
    if (!cognome || !nome || !dataNascita || !luogo) return null;

    const placeCode = resolveCodiceCatastale(luogo);
    if (!placeCode) return null;

    const d = new Date(dataNascita + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const MONTH_LETTERS = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];
    const year = String(d.getFullYear()).slice(-2);
    const month = MONTH_LETTERS[d.getMonth()];
    let day = d.getDate();
    if (sesso === 'F') day += 40;
    const dayStr = String(day).padStart(2, '0');

    const cf15 = nameCode(cognome, false) + nameCode(nome, true) + year + month + dayStr + placeCode;
    return cf15 + getControlChar(cf15);
  }

  function tryAutoCF() {
    const cf = calculateCF();
    if (cf && cfInput) {
      cfInput.value = cf;
      cfInput.dispatchEvent(new Event('input'));
    }
  }

  const autoCfBtn = document.getElementById('autoCfBtn');
  if (autoCfBtn) autoCfBtn.addEventListener('click', tryAutoCF);
  ['nome', 'cognome', 'data_nascita', 'luogo_nascita'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', tryAutoCF);
  });
  form.querySelectorAll('input[name="sesso"]').forEach(el => el.addEventListener('change', tryAutoCF));

  // Auto-uppercase e contatore per Codice Fiscale
  if (cfInput && cfCharCount) {
    cfInput.addEventListener('input', () => {
      cfInput.value = cfInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const len = cfInput.value.length;
      cfCharCount.textContent = `${len}/16`;
      const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
      if (len === 16 && cfRegex.test(cfInput.value)) {
        cfCharCount.classList.add('valid');
        clearFieldError(cfInput);
      } else {
        cfCharCount.classList.remove('valid');
      }
    });
  }

  /* ---------------- Formattazione campi ---------------- */

  // Maiuscola iniziale per Nome e Cognome
  const nomeInput = document.getElementById('nome');
  const cognomeInput = document.getElementById('cognome');
  [nomeInput, cognomeInput].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\b\w/g, c => c.toUpperCase());
      });
    }
  });

  // Maiuscola iniziale per Luogo di Nascita e Località
  const comuneInput = document.getElementById('luogo_nascita');
  [comuneInput, localitaInput].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\b\w/g, c => c.toUpperCase());
      });
    }
  });

  // Provincia in maiuscolo
  if (provInput) {
    provInput.addEventListener('input', () => {
      provInput.value = provInput.value.toUpperCase();
    });
  }

  // Validazione live per Email
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const email = emailInput.value.trim();
      if (email === '') {
        clearFieldError(emailInput);
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        clearFieldError(emailInput);
      } else {
        showFieldError(emailInput, 'Email non valida');
      }
    });
  }

  // Validazione live per Cellulare
  const cellInput = document.getElementById('cellulare');
  if (cellInput) {
    cellInput.addEventListener('input', () => {
      cellInput.value = cellInput.value.replace(/[^0-9+]/g, '');
      const phone = cellInput.value.trim();
      if (phone === '') {
        clearFieldError(cellInput);
      } else if (/^\+?[0-9]{9,15}$/.test(phone)) {
        clearFieldError(cellInput);
      } else {
        showFieldError(cellInput, 'Numero non valido');
      }
    });
  }

  /* ---------------- Modalità Rinnovo ---------------- */

  const rinnovoNotice = document.getElementById('rinnovoNotice');
  const emailSubject = document.getElementById('emailSubject');

  function isRinnovo() {
    const el = form.querySelector('input[name="tipo_operazione"]:checked');
    return el && el.value === 'Rinnovo';
  }

  function applyMode() {
    const rinnovo = isRinnovo();
    form.classList.toggle('is-rinnovo', rinnovo);
    if (rinnovoNotice) rinnovoNotice.style.display = rinnovo ? 'flex' : 'none';
    form.querySelectorAll('.rinnovo-hide .form-control[required]').forEach(el => {
      el.required = !rinnovo;
    });
    if (rinnovo) {
      form.querySelectorAll('.rinnovo-hide .form-control').forEach(el => clearFieldError(el));
    }
  }

  form.querySelectorAll('input[name="tipo_operazione"]').forEach(el => {
    el.addEventListener('change', applyMode);
  });
  applyMode();

  /* ---------------- Validazione ---------------- */

  function validateField(input) {
    if (!input) return true;
    if (input.disabled) return true;
    const inHiddenSection = input.closest('.rinnovo-hide');
    if (isRinnovo() && inHiddenSection) return true;
    const val = (input.value || '').trim();
    if (input.required && val === '') {
      showFieldError(input);
      return false;
    }
    if (val !== '' && input.pattern) {
      const re = new RegExp('^(?:' + input.pattern + ')$');
      if (!re.test(val)) {
        showFieldError(input);
        return false;
      }
    }
    if (val !== '' && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showFieldError(input, 'Email non valida');
      return false;
    }
    if (val !== '' && input.minLength > 0 && val.length < input.minLength) {
      showFieldError(input);
      return false;
    }
    clearFieldError(input);
    return true;
  }

  function validateForm() {
    let ok = true;
    let firstBad = null;
    form.querySelectorAll('.form-control').forEach(el => {
      if (!validateField(el)) {
        ok = false;
        if (!firstBad) firstBad = el;
      }
    });
    if (!ok && firstBad) {
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstBad.focus({ preventScroll: true });
    }
    return ok;
  }

  form.querySelectorAll('.form-control').forEach(el => {
    el.addEventListener('blur', () => validateField(el));
  });

  /* ---------------- Raccolta dati / email ---------------- */

  function fieldVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function collectFormData() {
    const tipoEl = form.querySelector('input[name="tipo_operazione"]:checked');
    const sessoEl = form.querySelector('input[name="sesso"]:checked');
    return {
      tipo_operazione: tipoEl ? tipoEl.value : '',
      ruolo: fieldVal('ruolo'),
      nome: fieldVal('nome'),
      cognome: fieldVal('cognome'),
      sesso: sessoEl ? sessoEl.value : '',
      data_nascita: fieldVal('data_nascita'),
      luogo_nascita: fieldVal('luogo_nascita'),
      codice_fiscale: fieldVal('codice_fiscale'),
      indirizzo: fieldVal('indirizzo'),
      civico: fieldVal('civico'),
      localita: fieldVal('localita'),
      cap: fieldVal('cap'),
      provincia: fieldVal('provincia'),
      email: fieldVal('email'),
      cellulare: fieldVal('cellulare'),
      note: fieldVal('note')
    };
  }

  function formatDateIT(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
  }

  function buildEmailBody(data) {
    const lines = [
      'RICHIESTA ISCRIZIONE / AGGIORNAMENTO DATI SOCIO',
      'Milan Club Marmirolo',
      '----------------------------------------',
      `Tipo Richiesta: ${data.tipo_operazione}`,
      `Qualifica / Ruolo: ${data.ruolo}`,
      `Nome: ${data.nome}`,
      `Cognome: ${data.cognome}`,
      `Sesso: ${data.sesso}`,
      `Data di Nascita: ${formatDateIT(data.data_nascita)}`,
      `Luogo di Nascita: ${data.luogo_nascita}`,
      `Codice Fiscale: ${data.codice_fiscale}`,
      `Indirizzo: ${data.indirizzo} ${data.civico} - ${data.cap} ${data.localita} (${data.provincia})`,
      `Email: ${data.email}`,
      `Cellulare: ${data.cellulare}`,
      `Note: ${data.note}`
    ];
    return lines.join('\n');
  }

  function openMailClient(data) {
    const subject = `Nuova Scheda Socio - ${data.nome} ${data.cognome}`;
    const mailtoLink = `mailto:${DEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildEmailBody(data))}`;
    window.location.href = mailtoLink;
  }

  /* ---------------- Modale di conferma ---------------- */

  function summaryRow(k, v) {
    if (!v) return '';
    const row = document.createElement('div');
    row.className = 'summary-row';
    const ks = document.createElement('span');
    ks.className = 'k';
    ks.textContent = k;
    const vs = document.createElement('span');
    vs.className = 'v';
    vs.textContent = v;
    row.appendChild(ks);
    row.appendChild(vs);
    return row;
  }

  function showSummaryModal(data) {
    if (!successModal || !modalSummary) return;
    modalSummary.innerHTML = '';
    const indirizzoCompleto = [data.indirizzo, data.civico].filter(Boolean).join(' ') +
      (data.cap || data.localita ? ` - ${data.cap} ${data.localita} (${data.provincia})` : '');
    [
      ['Tipo Richiesta', data.tipo_operazione],
      ['Qualifica / Ruolo', data.ruolo],
      ['Nome e Cognome', `${data.nome} ${data.cognome}`],
      ['Data di Nascita', formatDateIT(data.data_nascita)],
      ['Luogo di Nascita', data.luogo_nascita],
      ['Codice Fiscale', data.codice_fiscale],
      ['Indirizzo', indirizzoCompleto.trim()],
      ['Email', data.email],
      ['Cellulare', data.cellulare],
      ['Note', data.note]
    ].forEach(([k, v]) => {
      const row = summaryRow(k, v);
      if (row) modalSummary.appendChild(row);
    });
    successModal.classList.add('open');
  }

  function closeModal() {
    if (successModal) successModal.classList.remove('open');
  }

  function printSummary() {
    window.print();
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('loading', loading);
    submitBtn.disabled = loading;
    const text = submitBtn.querySelector('.btn-text');
    if (text) text.textContent = loading ? 'INVIO IN CORSO...' : 'INVIA DATI A MILAN CLUB MARMIROLO';
  }

  /* ---------------- Invio form ---------------- */

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data = collectFormData();
    const formData = new FormData(form);
    if (emailSubject) {
      emailSubject.value = `Nuova Scheda Socio - ${data.nome} ${data.cognome}`;
    }

    setLoading(true);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setLoading(false);
        showSummaryModal(data);
        return;
      } else {
        throw new Error('Errore invio FormSubmit');
      }
    } catch (error) {
      setLoading(false);
      openMailClient(data);
      showSummaryModal(data);
    }
  });

  // Reset form
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      setTimeout(() => {
        clearAllErrors();
        if (cfCharCount) {
          cfCharCount.textContent = '0/16';
          cfCharCount.classList.remove('valid');
        }
        applyMode();
      }, 0);
    });
  }

  // Pulsante Mailto
  if (mailtoBtn) {
    mailtoBtn.addEventListener('click', () => {
      if (!validateForm()) {
        return;
      }
      const data = collectFormData();
      openMailClient(data);
      showSummaryModal(data);
    });
  }

  // Chiudi modale
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      closeModal();
      form.reset();
      clearAllErrors();
      applyMode();
      if (cfCharCount) cfCharCount.textContent = '0/16';
    });
  }

  // Stampa / Salva PDF
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      printSummary();
    });
  }

  // Chiudi modale cliccando fuori
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        closeModal();
      }
    });
  }

  // Inizializza contatori
  initCharCounter(cfInput, cfCharCount, 16);
});
