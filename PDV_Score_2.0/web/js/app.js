'use strict';

// ===========================
// LOJAS (carregado do JSON)
// ===========================

let LOJAS = null;

async function loadLojas() {
  try {
    const res = await fetch('dados/lojas.json');
    LOJAS = await res.json();
  } catch (e) {
    LOJAS = {};
  }
}

function buscarLoja(cod) {
  if (!LOJAS) return null;
  return LOJAS[String(cod).trim()] || null;
}

function sugestoesLoja(prefix, max = 6) {
  if (!LOJAS || !prefix || prefix.length < 1) return [];
  const p = String(prefix).trim();

  if (/^\d+$/.test(p)) {
    return Object.entries(LOJAS)
      .filter(([k]) => k.startsWith(p))
      .slice(0, max)
      .map(([k, v]) => ({ cod: k, ...v }));
  }

  if (p.length < 3) return [];
  const pUp = p.toUpperCase();
  const results = [];
  for (const [k, v] of Object.entries(LOJAS)) {
    if ((v.nome || v.razao || '').toUpperCase().includes(pUp))
      results.push({ cod: k, ...v });
    if (results.length >= max) break;
  }
  return results;
}

function onCodLojaInput(val) {
  const inputEl   = document.getElementById('cod-loja-input');
  const cursorPos = inputEl ? inputEl.selectionStart : val.length;

  S.pdv.codigo      = val;
  S._lojaConfirmada = false;
  S.pdv.nome        = '';
  S.pdv.cidade      = '';
  S.pdv.uf          = '';
  S.pdv.endereco    = '';
  S.pdv.cnpj        = '';
  S._sugestoes      = sugestoesLoja(val);

  const container = document.querySelector('.sug-list-container');
  if (container) {
    const sugs = S._sugestoes;
    container.innerHTML = sugs.length
      ? `<div class="sug-list">${sugs.map(s =>
          `<div class="sug-item"
               onmousedown="event.preventDefault()"
               onclick="selecionarSugestao('${s.cod}')">
             <span class="sug-cod">${s.cod}</span>
             <span class="sug-nome">${s.nome || s.razao || ''}</span>
             <span class="sug-loc">${s.cidade || ''}${s.uf ? ' – ' + s.uf : ''}</span>
           </div>`).join('')}
        </div>`
      : '';
  }
  syncBtn();

  if (inputEl) {
    inputEl.focus();
    inputEl.setSelectionRange(cursorPos, cursorPos);
  }
}

function selecionarSugestao(cod) {
  const loja = buscarLoja(cod);
  if (!loja) return;
  S.pdv.codigo      = cod;
  S.pdv.nome        = loja.nome;
  S.pdv.cidade      = loja.cidade;
  S.pdv.uf          = loja.uf;
  S.pdv.endereco    = loja.endereco;
  S.pdv.cnpj        = loja.cnpj;
  S._sugestoes      = [];
  S._lojaConfirmada = true;
  render();
}

// ===========================
// MIX DIRECIONADO (carregado do JSON)
// ===========================

let MIX = null;

async function loadMix() {
  try {
    const res = await fetch('dados/mix_direcionado.json');
    MIX = await res.json();
  } catch (e) {
    MIX = {};
  }
}

// mapeia tipo de negócio -> grupo de mix
const GRUPO_NEGOCIO = {
  'Varejo Generalista':                              'generalista',
  'Especializado Hidráulica':                        'hidr_elet',
  'Especializado Elétrica':                          'hidr_elet',
  'Especializado em Tintas':                         'tintas',
  'Especializado em Ferramentas e Ferragens':        'ferr_mat_rev',
  'Especializado em Materiais Básicos / Pesados':    'ferr_mat_rev',
  'Especializado em Revestimentos':                  'ferr_mat_rev',
};

// retorna { LINHA: [{p, w, foco?}, ...] } para o PDV atual
function getMixList() {
  if (!MIX) return {};
  const grupo = GRUPO_NEGOCIO[S.tipoNegocio];
  if (S.tipoPDV === 'balcao') {
    // Balcão: lista única por grupo de negócio (mesma para P/M/G)
    return (MIX.balcao && MIX.balcao[grupo]) || {};
  }
  const bloco = MIX[S.tipoPDV] && MIX[S.tipoPDV][grupo];
  if (!bloco) return {};
  return bloco[S.tamanhoLoja] || {};
}

// ===========================
// MODELO DE PONTUAÇÃO
// (loja começa em 10 e perde pontos)
// ===========================

const MODELO = {
  balcao: {
    label: 'Balcão',
    descricao: 'Loja de atendimento por balcão: o cliente não circula entre os produtos; o vendedor busca o item solicitado.',
    pesos: { visibilidade: 4, pontoExtra: 2, mix: 4 },
    visibilidade: {
      q1: { txt: 'Na fachada possui algum tipo de comunicação que identifique que o PDV trabalha com a marca Tigre?', penalNao: 1.0, foto: true },
      q2: { txt: 'Ao entrar no PDV consegui visualizar algum tipo de comunicação que traga a marca Tigre?',           penalNao: 3.0, foto: true },
      q3: null,
      checklistGate: 'q2',
      checklist: [ // perde a penalidade quando o item está AUSENTE
        { id: 'adesivo_balcao', label: 'Adesivo de Balcão',               penal: 1.00 },
        { id: 'adesivo_chao',   label: 'Adesivo de Chão / Pares de Pata', penal: 1.00 },
        { id: 'bandeirola',     label: 'Bandeirola',                       penal: 0.50 },
        { id: 'cesto',          label: 'Cesto ou Box Promocional',         penal: 0.30 },
        { id: 'personalizada',  label: 'Comunicação Personalizada',        penal: 0.00, bonus: true, cap: 3.00 },
        { id: 'display_aereo',  label: 'Display Aéreo',                    penal: 0.15 },
        { id: 'totem',          label: 'Totem',                            penal: 0.05 },
      ],
    },
    pontoExtra: {
      penalNao: 2.0,
      tipos: [ // perde a penalidade quando o tipo está AUSENTE
        { id: 'display', label: 'Display', penal: 0 },
        { id: 'ilha',    label: 'Ilha',    penal: 0 },
        { id: 'pilha',   label: 'Pilha',   penal: 0 },
        { id: 'vitrine', label: 'Vitrine', penal: 0 },
      ],
    },
  },

  misto: {
    label: 'Misto',
    descricao: 'Combina atendimento por balcão com área de autosserviço, onde parte dos produtos fica em gôndolas acessíveis ao cliente.',
    pesos: { visibilidade: 4, pontoExtra: 3, mix: 3 },
    visibilidade: {
      q1: { txt: 'Na fachada possui algum tipo de comunicação que identifique que o PDV trabalha com a marca Tigre?', penalNao: 0.5, foto: true },
      q2: { txt: 'Ao entrar no PDV consegui visualizar algum tipo de comunicação que traga a marca Tigre?',           penalNao: 1.0, foto: true },
      q3: { txt: 'Existe alguma comunicação aplicada no setor Tigre?',                                                penalNao: 2.5 },
      checklistGate: 'q3',
      checklist: [
        { id: 'adesivo_balcao',   label: 'Adesivo de Balcão',               penal: 0.10 },
        { id: 'adesivo_chao',     label: 'Adesivo de Chão / Pares de Pata', penal: 0.25 },
        { id: 'bandeirola',       label: 'Bandeirola',                       penal: 0.10 },
        { id: 'bobina',           label: 'Bobina de Forração',               penal: 0.10 },
        { id: 'cesto',            label: 'Cesto ou Box Promocional',         penal: 0.10 },
        { id: 'personalizada',    label: 'Comunicação Personalizada',        penal: 0.00, bonus: true, cap: 2.50 },
        { id: 'cubos',            label: 'Cubos',                            penal: 0.10 },
        { id: 'display_aereo',    label: 'Display Aéreo',                    penal: 0.10 },
        { id: 'expositor_custom', label: 'Expositor Customizado',            penal: 0.10 },
        { id: 'expositor',        label: 'Expositor Padronizado',            penal: 0.10 },
        { id: 'faixa_gondola',    label: 'Faixa de Gôndola',                penal: 0.25 },
        { id: 'ficha_produto',    label: 'Ficha de Produto',                 penal: 0.30 },
        { id: 'fita_cross',       label: 'Fita Cross',                       penal: 0.25 },
        { id: 'stopper',          label: 'Stopper',                          penal: 0.25 },
        { id: 'testeira',         label: 'Testeira',                         penal: 0.10 },
        { id: 'totem',            label: 'Totem',                            penal: 0.10 },
        { id: 'wobbler',          label: 'Wobbler',                          penal: 0.10 },
      ],
    },
    pontoExtra: {
      penalNao: 3.0,
      tipos: [
        { id: 'checkout',      label: 'Check Out',        penal: 0.25 },
        { id: 'display',       label: 'Display',          penal: 0 },
        { id: 'expositor',     label: 'Expositor',        penal: 0 },
        { id: 'fita_cross',    label: 'Fita Cross',       penal: 0.25 },
        { id: 'ilha',          label: 'Ilha',             penal: 0 },
        { id: 'pilha',         label: 'Pilha',            penal: 0 },
        { id: 'ponta_gondola', label: 'Ponta de Gôndola', penal: 0.25 },
        { id: 'vitrine',       label: 'Vitrine',          penal: 0 },
      ],
    },
  },

  autosservico: {
    label: 'Autosserviço',
    descricao: 'O cliente circula livremente e se serve dos produtos nas gôndolas (modelo supermercado / home center).',
    pesos: { visibilidade: 4, pontoExtra: 3, mix: 3 },
    visibilidade: {
      q1: { txt: 'Na fachada possui algum tipo de comunicação que identifique que o PDV trabalha com a marca Tigre?', penalNao: 0, foto: true },
      q2: { txt: 'Ao entrar no PDV consegui visualizar algum tipo de comunicação que traga a marca Tigre?',           penalNao: 1.0, foto: true },
      q3: { txt: 'Existe alguma comunicação aplicada no setor Tigre?',                                                penalNao: 3.0 },
      checklistGate: 'q3',
      checklist: [
        { id: 'adesivo_chao',     label: 'Adesivo de Chão / Pares de Pata', penal: 0.30 },
        { id: 'bandeirola',       label: 'Bandeirola',                       penal: 0.15 },
        { id: 'bobina',           label: 'Bobina de Forração',               penal: 0.10 },
        { id: 'cesto',            label: 'Cesto ou Box Promocional',         penal: 0.10 },
        { id: 'personalizada',    label: 'Comunicação Personalizada',        penal: 0.00, bonus: true, cap: 2.50 },
        { id: 'cubos',            label: 'Cubos',                            penal: 0.10 },
        { id: 'display_aereo',    label: 'Display Aéreo',                    penal: 0.10 },
        { id: 'expositor_custom', label: 'Expositor Customizado',            penal: 0.10 },
        { id: 'expositor',        label: 'Expositor Padronizado',            penal: 0.10 },
        { id: 'faixa_gondola',    label: 'Faixa de Gôndola',                penal: 0.50 },
        { id: 'ficha_produto',    label: 'Ficha de Produto',                 penal: 0.50 },
        { id: 'fita_cross',       label: 'Fita Cross',                       penal: 0.35 },
        { id: 'stopper',          label: 'Stopper',                          penal: 0.30 },
        { id: 'testeira',         label: 'Testeira',                         penal: 0.10 },
        { id: 'totem',            label: 'Totem',                            penal: 0.10 },
        { id: 'wobbler',          label: 'Wobbler',                          penal: 0.10 },
      ],
    },
    pontoExtra: {
      penalNao: 3.0,
      tipos: [
        { id: 'checkout',      label: 'Check Out',        penal: 0.25 },
        { id: 'display',       label: 'Display',          penal: 0 },
        { id: 'expositor',     label: 'Expositor',        penal: 0 },
        { id: 'fita_cross',    label: 'Fita Cross',       penal: 0.25 },
        { id: 'ilha',          label: 'Ilha',             penal: 0 },
        { id: 'pilha',         label: 'Pilha',            penal: 0 },
        { id: 'ponta_gondola', label: 'Ponta de Gôndola', penal: 0.25 },
        { id: 'vitrine',       label: 'Vitrine',          penal: 0 },
      ],
    },
  },
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

function modelo() { return MODELO[S.tipoPDV]; }

// ===========================
// STATE
// ===========================

let S = resetState();

function resetState() {
  return {
    screen: 'pdv_info',
    pdv: { codigo: '', nome: '' },
    tipoPDV: null,            // 'balcao' | 'misto' | 'autosservico'
    tipoNegocio: null,
    tamanhoLoja: null,        // 'P' | 'M' | 'G'

    // módulo Visibilidade  (itens: {id: qty}; fotos: {id: [dataURL]})
    vis: { q1: null, q2: null, q3: null, itens: {}, fotos: {}, done: false, foto1: null, foto2: null },
    // módulo Ponto Extra
    pe:  { existe: null, tipos: {}, fotos: {}, done: false }, // tipos: {id: qty}; fotos: {id: [dataURL]}
    // módulo Mix Direcionado
    mix: { lines: [], prod: {}, done: false, _idx: 0 },       // prod: { 'LINHA::PROD': {trabalha,ruptura,preco,foto} }

    _sugestoes: [],
    _lojaConfirmada: false,
    _infoTipo: null,          // tipo cujo texto informativo está aberto
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

function prodKey(linha, prod) { return linha + '::' + prod; }

function visPresente(id) { return (S.vis.itens[id] || 0) > 0; }

function visFotosOk() {
  return Object.entries(S.vis.itens).every(([id, qty]) => {
    if (qty < 1) return true;
    const arr = S.vis.fotos[id] || [];
    return arr.filter(Boolean).length >= qty;
  });
}

// perda do módulo Visibilidade
function calcVisLoss() {
  const m = modelo().visibilidade;
  const gate = m.checklistGate;
  let loss = 0;
  if (S.vis.q1 === 'nao') loss += m.q1.penalNao;
  if (S.vis.q2 === 'nao') loss += m.q2.penalNao;
  if (m.q3 && S.vis.q3 === 'nao') loss += m.q3.penalNao;

  // checklist habilitado quando a pergunta-gate for "Sim"
  if (S.vis[gate] === 'sim') {
    let raw = 0;
    m.checklist.forEach(it => { if (!it.bonus && !visPresente(it.id)) raw += it.penal; });
    // coringa (Comunicação Personalizada) presente supre os faltantes até o teto (cap)
    const bonus = m.checklist.find(it => it.bonus && visPresente(it.id));
    if (bonus) raw = Math.max(0, raw - (bonus.cap || 0));
    loss += raw;
  }
  return loss;
}

// perda do módulo Ponto Extra
function calcPeLoss() {
  const m = modelo().pontoExtra;
  if (S.pe.existe === 'nao') return m.penalNao;
  if (S.pe.existe === 'sim') {
    let loss = 0;
    m.tipos.forEach(t => {
      const presente = (S.pe.tipos[t.id] || 0) > 0;
      if (!presente) loss += t.penal; // perde se AUSENTE
    });
    return loss;
  }
  return 0;
}

// perda do módulo Mix (peso próprio de cada produto, definido na planilha)
function calcMixLoss() {
  const dir = getMixList();
  let total = 0, faltantes = 0, loss = 0;
  Object.entries(dir).forEach(([linha, ps]) => ps.forEach(prod => {
    total++;
    const d = S.mix.prod[prodKey(linha, prod.p)];
    const ok = d && d.trabalha === true && d.ruptura !== true;
    if (!ok) { faltantes++; loss += (prod.w || 0); } // não trabalha OU em ruptura => perde o peso do produto
  }));
  return { loss, total, faltantes };
}

function calcScore() {
  const pesos = modelo().pesos;
  const vis = S.vis.done ? Math.max(0, pesos.visibilidade - calcVisLoss()) : pesos.visibilidade;
  const pe  = S.pe.done  ? Math.max(0, pesos.pontoExtra  - calcPeLoss())  : pesos.pontoExtra;
  const mixInfo = calcMixLoss();
  const mix = S.mix.done ? Math.max(0, pesos.mix - mixInfo.loss) : pesos.mix;
  const total = Math.max(0, Math.min(vis + pe + mix, 10.00));
  return { vis, pe, mix, total, pesos, mixInfo };
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

function moduloStatus(concluido, prog, total) {
  if (concluido)  return { card: 'concluido', stCls: 'st-concluido', stLbl: 'Concluído',    bar: ''          };
  if (prog > 0)   return { card: 'andamento', stCls: 'st-andamento', stLbl: 'Em andamento',  bar: 'andamento' };
  return               { card: 'pendente',  stCls: 'st-pendente',  stLbl: 'Pendente',      bar: 'pendente'  };
}

function fmt(v) { return (v >= 0 ? '' : '–') + Math.abs(v).toFixed(2); }

// ===========================
// SCREENS
// ===========================

function scrPDVInfo() {
  const pode  = S.pdv.codigo.trim() !== '' && S.pdv.nome.trim() !== '';
  const lojaOk = S._lojaConfirmada === true;

  const lojaInfoHtml = lojaOk ? `
    <div class="loja-info-box">
      <div class="loja-info-row"><span class="loja-info-label">Nome:</span> ${S.pdv.nome}</div>
      ${S.pdv.endereco ? `<div class="loja-info-row"><span class="loja-info-label">End.:</span> ${S.pdv.endereco}</div>` : ''}
      ${S.pdv.cidade   ? `<div class="loja-info-row"><span class="loja-info-label">Cidade:</span> ${S.pdv.cidade}${S.pdv.uf ? ' – ' + S.pdv.uf : ''}</div>` : ''}
      ${S.pdv.cnpj     ? `<div class="loja-info-row"><span class="loja-info-label">CNPJ:</span> ${S.pdv.cnpj}</div>` : ''}
    </div>` : '';

  const loadingHtml = LOJAS === null
    ? `<div class="info-box" style="color:#888">⏳ Carregando base de lojas…</div>` : '';

  return `
    ${header('PDV Score 2.0', 'Identificação do PDV')}
    <div class="content">
      <div class="login-logo" style="padding:20px 0 18px">
        <div class="logo-circle">🐾</div>
        <h1>PDV Score 2.0</h1>
        <p>Sistema de Avaliação – Loja Perfeita</p>
      </div>
      ${loadingHtml}
      <div class="q-card">
        <div class="form-group" style="position:relative">
          <label class="form-label">Cód. Loja</label>
          <input id="cod-loja-input" class="form-input" type="text"
                 placeholder="Código ou nome da loja" value="${S.pdv.codigo}"
                 oninput="onCodLojaInput(this.value)" autocomplete="off">
          <div style="font-size:11px;color:#999;margin-top:4px">🔍 Digite o código numérico ou parte do nome</div>
          <div class="sug-list-container"></div>
        </div>
        ${lojaOk ? lojaInfoHtml : `
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Nome / Razão Social</label>
          <input class="form-input" type="text" placeholder="Ex: CASAS DA ÁGUA"
                 value="${S.pdv.nome}"
                 oninput="S.pdv.nome=this.value; syncBtn()">
        </div>`}
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
  const pode = S.tipoPDV !== null && S.tipoNegocio !== null && S.tamanhoLoja !== null;

  function tipoPDVBtn(id, emoji, label) {
    const sel = S.tipoPDV === id;
    const aberto = S._infoTipo === id;
    return `
      <div class="tipo-wrap">
        <button class="opt-btn ${sel ? 'sel' : ''}" onclick="setTipo('${id}')">
          ${emoji} ${label}
          <span class="tipo-info-btn" onclick="event.stopPropagation(); toggleInfoTipo('${id}')">ⓘ</span>
        </button>
        ${aberto ? `<div class="tipo-info-box">${MODELO[id].descricao}</div>` : ''}
      </div>`;
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

      <div class="q-card">
        <div class="q-text">Qual o tamanho da loja?</div>
        <div style="display:flex;gap:10px">
          ${[['P','Pequeno','5–9 func.'],['M','Médio','10–49 func.'],['G','Grande','50+ func.']].map(([val, label, faixa]) => `
            <button class="opt-btn tamanho-btn ${S.tamanhoLoja === val ? 'sel' : ''}"
                    onclick="S.tamanhoLoja='${val}'; render()" style="flex:1;justify-content:center">
              <span style="font-size:18px;font-weight:900">${val}</span>
              <span style="font-size:10px;opacity:.75">${label}</span>
              <span style="font-size:10px;font-weight:700;opacity:.9">${faixa}</span>
            </button>`).join('')}
        </div>
        <div class="info-box" style="margin-top:12px;margin-bottom:0">
          👥 Porte por nº de funcionários: <strong>P</strong> = 5 a 9 &nbsp;·&nbsp; <strong>M</strong> = 10 a 49 &nbsp;·&nbsp; <strong>G</strong> = 50 ou mais.<br>
          💡 O tamanho e o tipo de negócio definem o mix de produtos direcionado que será avaliado.
        </div>
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
  const pesos = modelo().pesos;
  const sc = calcScore();
  const allDone = S.vis.done && S.pe.done && S.mix.done;

  const visProg = S.vis.done ? 1 : ([S.vis.q1, S.vis.q2, S.vis.q3].some(Boolean) ? 0.5 : 0);
  const peProg  = S.pe.done  ? 1 : (S.pe.existe ? 0.5 : 0);
  const mixProg = S.mix.done ? 1 : (S.mix.lines.length ? 0.5 : 0);

  const vis = moduloStatus(S.vis.done, visProg, 1);
  const pe  = moduloStatus(S.pe.done,  peProg,  1);
  const mix = moduloStatus(S.mix.done, mixProg, 1);

  function card(icon, name, peso, valor, done, st, screen) {
    return `
      <div class="module-card ${st.card}" onclick="go('${screen}')">
        <div class="module-icon">${icon}</div>
        <div class="module-info">
          <div class="module-name">${name}</div>
          <div class="module-prog-txt">Peso máximo: ${peso.toFixed(2)} pts${done ? ` &nbsp;·&nbsp; atual: <strong>${valor.toFixed(2)}</strong>` : ''}</div>
          <div class="prog-track"><div class="prog-fill ${st.bar}" style="width:${done ? 100 : (st.card==='andamento'?50:0)}%"></div></div>
        </div>
        <div class="module-status ${st.stCls}">${st.stLbl}</div>
      </div>`;
  }

  return `
    ${header(pdvLine(), 'Módulos de Coleta', 'tipo_sel')}
    <div class="content">
      <div class="info-box" style="margin-bottom:14px">
        🏷️ <strong>${modelo().label}</strong> &nbsp;·&nbsp; ${S.tipoNegocio || ''} &nbsp;·&nbsp; Tam. <strong>${S.tamanhoLoja}</strong><br>
        <span style="font-size:11px;color:#666">A loja começa com <strong>10,00</strong> e perde pontos conforme o que falta.</span>
      </div>
      ${card('👁️', 'Visibilidade',        pesos.visibilidade, sc.vis, S.vis.done, vis, 'vis')}
      ${card('🏪', 'Ponto Extra',          pesos.pontoExtra,   sc.pe,  S.pe.done,  pe,  'pe')}
      ${card('🛒', 'Mix e Preço', pesos.mix,       sc.mix, S.mix.done, mix, 'mix_linhas')}
      ${allDone ? `<div class="info-box green">✅ Todos os módulos concluídos! Finalize a pesquisa.</div>` : ''}
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('tipo_sel')">← Configuração</button>
      <button class="btn-primary" onclick="go('resultado')" ${!allDone ? 'disabled' : ''}>
        📊 Finalizar Pesquisa
      </button>
    </div>`;
}

/* ---- VISIBILIDADE ---- */

function scrVis() {
  const m = modelo().visibilidade;

  function simNao(q, key, foto) {
    const val = S.vis[key];
    const fotoData = key === 'q1' ? S.vis.foto1 : key === 'q2' ? S.vis.foto2 : null;
    const fotoId = `foto-vis-${key}`;
    const fotoHtml = (foto && val === 'sim') ? `
      <div class="foto-upload" style="margin-top:10px">
        <input type="file" accept="image/*" capture="environment" id="${fotoId}" onchange="setFotoVis('${key}', this)">
        <label for="${fotoId}" class="${fotoData ? 'has-foto' : ''}">
          ${fotoData
            ? `<img src="${fotoData}" alt="Foto"><span class="foto-ok">✅ Foto anexada — toque para alterar</span>`
            : `<div class="foto-icon">📷</div><div>Tirar / Anexar Foto</div><div class="foto-req">Obrigatório</div>`}
        </label>
      </div>` : '';
    return `
      <div class="q-card">
        <div class="q-text">${q.txt}</div>
        <button class="opt-btn ${val === 'sim' ? 'sel' : ''}" onclick="setVis('${key}','sim')">✅ Sim</button>
        <button class="opt-btn ${val === 'nao' ? 'sel' : ''}" onclick="setVis('${key}','nao')">❌ Não</button>
        <div class="pen-hint">${q.penalNao > 0 ? `Não responder <strong>Sim</strong> penaliza <strong>${fmt(-q.penalNao)}</strong> pt${q.penalNao === 1 ? '' : 's'}.` : 'Sem penalidade para esta pergunta.'}</div>
        ${fotoHtml}
      </div>`;
  }

  // checklist só quando a pergunta-gate for "Sim" (Q2 no Balcão, Q3 nos demais)
  const gate = m.checklistGate;
  const gNum = gate === 'q2' ? '2.1' : '3.1';
  const temBonusVis = m.checklist.some(it => it.bonus && visPresente(it.id));
  const checklistHtml = S.vis[gate] === 'sim' ? `
    <div class="q-card">
      <div class="q-text">${gNum}. Quais comunicações estão aplicadas e em que quantidade?</div>
      ${m.checklist.map(it => {
        const qty = S.vis.itens[it.id] || 0;
        const fotosArr = S.vis.fotos[it.id] || [];
        const fotosOk = fotosArr.filter(Boolean).length;
        const fotosHtml = qty > 0 ? Array.from({ length: qty }, (_, i) => {
          const data = fotosArr[i];
          const fid = `foto-vis-item-${it.id}-${i}`;
          return `
            <div class="foto-upload" style="margin-top:8px">
              <input type="file" accept="image/*" capture="environment" id="${fid}" onchange="setFotoVisItem('${it.id}', ${i}, this)">
              <label for="${fid}" class="${data ? 'has-foto' : ''}">
                ${data
                  ? `<img src="${data}" alt="Foto ${i+1}"><span class="foto-ok">✅ Foto ${i+1} de ${qty} — toque para alterar</span>`
                  : `<div class="foto-icon">📷</div><div>Foto ${i+1} de ${qty}</div><div class="foto-req">Obrigatório</div>`}
              </label>
            </div>`;
        }).join('') : '';
        return `
          <div class="pe-row ${qty > 0 ? 'active' : ''}">
            <div class="pe-row-top">
              <span class="pe-lbl">${it.label}</span>
              ${it.bonus ? `<span class="pe-peso bonus">🎁 coringa</span>`
                : (it.penal > 0 ? `<span class="pe-peso neg">ausente ${fmt(-it.penal)}</span>` : '')}
            </div>
            <div class="qty-group">
              <button class="qty-btn" onclick="changeVisQty('${it.id}', -1)">−</button>
              <span class="qty-val">${qty}</span>
              <button class="qty-btn" onclick="changeVisQty('${it.id}', 1)">+</button>
            </div>
            ${qty > 0 ? `<div style="font-size:11px;color:${fotosOk >= qty ? '#27AE60' : '#E53935'};margin-top:6px;font-weight:700">📷 ${fotosOk} de ${qty} foto${qty>1?'s':''}</div>` : ''}
            ${fotosHtml}
          </div>`;
      }).join('')}
      <div class="pen-hint ${temBonusVis ? 'ok' : ''}">
        ${temBonusVis
          ? `🎁 <strong>Comunicação Personalizada</strong> presente: supre os materiais faltantes até <strong>${fmt(m.checklist.find(it=>it.bonus).cap)}</strong> pts.`
          : 'Cada comunicação <strong>ausente</strong> (quantidade 0) desconta a penalidade indicada. A <strong>Comunicação Personalizada</strong> é coringa: se presente, cobre os demais.'}
      </div>
    </div>` : '';

  // validação: perguntas respondidas; fotos obrigatórias quando "Sim"
  const foto1Ok = !(m.q1.foto && S.vis.q1 === 'sim') || !!S.vis.foto1;
  const foto2Ok = !(m.q2.foto && S.vis.q2 === 'sim') || !!S.vis.foto2;
  const q3Ok = !m.q3 || !!S.vis.q3;
  const itensFotoOk = S.vis[gate] !== 'sim' || visFotosOk();
  const pode = S.vis.q1 && S.vis.q2 && q3Ok && foto1Ok && foto2Ok && itensFotoOk;

  return `
    ${header(pdvLine(), 'Visibilidade', 'dashboard')}
    <div class="content">
      <div class="info-box orange">👁️ Módulo Visibilidade — peso máximo ${modelo().pesos.visibilidade.toFixed(2)} pts</div>
      ${simNao(m.q1, 'q1', m.q1.foto)}
      ${simNao(m.q2, 'q2', m.q2.foto)}
      ${m.q3 ? simNao(m.q3, 'q3', false) : ''}
      ${checklistHtml}
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
      <button class="btn-primary" onclick="concluirVis()" ${!pode ? 'disabled' : ''}>Concluir Visibilidade ✓</button>
    </div>`;
}

/* ---- PONTO EXTRA ---- */

function scrPE() {
  const m = modelo().pontoExtra;

  const tiposHtml = S.pe.existe === 'sim' ? `
    <div class="q-card">
      <div class="q-text">Qual o tipo e quantidade de pontos extras? (marque os presentes)</div>
      ${m.tipos.map(t => {
        const qty = S.pe.tipos[t.id] || 0;
        const fotosArr = S.pe.fotos[t.id] || [];
        const fotosOk = fotosArr.filter(Boolean).length;
        const fotosHtml = qty > 0 ? Array.from({ length: qty }, (_, i) => {
          const data = fotosArr[i];
          const fid = `foto-pe-${t.id}-${i}`;
          return `
            <div class="foto-upload" style="margin-top:8px">
              <input type="file" accept="image/*" capture="environment" id="${fid}" onchange="setFotoPE('${t.id}', ${i}, this)">
              <label for="${fid}" class="${data ? 'has-foto' : ''}">
                ${data
                  ? `<img src="${data}" alt="Foto ${i+1}"><span class="foto-ok">✅ Foto ${i+1} de ${qty} — toque para alterar</span>`
                  : `<div class="foto-icon">📷</div><div>Foto ${i+1} de ${qty}</div><div class="foto-req">Obrigatório</div>`}
              </label>
            </div>`;
        }).join('') : '';
        return `
          <div class="pe-row ${qty > 0 ? 'active' : ''}">
            <div class="pe-row-top">
              <span class="pe-lbl">${t.label}</span>
              ${t.penal > 0 ? `<span class="pe-peso neg">ausente ${fmt(-t.penal)}</span>` : `<span class="pe-peso">opcional</span>`}
            </div>
            <div class="qty-group">
              <button class="qty-btn" onclick="changePEQty('${t.id}', -1)">−</button>
              <span class="qty-val">${qty}</span>
              <button class="qty-btn" onclick="changePEQty('${t.id}', 1)">+</button>
            </div>
            ${qty > 0 ? `<div style="font-size:11px;color:${fotosOk >= qty ? '#27AE60' : '#E53935'};margin-top:6px;font-weight:700">📷 ${fotosOk} de ${qty} foto${qty>1?'s':''}</div>` : ''}
            ${fotosHtml}
          </div>`;
      }).join('')}
    </div>` : '';

  const pode = S.pe.existe === 'nao' || (S.pe.existe === 'sim' && peFotosOk());

  return `
    ${header(pdvLine(), 'Ponto Extra', 'dashboard')}
    <div class="content">
      <div class="info-box orange">🏪 Módulo Ponto Extra — peso máximo ${modelo().pesos.pontoExtra.toFixed(2)} pts</div>
      <div class="q-card">
        <div class="q-text">Existe algum ponto extra executado no PDV?</div>
        <button class="opt-btn ${S.pe.existe === 'sim' ? 'sel' : ''}" onclick="setPEExiste('sim')">✅ Sim</button>
        <button class="opt-btn ${S.pe.existe === 'nao' ? 'sel' : ''}" onclick="setPEExiste('nao')">❌ Não</button>
        <div class="pen-hint">Responder <strong>Não</strong> penaliza <strong>${fmt(-m.penalNao)}</strong> pts (todo o módulo).</div>
      </div>
      ${tiposHtml}
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
      <button class="btn-primary" onclick="concluirPE()" ${!pode ? 'disabled' : ''}>Concluir Ponto Extra ✓</button>
    </div>`;
}

/* ---- MIX E PREÇO DIRECIONADO ---- */

function scrMixLinhas() {
  const dir = getMixList();
  const linhas = Object.keys(dir);

  if (linhas.length === 0) {
    return `
      ${header(pdvLine(), 'Mix e Preço', 'dashboard')}
      <div class="content">
        <div class="info-box orange">
          ⚠️ Ainda não há lista de mix direcionado cadastrada para
          <strong>${modelo().label} · ${S.tipoNegocio} · Tam. ${S.tamanhoLoja}</strong>.
          O módulo será pontuado com o peso máximo.
        </div>
      </div>
      <div class="bottom-actions">
        <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
        <button class="btn-primary" onclick="concluirMixVazio()">Concluir Mix ✓</button>
      </div>`;
  }

  return `
    ${header(pdvLine(), 'Mix e Preço', 'dashboard')}
    <div class="content">
      <div class="info-box orange">🛒 Peso máximo ${modelo().pesos.mix.toFixed(2)} pts — dividido entre todos os produtos direcionados.</div>
      <div class="q-card">
        <div class="q-text">Quais linhas o PDV trabalha? (abra para avaliar os produtos)</div>
        <div class="check-list">
          ${linhas.map(l => `
            <div class="check-item ${S.mix.lines.includes(l) ? 'chk' : ''}" onclick="toggleMixLine('${escAttr(l)}')">
              <input type="checkbox" ${S.mix.lines.includes(l) ? 'checked' : ''} onclick="event.stopPropagation()">
              <span class="check-lbl">${l} <span style="color:#999;font-weight:400">(${dir[l].length} produtos)</span></span>
            </div>`).join('')}
        </div>
      </div>
      <div class="info-box">
        💡 Produtos de linhas não abertas contam como <strong>não trabalhadas</strong> e descontam pontos.
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="go('dashboard')">← Voltar</button>
      <button class="btn-primary" onclick="iniciarMixDetalhe()" ${S.mix.lines.length === 0 ? 'disabled' : ''}>Avaliar Produtos →</button>
    </div>`;
}

function scrMixDetalhe() {
  const dir = getMixList();
  if (S.mix.lines.length === 0) { go('mix_linhas'); return ''; }
  const idx   = S.mix._idx;
  const linha = S.mix.lines[idx];
  const total = S.mix.lines.length;
  const produtos = dir[linha] || [];

  const pips = S.mix.lines.map((_, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'current' : '';
    return `<div class="linha-pip ${cls}"></div>`;
  }).join('');

  const prodHtml = produtos.map((prod, i) => {
    const p = prod.p;
    const key = prodKey(linha, p);
    const d = S.mix.prod[key] || {};
    const fotoId = `foto-mix-${idx}-${i}`;
    const detalhe = d.trabalha === true ? `
      <div class="mix-sub">
        <div class="mix-sub-q">Ruptura de estoque?</div>
        <div class="mix-mini-group">
          <button class="mini-btn ${d.ruptura === true  ? 'sel-neg' : ''}" onclick="setMixRuptura('${escAttr(key)}', true)">⚠️ Sim</button>
          <button class="mini-btn ${d.ruptura === false ? 'sel-ok'  : ''}" onclick="setMixRuptura('${escAttr(key)}', false)">✅ Não</button>
        </div>
        <input class="form-input mix-preco ${!d.preco ? 'req' : ''}" type="text" inputmode="decimal"
               placeholder="Preço na gôndola (R$) — obrigatório"
               value="${d.preco || ''}" oninput="setMixPreco('${escAttr(key)}', this.value)">
        <div class="foto-upload" style="margin-top:8px">
          <input type="file" accept="image/*" capture="environment" id="${fotoId}" onchange="setFotoMix('${escAttr(key)}', this)">
          <label for="${fotoId}" class="${d.foto ? 'has-foto' : ''}">
            ${d.foto
              ? `<img src="${d.foto}" alt="Foto"><span class="foto-ok">✅ Foto anexada</span>`
              : `<div class="foto-icon">📷</div><div>Foto do produto/preço (opcional)</div>`}
          </label>
        </div>
      </div>` : '';
    return `
      <div class="mix-prod ${d.trabalha === true ? 'active' : d.trabalha === false ? 'off' : ''}">
        <div class="mix-prod-name">${p}${prod.foco ? ' <span class="mix-foco-tag">trimestral</span>' : ''}</div>
        <div class="mix-mini-group">
          <button class="mini-btn ${d.trabalha === true  ? 'sel-ok'  : ''}" onclick="setMixTrabalha('${escAttr(key)}', true)">Trabalha</button>
          <button class="mini-btn ${d.trabalha === false ? 'sel-neg' : ''}" onclick="setMixTrabalha('${escAttr(key)}', false)">Não trabalha</button>
        </div>
        ${detalhe}
      </div>`;
  }).join('');

  const respondidos = produtos.every(prod => {
    const d = S.mix.prod[prodKey(linha, prod.p)];
    if (!d || d.trabalha == null) return false;
    if (d.trabalha === true) {
      if (d.ruptura == null) return false;
      if (!d.preco || !String(d.preco).trim()) return false; // preço obrigatório se trabalha
    }
    return true;
  });

  return `
    ${header(pdvLine(), 'Mix e Preço', '')}
    <div class="content">
      <div class="linha-progress">${pips}</div>
      <div style="text-align:center;font-size:11px;color:#999;margin-bottom:10px">Linha ${idx + 1} de ${total}</div>
      <div class="q-card">
        <div style="font-size:15px;font-weight:800;color:#E87722;margin-bottom:14px">📦 ${linha}</div>
        ${prodHtml}
      </div>
    </div>
    <div class="bottom-actions">
      <button class="btn-ghost"   onclick="prevMixLinha()">← Voltar</button>
      <button id="btn-mix-next" class="btn-primary" onclick="nextMixLinha()" ${!respondidos ? 'disabled' : ''}>
        ${idx === total - 1 ? 'Concluir Mix ✓' : 'Próxima Linha →'}
      </button>
    </div>`;
}

/* ---- RESULTADO ---- */

function scrResultado() {
  const sc = calcScore();
  const cl = classificacao(sc.total);
  const m  = modelo();

  function bdRow(icon, label, val, peso) {
    return `<div class="bd-row">
      <span class="bd-lbl">${icon} ${label} <small style="color:#999">/ ${peso.toFixed(2)}</small></span>
      <span class="bd-val ${val >= peso ? 'pos' : 'neg'}">${val.toFixed(2)}</span>
    </div>`;
  }

  // resumo Visibilidade
  const vm = m.visibilidade;
  const vGate = vm.checklistGate;
  const gateSim = S.vis[vGate] === 'sim';
  const temBonusRes = gateSim && vm.checklist.some(it => it.bonus && visPresente(it.id));
  const presentesVis = gateSim ? vm.checklist.filter(it => visPresente(it.id)) : [];
  const ausentes = (gateSim && !temBonusRes)
    ? vm.checklist.filter(it => it.penal > 0 && !visPresente(it.id))
    : [];
  const visResumo = S.vis.done ? `
    <div class="resumo-section">
      <div class="resumo-title">👁️ Visibilidade</div>
      <div class="resumo-item ${S.vis.q1==='nao'?'neg':'ok'}">${S.vis.q1==='nao'?'❌':'✅'} Comunicação na fachada</div>
      <div class="resumo-item ${S.vis.q2==='nao'?'neg':'ok'}">${S.vis.q2==='nao'?'❌':'✅'} Comunicação no interior</div>
      ${vm.q3 ? `<div class="resumo-item ${S.vis.q3==='nao'?'neg':'ok'}">${S.vis.q3==='nao'?'❌':'✅'} Comunicação no setor Tigre</div>` : ''}
      ${presentesVis.map(it => `<div class="resumo-item ok">✅ ${it.label}<span class="resumo-qty">×${S.vis.itens[it.id]}</span></div>`).join('')}
      ${temBonusRes ? `<div class="resumo-item ok">🎁 Comunicação Personalizada supriu os materiais faltantes</div>` : ''}
      ${ausentes.map(it => `<div class="resumo-item neg">➖ Ausente: ${it.label} (${fmt(-it.penal)})</div>`).join('')}
    </div>` : '';

  // resumo Ponto Extra
  let peResumo = '';
  if (S.pe.done) {
    if (S.pe.existe === 'nao') {
      peResumo = `<div class="resumo-section"><div class="resumo-title">🏪 Ponto Extra</div>
        <div class="resumo-item neg">❌ Sem ponto extra executado (${fmt(-m.pontoExtra.penalNao)})</div></div>`;
    } else {
      const presentes = m.pontoExtra.tipos.filter(t => (S.pe.tipos[t.id]||0) > 0);
      const faltantes = m.pontoExtra.tipos.filter(t => t.penal>0 && !((S.pe.tipos[t.id]||0)>0));
      peResumo = `<div class="resumo-section"><div class="resumo-title">🏪 Ponto Extra – tipos presentes</div>
        ${presentes.length ? presentes.map(t => `<div class="resumo-item ok">✅ ${t.label}<span class="resumo-qty">×${S.pe.tipos[t.id]}</span></div>`).join('') : '<div class="resumo-item neutral">Nenhum tipo marcado</div>'}
        ${faltantes.map(t => `<div class="resumo-item neg">➖ Ausente: ${t.label} (${fmt(-t.penal)})</div>`).join('')}
      </div>`;
    }
  }

  // resumo Mix
  let mixResumo = '';
  if (S.mix.done) {
    const info = sc.mixInfo;
    mixResumo = `<div class="resumo-section"><div class="resumo-title">🛒 Mix e Preço</div>
      ${info.total > 0
        ? `<div class="resumo-item ${info.faltantes ? 'neg' : 'ok'}">${info.faltantes ? '⚠️' : '✅'} ${info.total - info.faltantes} de ${info.total} produtos OK &nbsp;·&nbsp; ${info.faltantes} faltando/ruptura</div>`
        : '<div class="resumo-item neutral">Sem lista direcionada cadastrada</div>'}
    </div>`;
  }

  return `
    ${header(pdvLine(), 'Resultado da Avaliação', 'dashboard')}
    <div class="content">
      <div id="resultado-card">
        <div style="text-align:center;padding:20px 0 8px">
          <div class="score-circle">
            <div class="score-val">${sc.total.toFixed(1)}</div>
            <div class="score-lbl">Score Total</div>
          </div>
          <div class="score-class ${cl.cls}">${cl.label}</div>
        </div>

        <div class="breakdown">
          <div class="bd-title">📊 Detalhamento por módulo</div>
          ${bdRow('👁️', 'Visibilidade',            sc.vis, sc.pesos.visibilidade)}
          ${bdRow('🏪', 'Ponto Extra',              sc.pe,  sc.pesos.pontoExtra)}
          ${bdRow('🛒', 'Mix e Preço',  sc.mix, sc.pesos.mix)}
          <div class="bd-row total-row">
            <span class="bd-lbl">SCORE FINAL <small style="font-weight:400;color:#999">(máx. 10,00)</small></span>
            <span class="bd-val" style="color:#1B3F70">${sc.total.toFixed(2)}</span>
          </div>
        </div>
        ${sc.total >= 10 ? `<div class="info-box orange">🏆 Loja perfeita! Score máximo de 10,00 pontos.</div>` : ''}

        <div class="info-box">
          🏬 Perfil: <strong>${m.label}</strong> &nbsp;|&nbsp; Tamanho: <strong>${S.tamanhoLoja || '–'}</strong><br>
          📋 Negócio: <strong>${S.tipoNegocio || '–'}</strong><br>
          🏪 PDV: <strong>${S.pdv.codigo ? S.pdv.codigo + ' – ' : ''}${S.pdv.nome || '–'}</strong>
        </div>

        ${visResumo}${peResumo}${mixResumo}
      </div>
    </div>
    <div class="bottom-actions" style="flex-direction:column;gap:8px">
      <button id="btn-exportar" class="btn-primary" style="width:100%" onclick="exportarResultado()">📤 Exportar / Compartilhar</button>
      <div style="display:flex;gap:8px;width:100%">
        <button class="btn-ghost"   style="flex:1" onclick="go('dashboard')">← Voltar à Pesquisa</button>
        <button class="btn-primary" style="flex:1" onclick="novaColeta()">📋 Nova Coleta</button>
      </div>
    </div>`;
}

// ===========================
// FOTO HELPERS
// ===========================

function readFile(inputEl, cb) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { cb(e.target.result); render(); };
  reader.readAsDataURL(file);
}

function setFotoVis(key, inputEl) {
  readFile(inputEl, data => { if (key === 'q1') S.vis.foto1 = data; else S.vis.foto2 = data; });
}

function setFotoVisItem(id, idx, inputEl) {
  readFile(inputEl, data => { if (!S.vis.fotos[id]) S.vis.fotos[id] = []; S.vis.fotos[id][idx] = data; });
}

function setFotoPE(id, idx, inputEl) {
  readFile(inputEl, data => { if (!S.pe.fotos[id]) S.pe.fotos[id] = []; S.pe.fotos[id][idx] = data; });
}

function setFotoMix(key, inputEl) {
  readFile(inputEl, data => { if (!S.mix.prod[key]) S.mix.prod[key] = {}; S.mix.prod[key].foto = data; });
}

function peFotosOk() {
  return Object.entries(S.pe.tipos).every(([id, qty]) => {
    if (qty < 1) return true;
    const arr = S.pe.fotos[id] || [];
    return arr.filter(Boolean).length >= qty;
  });
}

// ===========================
// ACTIONS
// ===========================

// escapa para uso dentro de onclick="fn('AQUI')" — atributo HTML (aspas duplas)
// + string JS (aspas simples). Nomes de produto contêm " (polegadas) e ' (pés).
function escAttr(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setTipo(tipo) {
  if (S.tipoPDV !== tipo) {
    S.vis = { q1: null, q2: null, q3: null, itens: {}, fotos: {}, done: false, foto1: null, foto2: null };
    S.pe  = { existe: null, tipos: {}, fotos: {}, done: false };
    S.mix = { lines: [], prod: {}, done: false, _idx: 0 };
  }
  S.tipoPDV = tipo;
  render();
}

function toggleInfoTipo(id) {
  S._infoTipo = S._infoTipo === id ? null : id;
  render();
}

// Visibilidade
function setVis(key, val) {
  S.vis[key] = val;
  if (key === 'q1' && val === 'nao') S.vis.foto1 = null;
  if (key === 'q2' && val === 'nao') S.vis.foto2 = null;
  if (key === modelo().visibilidade.checklistGate && val === 'nao') { S.vis.itens = {}; S.vis.fotos = {}; }
  render();
}
function changeVisQty(id, delta) {
  const cur = S.vis.itens[id] || 0;
  const nxt = Math.max(0, cur + delta);
  if (nxt === 0) { delete S.vis.itens[id]; delete S.vis.fotos[id]; }
  else { S.vis.itens[id] = nxt; if (S.vis.fotos[id]) S.vis.fotos[id] = S.vis.fotos[id].slice(0, nxt); }
  render();
}
function concluirVis() { S.vis.done = true; go('dashboard'); }

// Ponto Extra
function setPEExiste(val) {
  S.pe.existe = val;
  if (val === 'nao') { S.pe.tipos = {}; S.pe.fotos = {}; }
  render();
}
function changePEQty(id, delta) {
  const cur = S.pe.tipos[id] || 0;
  const nxt = Math.max(0, cur + delta);
  if (nxt === 0) { delete S.pe.tipos[id]; delete S.pe.fotos[id]; }
  else { S.pe.tipos[id] = nxt; if (S.pe.fotos[id]) S.pe.fotos[id] = S.pe.fotos[id].slice(0, nxt); }
  render();
}
function concluirPE() { S.pe.done = true; go('dashboard'); }

// Mix
function toggleMixLine(l) {
  const i = S.mix.lines.indexOf(l);
  if (i === -1) S.mix.lines.push(l);
  else S.mix.lines.splice(i, 1);
  render();
}
function iniciarMixDetalhe() {
  // ordena as linhas selecionadas na ordem do mix
  const ordem = Object.keys(getMixList());
  S.mix.lines.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
  S.mix._idx = 0;
  go('mix_detalhe');
}
function setMixTrabalha(key, val) {
  if (!S.mix.prod[key]) S.mix.prod[key] = {};
  S.mix.prod[key].trabalha = val;
  if (!val) { S.mix.prod[key].ruptura = null; S.mix.prod[key].preco = ''; S.mix.prod[key].foto = null; }
  render();
}
function setMixRuptura(key, val) {
  if (!S.mix.prod[key]) S.mix.prod[key] = { trabalha: true };
  S.mix.prod[key].ruptura = val;
  render();
}
function setMixPreco(key, val) {
  if (!S.mix.prod[key]) S.mix.prod[key] = { trabalha: true };
  S.mix.prod[key].preco = val;
  syncMixNext(); // atualiza o botão sem re-render (preserva foco/cursor no input)
}

// recalcula se a linha atual está completa e ativa/desativa o botão "Próxima Linha"
function syncMixNext() {
  const btn = document.getElementById('btn-mix-next');
  if (!btn) return;
  const dir = getMixList();
  const linha = S.mix.lines[S.mix._idx];
  const produtos = dir[linha] || [];
  const ok = produtos.every(prod => {
    const d = S.mix.prod[prodKey(linha, prod.p)];
    if (!d || d.trabalha == null) return false;
    if (d.trabalha === true) {
      if (d.ruptura == null) return false;
      if (!d.preco || !String(d.preco).trim()) return false;
    }
    return true;
  });
  btn.disabled = !ok;
  // atualiza o destaque "obrigatório" dos campos de preço sem re-render
  document.querySelectorAll('.mix-preco').forEach(inp => {
    inp.classList.toggle('req', !inp.value.trim());
  });
}
function prevMixLinha() {
  if (S.mix._idx > 0) { S.mix._idx--; render(); }
  else go('mix_linhas');
}
function nextMixLinha() {
  if (S.mix._idx < S.mix.lines.length - 1) { S.mix._idx++; render(); }
  else { S.mix.done = true; go('dashboard'); }
}
function concluirMixVazio() { S.mix.done = true; go('dashboard'); }

function novaColeta() { S = resetState(); render(); }

async function exportarResultado() {
  const btn = document.getElementById('btn-exportar');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando imagem…'; }
  try {
    const el = document.getElementById('resultado-card');
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#F2F2F2', logging: false, useCORS: true });
    const filename = `pdv-score-${S.pdv.codigo || 'resultado'}.png`;
    if (navigator.share) {
      canvas.toBlob(async blob => {
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          await navigator.share({ files: [file], title: `PDV Score – ${S.pdv.nome || S.pdv.codigo}` });
        } catch { _dlCanvas(canvas, filename); }
      }, 'image/png');
    } else { _dlCanvas(canvas, filename); }
  } catch (e) {
    alert('Não foi possível gerar a imagem.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '📤 Exportar / Compartilhar'; }
  }
}
function _dlCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
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
  vis:         scrVis,
  pe:          scrPE,
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
loadLojas().then(() => { if (S.screen === 'pdv_info') render(); });
loadMix();
