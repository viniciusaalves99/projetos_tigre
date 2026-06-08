'use strict';

// ===========================
// DATA
// ===========================

const COMUNICACOES = {
  balcao: [
    { id: 'adesivo_balcao', label: 'Adesivo de Balcão',               peso: 0.65 },
    { id: 'adesivo_chao',   label: 'Adesivo de Chão / Pares de Pata', peso: 0.30 },
    { id: 'bandeirola',     label: 'Bandeirola',                       peso: 0.30 },
    { id: 'bobina',         label: 'Bobina de Forração',               peso: 0.10 },
    { id: 'cesto',          label: 'Cesto ou Box Promocional',         peso: 0.10 },
    { id: 'personalizada',  label: 'Comunicação Personalizada',        peso: 0.20 },
    { id: 'cubos',          label: 'Cubos',                            peso: 0.10 },
    { id: 'display_aereo',  label: 'Display Aéreo',                    peso: 0.20 },
    { id: 'expositor',      label: 'Expositor Padronizado',            peso: 0.10 },
    { id: 'totem',          label: 'Totem',                            peso: 0.10 },
  ],
  misto: [
    { id: 'adesivo_balcao',   label: 'Adesivo de Balcão',               peso: 0.10 },
    { id: 'adesivo_chao',     label: 'Adesivo de Chão / Pares de Pata', peso: 0.20 },
    { id: 'bandeirola',       label: 'Bandeirola',                       peso: 0.10 },
    { id: 'bobina',           label: 'Bobina de Forração',               peso: 0.05 },
    { id: 'cesto',            label: 'Cesto ou Box Promocional',         peso: 0.05 },
    { id: 'personalizada',    label: 'Comunicação Personalizada',        peso: 0.05 },
    { id: 'cubos',            label: 'Cubos',                            peso: 0.05 },
    { id: 'display_aereo',    label: 'Display Aéreo',                    peso: 0.10 },
    { id: 'expositor_custom', label: 'Expositor Customizado',            peso: 0.10 },
    { id: 'expositor',        label: 'Expositor Padronizado',            peso: 0.10 },
    { id: 'faixa_gondola',    label: 'Faixa de Gôndola',                peso: 0.30 },
    { id: 'ficha_produto',    label: 'Ficha de Produto',                 peso: 0.30 },
    { id: 'fita_cross',       label: 'Fita Cross',                       peso: 0.10 },
    { id: 'stopper',          label: 'Stopper',                          peso: 0.10 },
    { id: 'testeira',         label: 'Testeira',                         peso: 0.10 },
    { id: 'totem',            label: 'Totem',                            peso: 0.10 },
    { id: 'wobbler',          label: 'Wobbler',                          peso: 0.10 },
  ],
};

const PONTOS_EXTRA = {
  balcao: [
    { id: 'display', label: 'Display',  peso: 0.50, bonus: true  },
    { id: 'ilha',    label: 'Ilha',     peso: 1.00, bonus: false },
    { id: 'pilha',   label: 'Pilha',    peso: 1.00, bonus: false },
    { id: 'vitrine', label: 'Vitrine',  peso: 0.60, bonus: false },
  ],
  misto: [
    { id: 'checkout',      label: 'Check Out',       peso: 0.50, bonus: true  },
    { id: 'display',       label: 'Display',         peso: 0.10, bonus: false },
    { id: 'expositor',     label: 'Expositor',       peso: 0.30, bonus: false },
    { id: 'fita_cross',    label: 'Fita Cross',      peso: 0.10, bonus: false },
    { id: 'ilha',          label: 'Ilha',            peso: 1.00, bonus: false },
    { id: 'pilha',         label: 'Pilha',           peso: 0.50, bonus: false },
    { id: 'ponta_gondola', label: 'Ponta de Gôndola',peso: 2.00, bonus: false },
    { id: 'vitrine',       label: 'Vitrine',         peso: 0.50, bonus: false },
  ],
};

const TIPOS_NEGOCIO = [
  'Varejo Generalista',
  'Especializado Hidráulica',
  'Especializado Elétrica',
  'Especializado em Tintas',
  'Especializado em Ferramentas e Ferragens',
  'Especializado em Materiais Básicos / Pesados',
  'Especializado em Revestimentos',
];

const LINHAS = [
  'Esgoto SN',
  'Água Fria',
  'Água Quente',
  'Elétrica',
  'Acessórios e Torneiras',
  'Imobiliária',
];

// ===========================
// STATE
// ===========================

let S = resetState();

function resetState() {
  return {
    screen: 'pdv_info',
    pdv: { codigo: '', nome: '' },
    tipoPDV: null,            // 'balcao' | 'misto' | 'autosservico'
    tipoNegocio: null,        // tipo de negócio selecionado
    q2: null, q3: null, q4: null,
    q5: [],                   // checked comunicacao ids
    q6: null,                 // 'sim' | 'nao'
    q7: {},                   // { peId: qty }
    linhas: [],               // selected linhas
    mixData: {},              // { linha: { trabalha: bool, ruptura: bool|null } }
    _linhaIdx: 0,
    comConcluido: false,
    peConcluido:  false,
    mixConcluido: false,
    fotos: { q2: null, q3: null, q4: null, q5: null, q6: null, q7: {} },
  };
}

// ===========================
// NAVIGATION
// ===========================

function go(screen) {
  S.screen = screen;
  render();
}

// ===========================
// SCORING
// ===========================

function calcScore() {
  const isB = S.tipoPDV === 'balcao';
  let com = 0, pe = 0, mix = 0;

  if (S.comConcluido) {
    com += S.q2 === 'sim' ? (isB ? 1.25 : 0.50) : (S.q2 === 'nao' ? (isB ? -0.50 : -0.25) : 0);
    com += S.q3 === 'sim' ? (isB ? 1.25 : 0.50) : (S.q3 === 'nao' ? (isB ? -0.50 : -0.25) : 0);
    com += S.q4 === 'sim' ? (isB ? 1.25 : 1.00) : (S.q4 === 'nao' ? -0.50 : 0);
    const list = (isB ? COMUNICACOES.balcao : COMUNICACOES.misto);
    S.q5.forEach(id => { const it = list.find(c => c.id === id); if (it) com += it.peso; });
  }

  if (S.peConcluido) {
    if (S.q6 === 'nao') pe -= 0.50;
    if (S.q6 === 'sim') {
      const list = isB ? PONTOS_EXTRA.balcao : PONTOS_EXTRA.misto;
      Object.entries(S.q7).forEach(([id, qty]) => {
        if (qty < 1) return;
        const it = list.find(p => p.id === id);
        if (!it) return;
        pe += it.peso;                        // 1ª unidade = peso cheio
        if (qty > 1) pe += 0.25 * (qty - 1); // unidades adicionais = 0,25 cada
      });
      const peCap = isB ? 3.10 : 5.00;
      pe = Math.min(pe, peCap);
    }
  }

  if (S.mixConcluido) {
    S.linhas.forEach(l => {
      const d = S.mixData[l];
      if (!d || !d.trabalha) return;
      if (d.ruptura === false) mix += 1.00;
      if (d.ruptura === true)  mix -= 0.10;
    });
  }

  const total = Math.min(com + pe + mix, 10.00);
  return { com, pe, mix, total };
}

function classificacao(total) {
  if (total >= 8) return { label: '🥇 Ouro',    cls: 'c-ouro'    };
  if (total >= 5) return { label: '🥈 Prata',   cls: 'c-prata'   };
  if (total >= 3) return { label: '🥉 Bronze',  cls: 'c-bronze'  };
  return             { label: '📋 Regular', cls: 'c-regular' };
}

// ===========================
// HELPERS
// ===========================

function pdvLine() {
  const c = S.pdv.codigo ? S.pdv.codigo + ' – ' : '';
  return (c + (S.pdv.nome || 'PDV Score 2.0')).trim() || 'PDV Score 2.0';
}

function header(subtitle, title, backScreen) {
  const back = backScreen
    ? `<button class="header-back" onclick="go('${backScreen}')">&laquo;</button>`
    : '';
  return `
    <div class="header">
      ${back}
      <div class="header-info">
        ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ''}
        <div class="header-title">${title}</div>
      </div>
      <div class="header-icon">🐾</div>
    </div>`;
}

function stepDots(total, current) {
  return '<div class="steps">' +
    Array.from({ length: total }, (_, i) => {
      const cls = i < current ? 'done' : i === current ? 'active' : '';
      return `<div class="sdot ${cls}"></div>`;
    }).join('') +
    '</div>';
}

function moduloStatus(concluido, prog, total) {
  if (concluido)  return { card: 'concluido', stCls: 'st-concluido', stLbl: 'Concluído',   bar: ''         };
  if (prog > 0)   return { card: 'andamento', stCls: 'st-andamento', stLbl: 'Em andamento', bar: 'andamento' };
  return               { card: 'pendente',  stCls: 'st-pendente',  stLbl: 'Pendente',     bar: 'pendente'  };
}

// ===========================
// SCREENS
// ===========================

function scrPDVInfo() {
  const pode = S.pdv.codigo.trim() !== '' && S.pdv.nome.trim() !== '';
  return `
    ${header('PDV Score 2.0', 'Identificação do PDV')}
    <div class="content">
      <div class="login-logo" style="padding:20px 0 18px">
        <div class="logo-circle">🐾</div>
        <h1>PDV Score 2.0</h1>
        <p>Sistema de Avaliação – Loja Perfeita</p>
      </div>
      <div class="q-card">
        <div class="form-group">
          <label class="form-label">Cód. Loja</label>
          <input class="form-input" type="text" placeholder="Ex: 1132221"
                 value="${S.pdv.codigo}"
                 oninput="S.pdv.codigo=this.value; syncBtn()">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Nome / Razão Social</label>
          <input class="form-input" type="text" placeholder="Ex: CASAS DA ÁGUA"
                 value="${S.pdv.nome}"
                 oninput="S.pdv.nome=this.value; syncBtn()">
        </div>
      </div>
      <div class="info-box">
        📍 Confirme que está no PDV correto antes de iniciar a coleta.
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-primary" id="btn-iniciar"
              onclick="go('tipo_sel')" ${!pode ? 'disabled' : ''}>
        Iniciar Coleta →
      </button>
    </div>`;
}

function scrTipoSel() {
  const pode = S.tipoPDV !== null && S.tipoNegocio !== null;

  function tipoPDVBtn(id, emoji, label) {
    return `<button class="opt-btn ${S.tipoPDV === id ? 'sel' : ''}"
                    onclick="setTipo('${id}')">${emoji} ${label}</button>`;
  }

  return `
    ${header(pdvLine(), 'Configuração da Coleta', 'pdv_info')}
    <div class="content">

      <div class="q-card">
        <div class="q-text">Qual o perfil da Loja?</div>
        ${tipoPDVBtn('balcao',       '🏬', 'Balcão')}
        ${tipoPDVBtn('misto',        '🏪', 'Misto')}
        ${tipoPDVBtn('autosservico', '🛒', 'Autosserviço')}
      </div>

      <div class="q-card">
        <div class="q-text">Tipo de Negócio</div>
        ${TIPOS_NEGOCIO.map(t => `
          <div class="radio-opt ${S.tipoNegocio === t ? 'sel' : ''}"
               onclick="S.tipoNegocio='${t}'; render()">
            <div class="radio-dot"></div>
            <span class="radio-lbl">${t}</span>
          </div>`).join('')}
      </div>

    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('pdv_info')">← Voltar</button>
      <button class="btn-primary" onclick="go('dashboard')" ${!pode ? 'disabled' : ''}>
        Ver Módulos →
      </button>
    </div>`;
}

function scrDashboard() {
  const allDone = S.comConcluido && S.peConcluido && S.mixConcluido;

  const comProg = S.comConcluido ? 3 : [S.q2, S.q3, S.q4].filter(Boolean).length;
  const peProg  = S.peConcluido  ? 2 : (S.q6 ? 1 : 0);
  const mixProg = S.mixConcluido ? 1 : 0;

  const com = moduloStatus(S.comConcluido, comProg, 3);
  const pe  = moduloStatus(S.peConcluido,  peProg,  2);
  const mix = moduloStatus(S.mixConcluido, mixProg, 1);

  function card(icon, name, prog, total, st, screen) {
    const pct = total > 0 ? Math.round((prog / total) * 100) : 0;
    return `
      <div class="module-card ${st.card}" onclick="go('${screen}')">
        <div class="module-icon">${icon}</div>
        <div class="module-info">
          <div class="module-name">${name}</div>
          <div class="module-prog-txt">Progresso &nbsp; ${prog} / ${total}</div>
          <div class="prog-track">
            <div class="prog-fill ${st.bar}" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="module-status ${st.stCls}">${st.stLbl}</div>
      </div>`;
  }

  return `
    ${header(pdvLine(), 'Módulos de Coleta', 'pdv_info')}
    <div class="content">
      <div class="info-box" style="margin-bottom:14px">
        🏷️ <strong>${S.tipoPDV === 'balcao' ? 'Balcão' : S.tipoPDV === 'misto' ? 'Misto' : 'Autosserviço'}</strong>
        &nbsp;·&nbsp; ${S.tipoNegocio || ''}
      </div>
      ${card('📢', 'Comunicação', comProg, 3, com, 'com_q2')}
      ${card('🏪', 'Ponto Extra',  peProg,  2, pe,  'pe_q6')}
      ${card('🛒', 'Mix e Preços', mixProg, 1, mix, 'mix_linhas')}
      ${allDone ? `<div class="info-box green">✅ Todos os módulos concluídos! Finalize a pesquisa.</div>` : ''}
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('tipo_sel')">← Configuração</button>
      <button class="btn-primary" onclick="go('resultado')" ${!allDone ? 'disabled' : ''}>
        📊 Finalizar Pesquisa
      </button>
    </div>`;
}

/* ---- COMUNICAÇÃO ---- */

function scrComQ2() {
  const isB = S.tipoPDV === 'balcao';
  return `
    ${header(pdvLine(), 'Comunicação', 'dashboard')}
    <div class="content">
      ${stepDots(3, 0)}
      <div class="q-card">
        <div class="q-text">2. Na fachada possui alguma comunicação que identifique que o PDV trabalha com a marca Tigre?</div>
        <button class="opt-btn ${S.q2 === 'sim' ? 'sel' : ''}" onclick="S.q2='sim'; render()">✅ Sim</button>
        <button class="opt-btn ${S.q2 === 'nao' ? 'sel' : ''}" onclick="S.q2='nao'; render()">❌ Não</button>
        ${S.q2 === 'sim' ? fotoInput('q2') : ''}
      </div>
      <div class="info-box">
        💡 Peso: Sim = <strong>+${isB ? '1,25' : '0,50'}</strong> &nbsp;|&nbsp; Não = <strong>${isB ? '–0,50' : '–0,25'}</strong>
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
      <button class="btn-primary" onclick="go('com_q3')"
        ${!S.q2 || (S.q2 === 'sim' && !S.fotos.q2) ? 'disabled' : ''}>Próximo →</button>
    </div>`;
}

function scrComQ3() {
  const isB = S.tipoPDV === 'balcao';
  return `
    ${header(pdvLine(), 'Comunicação', 'com_q2')}
    <div class="content">
      ${stepDots(3, 1)}
      <div class="q-card">
        <div class="q-text">3. Ao entrar no PDV consegui visualizar alguma comunicação com a marca Tigre?</div>
        <button class="opt-btn ${S.q3 === 'sim' ? 'sel' : ''}" onclick="S.q3='sim'; render()">✅ Sim</button>
        <button class="opt-btn ${S.q3 === 'nao' ? 'sel' : ''}" onclick="S.q3='nao'; render()">❌ Não</button>
        ${S.q3 === 'sim' ? fotoInput('q3') : ''}
      </div>
      <div class="info-box">
        💡 Peso: Sim = <strong>+${isB ? '1,25' : '0,50'}</strong> &nbsp;|&nbsp; Não = <strong>${isB ? '–0,50' : '–0,25'}</strong>
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('com_q2')">← Voltar</button>
      <button class="btn-primary" onclick="go('com_q4')"
        ${!S.q3 || (S.q3 === 'sim' && !S.fotos.q3) ? 'disabled' : ''}>Próximo →</button>
    </div>`;
}

function scrComQ4() {
  const isB = S.tipoPDV === 'balcao';
  return `
    ${header(pdvLine(), 'Comunicação', 'com_q3')}
    <div class="content">
      ${stepDots(3, 2)}
      <div class="q-card">
        <div class="q-text">4. Existe alguma comunicação aplicada no setor Tigre?</div>
        <button class="opt-btn ${S.q4 === 'sim' ? 'sel' : ''}" onclick="S.q4='sim'; render()">✅ Sim</button>
        <button class="opt-btn ${S.q4 === 'nao' ? 'sel' : ''}" onclick="S.q4='nao'; render()">❌ Não</button>
        ${S.q4 === 'sim' ? fotoInput('q4') : ''}
      </div>
      <div class="info-box">
        💡 Peso: Sim = <strong>+${isB ? '1,25' : '1,00'}</strong> &nbsp;|&nbsp; Não = <strong>–0,50</strong>
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('com_q3')">← Voltar</button>
      <button class="btn-primary" onclick="afterQ4()"
        ${!S.q4 || (S.q4 === 'sim' && !S.fotos.q4) ? 'disabled' : ''}>Próximo →</button>
    </div>`;
}

function scrComQ5() {
  const list = S.tipoPDV === 'balcao' ? COMUNICACOES.balcao : COMUNICACOES.misto;
  return `
    ${header(pdvLine(), 'Comunicação', 'com_q4')}
    <div class="content">
      <div class="q-card">
        <div class="q-text">5. Quais comunicações estão aplicadas? (selecione todas)</div>
        <div class="check-list">
          ${list.map(it => `
            <div class="check-item ${S.q5.includes(it.id) ? 'chk' : ''}" onclick="toggleQ5('${it.id}')">
              <input type="checkbox" ${S.q5.includes(it.id) ? 'checked' : ''} onclick="event.stopPropagation()">
              <span class="check-lbl">${it.label}</span>
              <span class="check-peso">+${it.peso.toFixed(2)}</span>
            </div>`).join('')}
        </div>
        ${fotoInput('q5')}
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('com_q4')">← Voltar</button>
      <button class="btn-primary" onclick="concluirCom()" ${!S.fotos.q5 ? 'disabled' : ''}>Concluir Comunicação ✓</button>
    </div>`;
}

/* ---- PONTO EXTRA ---- */

function scrPEQ6() {
  return `
    ${header(pdvLine(), 'Ponto Extra', 'dashboard')}
    <div class="content">
      ${stepDots(2, 0)}
      <div class="q-card">
        <div class="q-text">6. Existe algum ponto extra executado no PDV?</div>
        <button class="opt-btn ${S.q6 === 'sim' ? 'sel' : ''}" onclick="S.q6='sim'; render()">✅ Sim</button>
        <button class="opt-btn ${S.q6 === 'nao' ? 'sel' : ''}" onclick="S.q6='nao'; render()">❌ Não</button>
        ${S.q6 === 'sim' ? fotoInput('q6') : ''}
      </div>
      <div class="info-box">
        💡 Peso: Sim = <strong>0 pts</strong> (detalhado na próxima etapa) &nbsp;|&nbsp; Não = <strong>–0,50</strong>
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
      <button class="btn-primary" onclick="afterQ6()"
        ${!S.q6 || (S.q6 === 'sim' && !S.fotos.q6) ? 'disabled' : ''}>Próximo →</button>
    </div>`;
}

function calcPEItem(peso, qty) {
  if (qty < 1) return 0;
  return peso + (qty > 1 ? 0.25 * (qty - 1) : 0);
}

function scrPEQ7() {
  const isB = S.tipoPDV === 'balcao';
  const list = isB ? PONTOS_EXTRA.balcao : PONTOS_EXTRA.misto;
  const peCap = isB ? 3.10 : 5.00;

  // calcula subtotal corrente para mostrar progresso vs cap
  let subtotal = 0;
  Object.entries(S.q7).forEach(([id, qty]) => {
    const it = list.find(p => p.id === id);
    if (it && qty > 0) subtotal += calcPEItem(it.peso, qty);
  });
  subtotal = Math.min(subtotal, peCap);

  return `
    ${header(pdvLine(), 'Ponto Extra', 'pe_q6')}
    <div class="content">
      ${stepDots(2, 1)}
      <div class="info-box orange">
        🏷️ 1ª unidade = peso completo &nbsp;|&nbsp; unidades adicionais = <strong>+0,25 pts</strong> cada
        &nbsp;·&nbsp; Limite do módulo: <strong>${peCap.toFixed(2)} pts</strong>
      </div>
      <div class="q-card">
        <div class="q-text">7. Qual o tipo e quantidade de pontos extras?</div>
        ${list.map(pe => {
          const qty = S.q7[pe.id] || 0;
          const pts = calcPEItem(pe.peso, qty).toFixed(2);
          const dica = qty > 1 ? `${pe.peso.toFixed(2)} + ${(0.25*(qty-1)).toFixed(2)}` : pe.peso.toFixed(2);
          return `
            <div class="pe-row ${qty > 0 ? 'active' : ''}">
              <div class="pe-row-top">
                <span class="pe-lbl">${pe.label}</span>
                <span class="pe-peso">1ª uni: +${pe.peso.toFixed(2)} &nbsp;|&nbsp; extra: +0,25</span>
              </div>
              <div class="qty-group">
                <button class="qty-btn" onclick="changeQty('${pe.id}', -1)">−</button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn" onclick="changeQty('${pe.id}', 1)">+</button>
                ${qty > 0 ? `<span class="qty-pts">= ${pts} pts &nbsp;(${dica})</span>` : ''}
              </div>
              ${qty > 0 ? fotoInput('q7', pe.id) : ''}
            </div>`;
        }).join('')}
      </div>
      <div class="info-box ${subtotal >= peCap ? 'orange' : 'green'}" style="margin-top:0">
        Subtotal Ponto Extra: <strong>${subtotal.toFixed(2)} / ${peCap.toFixed(2)} pts</strong>
        ${subtotal >= peCap ? ' &nbsp;⚠️ Limite atingido' : ''}
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('pe_q6')">← Voltar</button>
      <button class="btn-primary" onclick="concluirPE()"
        ${Object.keys(S.q7).some(id => (S.q7[id] > 0) && !(S.fotos.q7 && S.fotos.q7[id])) ? 'disabled' : ''}>
        Concluir Ponto Extra ✓
      </button>
    </div>`;
}

/* ---- MIX E PREÇOS ---- */

function scrMixLinhas() {
  return `
    ${header(pdvLine(), 'Mix e Preços', 'dashboard')}
    <div class="content">
      <div class="q-card">
        <div class="q-text">Quais linhas de produtos o PDV trabalha?</div>
        <div class="check-list">
          ${LINHAS.map(l => `
            <div class="check-item ${S.linhas.includes(l) ? 'chk' : ''}" onclick="toggleLinha('${l}')">
              <input type="checkbox" ${S.linhas.includes(l) ? 'checked' : ''} onclick="event.stopPropagation()">
              <span class="check-lbl">${l}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="info-box">
        💡 Selecione todas as linhas presentes no PDV. Será avaliada a ruptura por linha.
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
      <button class="btn-primary" onclick="iniciarLinhaDetalhe()" ${S.linhas.length === 0 ? 'disabled' : ''}>Próximo →</button>
    </div>`;
}

function scrMixDetalhe() {
  if (S.linhas.length === 0) { go('mix_linhas'); return ''; }
  const idx   = S._linhaIdx;
  const linha = S.linhas[idx];
  const total = S.linhas.length;
  const d     = S.mixData[linha] || {};

  const pips = S.linhas.map((_, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'current' : '';
    return `<div class="linha-pip ${cls}"></div>`;
  }).join('');

  const podeAvancar = d.trabalha === false || (d.trabalha === true && d.ruptura !== undefined && d.ruptura !== null);

  return `
    ${header(pdvLine(), 'Mix e Preços', '')}
    <div class="content">
      <div class="linha-progress">${pips}</div>
      <div style="text-align:center;font-size:11px;color:#999;margin-bottom:12px">
        Linha ${idx + 1} de ${total}
      </div>
      <div class="q-card">
        <div style="font-size:15px;font-weight:800;color:#E87722;margin-bottom:16px">📦 ${linha}</div>
        <div class="q-text" style="font-size:13px">O PDV trabalha com produtos desta linha?</div>
        <button class="opt-btn ${d.trabalha === true  ? 'sel' : ''}" onclick="setTrabalha('${linha}', true)">✅ Sim, trabalha</button>
        <button class="opt-btn ${d.trabalha === false ? 'sel' : ''}" onclick="setTrabalha('${linha}', false)">❌ Não trabalha esta linha</button>

        ${d.trabalha === true ? `
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid #EEE">
            <div class="q-text" style="font-size:13px">Há ruptura de produtos Tigre nesta linha?</div>
            <button class="opt-btn ${d.ruptura === true  ? 'sel' : ''}" onclick="setRuptura('${linha}', true)">⚠️ Sim, há ruptura</button>
            <button class="opt-btn ${d.ruptura === false ? 'sel' : ''}" onclick="setRuptura('${linha}', false)">✅ Sem ruptura</button>
          </div>
          <div class="info-box ${d.ruptura === false ? 'green' : d.ruptura === true ? 'orange' : ''}" style="margin-top:10px">
            ${d.ruptura === false ? '✅ Sem ruptura: <strong>+1,00</strong> na nota geral'
              : d.ruptura === true  ? '⚠️ Com ruptura: <strong>–0,10</strong> na nota geral'
              : '💡 Informe se há ruptura para calcular o score.'}
          </div>
        ` : ''}
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="prevLinha()">← Voltar</button>
      <button class="btn-primary" onclick="nextLinha('${linha}')" ${!podeAvancar ? 'disabled' : ''}>
        ${idx === total - 1 ? 'Concluir Mix ✓' : 'Próxima Linha →'}
      </button>
    </div>`;
}

/* ---- RESULTADO ---- */

function scrResultado() {
  const sc = calcScore();
  const cl = classificacao(sc.total);

  function bdRow(icon, label, val) {
    const v = typeof val === 'number' ? val : 0;
    return `
      <div class="bd-row">
        <span class="bd-lbl">${icon} ${label}</span>
        <span class="bd-val ${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v.toFixed(2)}</span>
      </div>`;
  }

  const tipo = S.tipoPDV === 'balcao' ? 'Balcão' : S.tipoPDV === 'misto' ? 'Misto' : 'Autosserviço';

  return `
    ${header(pdvLine(), 'Resultado da Avaliação', 'dashboard')}
    <div class="content">
      <div style="text-align:center;padding:20px 0 8px">
        <div class="score-circle">
          <div class="score-val">${sc.total.toFixed(1)}</div>
          <div class="score-lbl">Score Total</div>
        </div>
        <div class="score-class ${cl.cls}">${cl.label}</div>
      </div>

      <div class="breakdown">
        <div class="bd-title">📊 Detalhamento por módulo</div>
        ${bdRow('📢', 'Comunicação', sc.com)}
        ${bdRow('🏪', `Ponto Extra (limite: ${S.tipoPDV === 'balcao' ? '3,10' : '5,00'} pts)`, sc.pe)}
        ${bdRow('🛒', 'Mix e Preços', sc.mix)}
        <div class="bd-row total-row">
          <span class="bd-lbl">SCORE FINAL <small style="font-weight:400;color:#999">(máx. 10,00)</small></span>
          <span class="bd-val" style="color:#1B3F70">${sc.total.toFixed(2)}</span>
        </div>
      </div>
      ${sc.total >= 10 ? `<div class="info-box orange">🏆 Score máximo de 10,00 pontos atingido!</div>` : ''}

      <div class="info-box">
        🏬 Tipo PDV: <strong>${tipo}</strong><br>
        📋 Negócio: <strong>${S.tipoNegocio || '–'}</strong><br>
        🏪 PDV: <strong>${S.pdv.codigo ? S.pdv.codigo + ' – ' : ''}${S.pdv.nome || '–'}</strong>
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"    onclick="go('dashboard')">← Dashboard</button>
      <button class="btn-primary"  onclick="novaColeta()">📋 Nova Coleta</button>
    </div>`;
}

// ===========================
// FOTO HELPERS
// ===========================

function setFoto(key, inputEl, subkey) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    if (subkey !== undefined) {
      if (!S.fotos[key]) S.fotos[key] = {};
      S.fotos[key][subkey] = e.target.result;
    } else {
      S.fotos[key] = e.target.result;
    }
    render();
  };
  reader.readAsDataURL(file);
}

function fotoInput(key, subkey) {
  const data = subkey !== undefined
    ? (S.fotos[key] && S.fotos[key][subkey])
    : S.fotos[key];
  const id = subkey !== undefined ? `foto-${key}-${subkey}` : `foto-${key}`;
  const onchange = subkey !== undefined
    ? `setFoto('${key}', this, '${subkey}')`
    : `setFoto('${key}', this)`;

  return `
    <div class="foto-upload">
      <input type="file" accept="image/*" capture="environment" id="${id}" onchange="${onchange}">
      <label for="${id}" class="${data ? 'has-foto' : ''}">
        ${data
          ? `<img src="${data}" alt="Foto"><span class="foto-ok">✅ Foto anexada — toque para alterar</span>`
          : `<div class="foto-icon">📷</div><div>Tirar / Anexar Foto</div><div class="foto-req">Obrigatório</div>`}
      </label>
    </div>`;
}

// ===========================
// ACTIONS
// ===========================

function setTipo(tipo) {
  if (S.tipoPDV !== tipo) {
    S.q2 = null; S.q3 = null; S.q4 = null; S.q5 = [];
    S.q6 = null; S.q7 = {};
    S.comConcluido = false; S.peConcluido = false;
    S.linhas = []; S.mixData = {}; S.mixConcluido = false;
  }
  S.tipoPDV = tipo;
  render();
}

function toggleQ5(id) {
  const i = S.q5.indexOf(id);
  if (i === -1) S.q5.push(id); else S.q5.splice(i, 1);
  render();
}

function afterQ4() {
  if (S.q4 === 'sim') go('com_q5');
  else concluirCom();
}

function concluirCom() {
  S.comConcluido = true;
  go('dashboard');
}

function afterQ6() {
  if (S.q6 === 'sim') go('pe_q7');
  else concluirPE();
}

function concluirPE() {
  S.peConcluido = true;
  go('dashboard');
}

function changeQty(id, delta) {
  const cur = S.q7[id] || 0;
  const nxt = Math.max(0, cur + delta);
  if (nxt === 0) delete S.q7[id]; else S.q7[id] = nxt;
  render();
}

function toggleLinha(l) {
  const i = S.linhas.indexOf(l);
  if (i === -1) S.linhas.push(l);
  else { S.linhas.splice(i, 1); delete S.mixData[l]; }
  render();
}

function iniciarLinhaDetalhe() {
  S._linhaIdx = 0;
  go('mix_detalhe');
}

function setTrabalha(linha, val) {
  if (!S.mixData[linha]) S.mixData[linha] = {};
  S.mixData[linha].trabalha = val;
  if (!val) S.mixData[linha].ruptura = null;
  render();
}

function setRuptura(linha, val) {
  if (!S.mixData[linha]) S.mixData[linha] = { trabalha: true };
  S.mixData[linha].ruptura = val;
  render();
}

function prevLinha() {
  if (S._linhaIdx > 0) { S._linhaIdx--; render(); }
  else go('mix_linhas');
}

function nextLinha(linha) {
  if (S._linhaIdx < S.linhas.length - 1) {
    S._linhaIdx++;
    render();
  } else {
    S.mixConcluido = true;
    go('dashboard');
  }
}

function novaColeta() {
  S = resetState();
  render();
}

function syncBtn() {
  const btn = document.getElementById('btn-iniciar');
  if (btn) btn.disabled = !(S.pdv.codigo.trim() && S.pdv.nome.trim());
}

// ===========================
// RENDER
// ===========================

const SCREENS = {
  pdv_info:    scrPDVInfo,
  tipo_sel:    scrTipoSel,
  dashboard:   scrDashboard,
  com_q2:      scrComQ2,
  com_q3:      scrComQ3,
  com_q4:      scrComQ4,
  com_q5:      scrComQ5,
  pe_q6:       scrPEQ6,
  pe_q7:       scrPEQ7,
  mix_linhas:  scrMixLinhas,
  mix_detalhe: scrMixDetalhe,
  resultado:   scrResultado,
};

function render() {
  const app = document.getElementById('app');
  const fn  = SCREENS[S.screen];
  if (fn) {
    app.innerHTML = fn();
    app.scrollTop = 0;
  }
}

render();
