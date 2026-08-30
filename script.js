/**
 * ============================================================
 * CONTROLE DO MOTORISTA — Sistema Profissional de Gestão
 * Arquivo: script.js
 * Descrição: Lógica de negócio, responsividade de hardware,
 *            formatação de data e interação dos botões dos cards.
 *            (O motor do relógio foi isolado em relogio.js)
 * Arquitetura: Vanilla JS — GitHub Pages Ready (zero dependências)
 * ============================================================
 */

'use strict';

/* ============================================================
   MÓDULO 1: DETECÇÃO E CLASSIFICAÇÃO DE DISPOSITIVO
   ============================================================ */

/**
 * @typedef {'smartphone' | 'tablet' | 'desktop'} DeviceType
 */

/**
 * Detecta o tipo de dispositivo combinando touch points,
 * User-Agent e resolução física de tela.
 *
 * @returns {DeviceType}
 */
function detectDeviceType() {
  const width = window.innerWidth;
  const hasTouchAPI = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const ua = navigator.userAgent.toLowerCase();

  const smartphoneUAPattern = /android(?!.*tablet)|iphone|ipod|blackberry|windows phone|mobile/i;
  const tabletUAPattern = /ipad|android(?=.*tablet)|tablet|kindle|playbook|silk/i;

  if (tabletUAPattern.test(ua)) {
    return 'tablet';
  }

  if (smartphoneUAPattern.test(ua)) {
    return 'smartphone';
  }

  if (hasTouchAPI) {
    return width < 768 ? 'smartphone' : 'tablet';
  }

  return 'desktop';
}

/**
 * Injeta a classe correspondente no <body> para adaptação via CSS.
 */
function applyDeviceClass() {
  const deviceType = detectDeviceType();
  const body = document.body;

  body.classList.remove('device-smartphone', 'device-tablet');

  if (deviceType === 'smartphone') {
    body.classList.add('device-smartphone');
    console.info('[Device] Smartphone detectado → classe "device-smartphone" aplicada.');
  } else if (deviceType === 'tablet') {
    body.classList.add('device-tablet');
    console.info('[Device] Tablet detectado → classe "device-tablet" aplicada.');
  } else {
    console.info('[Device] Desktop detectado.');
  }

  return deviceType;
}

/**
 * Monitora redimensionamento de janela (rotação de tela ou janelas flutuantes).
 */
function registerDeviceResizeListener() {
  let debounceTimer = null;

  window.addEventListener('resize', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyDeviceClass();
    }, 250);
  });
}


/* ============================================================
   MÓDULO 2: UTILITÁRIOS, DATA E CONTROLE DE INTERFACE
   ============================================================ */

/**
 * Atualiza o ano no rodapé da página dinamicamente.
 */
function updateFooterYear() {
  const yearElement = document.getElementById('footerYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

/**
 * Atualiza a versão no rodapé da página para manter a consistência em todas as telas.
 */
function updateFooterVersion() {
  const versao = window.VERSAO_SISTEMA || (window.ControleMotorista && window.ControleMotorista.versao) || '2.0.0';
  document.querySelectorAll('.app-footer__version').forEach(el => {
    el.textContent = 'v' + versao;
  });
}

/**
 * Flag global que garante que APENAS o clique explícito no botão INSERIR
 * pode submeter formulários na aplicação.
 */
let submissaoAutorizadaPorBotaoInserir = false;

/**
 * Corrige o comportamento de botões de submit fora do <form> em WebViews de Android e navegadores mais antigos.
 * O atributo form="formId" não é suportado em alguns aparelhos.
 * Garante que a submissão aconteça com autorização estrita apenas pelo botão INSERIR.
 */
function initPolyfillFormSubmit() {
  document.querySelectorAll('.btn-inserir-topo, button[id^="btnInserir"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Previne o comportamento padrão (se houver suporte nativo, evita envio duplo)
      e.preventDefault();
      
      const formId = btn.getAttribute('form') || (btn.closest('form') ? btn.closest('form').id : null);
      const form = formId ? document.getElementById(formId) : document.querySelector('form');
      
      if (form) {
        // Verifica se o formulário é válido (HTML5)
        const isValid = form.reportValidity ? form.reportValidity() : form.checkValidity();
        
        if (isValid) {
          // Autoriza explicitamente a submissão apenas através do botão INSERIR
          submissaoAutorizadaPorBotaoInserir = true;
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          submissaoAutorizadaPorBotaoInserir = false;
        } else if (!form.reportValidity) {
          alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        }
      }
    });
  });
}

/**
 * Bloqueia a submissão de formulários pela tecla ENTER em qualquer dispositivo
 * (Windows, Linux, Android, iOS e outros) e redireciona o ENTER para avançar
 * o foco para o próximo campo editável que não seja linha/campo pré-programado ou readonly.
 */
function initEnterNavigationAndSubmitLock() {
  const forms = document.querySelectorAll('form');

  forms.forEach(form => {
    // 1. Blindagem de submissão do formulário:
    // Garante que o form NUNCA é enviado a não ser pelo clique explícito no botão INSERIR
    form.addEventListener('submit', (e) => {
      if (!submissaoAutorizadaPorBotaoInserir) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn('[Controle do Motorista] Submissão bloqueada: apenas o botão INSERIR pode gravar dados.');
        return false;
      }
    }, true);

    // Função que recupera apenas campos que podem receber digitação do usuário
    function getCamposEditaveis() {
      const elementos = Array.from(form.querySelectorAll('input, select, textarea'));
      return elementos.filter(el => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'reset') return false;
        if (el.disabled || el.readOnly) return false;
        if (el.tabIndex === -1) return false;
        if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        return true;
      });
    }

    // 2. Configura enterkeyhint nos campos para teclados virtuais (Android/iOS)
    function atualizarEnterKeyHints() {
      const editaveis = getCamposEditaveis();
      editaveis.forEach((campo, idx) => {
        if (idx < editaveis.length - 1) {
          campo.setAttribute('enterkeyhint', 'next');
        } else {
          campo.setAttribute('enterkeyhint', 'done');
        }
      });
    }

    atualizarEnterKeyHints();

    // 3. Captura o ENTER em qualquer campo do formulário
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        // Previne SEMPRE a submissão acionada pelo Enter
        e.preventDefault();
        e.stopPropagation();

        const campoAtual = e.target;
        if (!campoAtual || !['INPUT', 'SELECT', 'TEXTAREA'].includes(campoAtual.tagName)) {
          return;
        }

        const editaveis = getCamposEditaveis();
        const indexAtual = editaveis.indexOf(campoAtual);

        if (indexAtual !== -1 && indexAtual < editaveis.length - 1) {
          const proximoCampo = editaveis[indexAtual + 1];
          proximoCampo.focus();
          if (typeof proximoCampo.select === 'function' && proximoCampo.type !== 'date') {
            proximoCampo.select();
          }
          if (typeof proximoCampo.scrollIntoView === 'function') {
            proximoCampo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          // No último campo editável: apenas remove o foco para ocultar o teclado no mobile
          // e não submete, preservando que apenas o botão INSERIR insere as informações
          campoAtual.blur();
        }
      }
    });
  });
}

/**
 * Formata e exibe a data atual por extenso:
 * Exemplo: "terça-feira, 25 de agosto de 2026"
 */
function updateCurrentDate() {
  const dateEl = document.getElementById('dataAtual');
  if (!dateEl) return;

  const agora = new Date();
  const opcoes = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dataFormatada = agora.toLocaleDateString('pt-BR', opcoes);

  // Capitaliza a primeira letra (ex: "Terça-feira, 25 de agosto de 2026")
  dateEl.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}

/**
 * Gerencia a seleção dos botões dentro do card e o botão Voltar.
 * Quando um botão é clicado, seu nome é destacado acima do card junto ao botão Voltar.
 */
function initCardButtonListeners() {
  const buttons = document.querySelectorAll('.btn-card-action');
  const badgeContainer = document.getElementById('selectedBadgeContainer');
  const badgeText = document.getElementById('selectedBadge');
  const btnVoltar = document.getElementById('btnVoltarTopo');

  if (!buttons.length || !badgeContainer || !badgeText) return;

  // Ao clicar em uma opção do card
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const nome = btn.getAttribute('data-nome') || btn.textContent.trim();

      // Atualiza o texto do badge destacado
      badgeText.textContent = nome;
      badgeContainer.style.display = 'flex';
      badgeContainer.classList.add('is-active');

      // Alterna classe ativa nos botões
      buttons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  // Ao clicar no botão Voltar (topo)
  if (btnVoltar) {
    btnVoltar.addEventListener('click', () => {
      badgeContainer.style.display = 'none';
      badgeContainer.classList.remove('is-active');
      buttons.forEach(b => b.classList.remove('is-active'));
    });
  }
}

/**
 * Formata números digitados para o padrão de data DD/MM/AAAA (ex: 25082026 -> 25/08/2026)
 */
function formatarData(valor) {
  if (!valor) return '';
  const limpo = valor.toString().replace(/\D/g, '');

  if (limpo.length === 8) {
    return `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4, 8)}`;
  } else if (limpo.length === 6) {
    return `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/20${limpo.slice(4, 6)}`;
  } else if (limpo.length >= 4) {
    return `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4)}`;
  } else if (limpo.length >= 2) {
    return `${limpo.slice(0, 2)}/${limpo.slice(2)}`;
  }

  return valor;
}

/**
 * Formata números digitados para o padrão de horário HH:MM (ex: 1420 -> 14:20)
 */
function formatarHorario(valor) {
  if (!valor) return '';
  const limpo = valor.toString().replace(/\D/g, '');

  if (limpo.length === 4) {
    return `${limpo.slice(0, 2)}:${limpo.slice(2, 4)}`;
  } else if (limpo.length === 3) {
    return `0${limpo.slice(0, 1)}:${limpo.slice(1, 3)}`;
  } else if (limpo.length === 1 || limpo.length === 2) {
    return `${limpo.padStart(2, '0')}:00`;
  }
  
  if (valor.includes(':')) {
    const partes = valor.split(':');
    const hh = (partes[0] || '00').padStart(2, '0').slice(0, 2);
    const mm = (partes[1] || '00').padEnd(2, '0').slice(0, 2);
    return `${hh}:${mm}`;
  }

  return valor;
}

/**
 * Gerencia a inserção e exibição das escalas em escala.html
 */
function initEscalaModule() {
  const form = document.getElementById('formInserirEscala');
  const container = document.getElementById('listaEscalaContainer');
  const dataInput = document.getElementById('inputData');
  const horaInput = document.getElementById('inputHorario');

  if (!form || !container) return;

  const STORAGE_KEY = 'controle_motorista_escala';

  // Máscara automática em tempo real para o campo de data (ex: 25082026 -> 25/08/2026)
  if (dataInput) {
    dataInput.addEventListener('input', () => {
      let val = dataInput.value.replace(/\D/g, '');
      if (val.length > 8) val = val.slice(0, 8);
      if (val.length >= 5) {
        dataInput.value = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
      } else if (val.length >= 3) {
        dataInput.value = `${val.slice(0, 2)}/${val.slice(2)}`;
      } else {
        dataInput.value = val;
      }
    });

    dataInput.addEventListener('blur', () => {
      if (dataInput.value.trim()) {
        dataInput.value = formatarData(dataInput.value);
      }
    });
  }

  // Máscara automática em tempo real para o campo de horário (ex: 1420 -> 14:20)
  if (horaInput) {
    horaInput.addEventListener('input', () => {
      let val = horaInput.value.replace(/\D/g, '');
      if (val.length > 4) val = val.slice(0, 4);
      if (val.length >= 3) {
        horaInput.value = `${val.slice(0, 2)}:${val.slice(2)}`;
      } else {
        horaInput.value = val;
      }
    });

    horaInput.addEventListener('blur', () => {
      if (horaInput.value.trim()) {
        horaInput.value = formatarHorario(horaInput.value);
      }
    });
  }

  function carregarEscalas() {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      return dados ? JSON.parse(dados) : [];
    } catch {
      return [];
    }
  }

  function renderizarEscalas() {
    const lista = carregarEscalas();
    container.innerHTML = '';

    if (lista.length === 0) {
      container.innerHTML = '<p style="color: #666666; font-size: 0.9rem; text-align: center; padding: 20px 10px;">Nenhuma escala cadastrada. Preencha os campos acima e clique em Inserir.</p>';
      return;
    }

    lista.forEach((item, index) => {
      const cardItem = document.createElement('div');
      cardItem.className = 'item-escala-card';
      const dataFormatada = item.data ? formatarData(item.data) : '--/--/----';
      const horaFormatada = formatarHorario(item.horario);
      const linhaNum = item.linhaNumero || '--';
      const linhaNm = item.linhaNome || '--';
      cardItem.innerHTML = `
        <div class="item-escala-row item-escala-row--top">
          <span class="dado-escala col-data">${dataFormatada}</span>
          <span class="dado-escala col-linha-num">${linhaNum}</span>
          <span class="dado-escala col-linha-nome">${linhaNm}</span>
          <button type="button" class="btn-excluir-item" data-index="${index}" title="Excluir">✕</button>
        </div>
        <div class="item-escala-row item-escala-row--bottom">
          <span class="dado-escala col-hora">${horaFormatada}</span>
          <span class="dado-escala col-local">${item.localSaida}</span>
          <span class="dado-escala col-mat">${item.matricula}</span>
          <span class="dado-escala col-motorista">${item.motorista}</span>
        </div>
      `;
      container.appendChild(cardItem);
    });

    container.querySelectorAll('.btn-excluir-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const listaAtual = carregarEscalas();
        listaAtual.splice(idx, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(listaAtual));
        renderizarEscalas();
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const linhaNumInput = document.getElementById('inputLinhaNumero');
    const linhaNomeInput = document.getElementById('inputLinhaNome');
    const localInput = document.getElementById('inputLocalSaida');
    const matInput = document.getElementById('inputMatricula');
    const motoristaInput = document.getElementById('inputMotorista');

    const novaEscala = {
      data: dataInput ? formatarData(dataInput.value.trim()) : '',
      linhaNumero: linhaNumInput ? linhaNumInput.value.trim() : '',
      linhaNome: linhaNomeInput ? linhaNomeInput.value.trim() : '',
      horario: formatarHorario(horaInput.value.trim()),
      localSaida: localInput.value.trim(),
      matricula: matInput.value.trim(),
      motorista: motoristaInput.value.trim()
    };

    const listaAtual = carregarEscalas();
    listaAtual.unshift(novaEscala);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listaAtual));

    if (dataInput) dataInput.value = '';
    if (linhaNumInput) linhaNumInput.value = '';
    if (linhaNomeInput) linhaNomeInput.value = '';
    horaInput.value = '';
    localInput.value = '';
    matInput.value = '';
    motoristaInput.value = '';

    renderizarEscalas();
  });

  renderizarEscalas();
}


/* ============================================================
   MÓDULO 4: CADASTRO DE LINHAS (linhas.html)
   ============================================================ */

const LINHAS_STORAGE_KEY = 'controle_motorista_linhas';

/**
 * Carrega as linhas cadastradas do localStorage.
 * @returns {Array<{numero: string, nome: string}>}
 */
function carregarLinhas() {
  try {
    const dados = localStorage.getItem(LINHAS_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
}

/**
 * Busca os dados da linha pelo número (case-insensitive).
 * @param {string} numero
 * @returns {{nome: string, localSaida: string} | null}
 */
function buscarDadosLinha(numero) {
  if (!numero) return null;
  const linhas = carregarLinhas();
  const encontrada = linhas.find(l => l.numero.toUpperCase() === numero.toUpperCase());
  return encontrada || null;
}

/**
 * Gerencia o cadastro e exibição de linhas em linhas.html.
 */
function initLinhasModule() {
  const form = document.getElementById('formInserirLinha');
  const container = document.getElementById('listaLinhasContainer');
  const numInput = document.getElementById('inputLinhaNumCadastro');
  const nomeInput = document.getElementById('inputLinhaNomeCadastro');
  const localInput = document.getElementById('inputLinhaLocalCadastro');

  if (!form || !container) return;

  // Força caixa alta no campo número da linha
  if (numInput) {
    numInput.addEventListener('input', () => {
      numInput.value = numInput.value.toUpperCase();
    });
  }

  function renderizarLinhas() {
    const lista = carregarLinhas();
    container.innerHTML = '';

    if (lista.length === 0) {
      container.innerHTML = '<p style="color: #666666; font-size: 0.9rem; text-align: center; padding: 20px 10px;">Nenhuma linha cadastrada. Preencha os campos acima e clique em Inserir.</p>';
      return;
    }

    lista.forEach((item, index) => {
      const cardItem = document.createElement('div');
      cardItem.className = 'item-linha-card';
      cardItem.innerHTML = `
        <span class="dado-escala col-linha-num-dado">${item.numero}</span>
        <span class="dado-escala col-linha-nome-dado">${item.nome}</span>
        <span class="dado-escala col-linha-local-dado">${item.localSaida || '--'}</span>
        <button type="button" class="btn-excluir-item" data-index="${index}" title="Excluir">✕</button>
      `;
      container.appendChild(cardItem);
    });

    container.querySelectorAll('.btn-excluir-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const listaAtual = carregarLinhas();
        listaAtual.splice(idx, 1);
        localStorage.setItem(LINHAS_STORAGE_KEY, JSON.stringify(listaAtual));
        renderizarLinhas();
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const novaLinha = {
      numero: numInput.value.trim().toUpperCase(),
      nome: nomeInput.value.trim(),
      localSaida: localInput ? localInput.value.trim() : ''
    };

    if (!novaLinha.numero || !novaLinha.nome) return;

    const listaAtual = carregarLinhas();

    // Verifica se já existe — atualiza os dados se sim
    const existente = listaAtual.findIndex(l => l.numero === novaLinha.numero);
    if (existente >= 0) {
      listaAtual[existente].nome = novaLinha.nome;
      listaAtual[existente].localSaida = novaLinha.localSaida;
    } else {
      listaAtual.unshift(novaLinha);
    }

    localStorage.setItem(LINHAS_STORAGE_KEY, JSON.stringify(listaAtual));

    numInput.value = '';
    nomeInput.value = '';
    if (localInput) localInput.value = '';

    renderizarLinhas();
  });

  renderizarLinhas();
}


/* ============================================================
   MÓDULO 5: AUTO-PREENCHIMENTO DE LINHA (qualquer página)
   Quando há um campo #inputLinhaNumero e #inputLinhaNome,
   preenche o nome automaticamente ao digitar o número.
   ============================================================ */

function initLinhaAutoLookup() {
  const numInput = document.getElementById('inputLinhaNumero');
  const nomeInput = document.getElementById('inputLinhaNome');
  const localInput = document.getElementById('inputLocalSaida');

  if (!numInput || !nomeInput) return;

  function preencherDados() {
    const dados = buscarDadosLinha(numInput.value.trim());
    nomeInput.value = dados ? dados.nome : '';
    if (localInput) {
      if (dados && dados.localSaida) {
        localInput.value = dados.localSaida;
        localInput.readOnly = true;
      } else {
        localInput.value = '';
        localInput.readOnly = false;
      }
    }
  }

  // Força caixa alta no campo número da linha
  numInput.addEventListener('input', () => {
    numInput.value = numInput.value.toUpperCase();
    preencherDados();
  });

  // Também preenche ao sair do campo (blur)
  numInput.addEventListener('blur', preencherDados);
}

/* ============================================================
   MÓDULO 6: CADASTRO DE MOTORISTAS (motorista.html)
   ============================================================ */

const MOTORISTAS_STORAGE_KEY = 'controle_motorista_motoristas';

/**
 * Carrega os motoristas cadastrados do localStorage.
 * @returns {Array<{matricula: string, nome: string}>}
 */
function carregarMotoristas() {
  try {
    const dados = localStorage.getItem(MOTORISTAS_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
}

/**
 * Busca o nome do motorista pela matrícula.
 * @param {string} matricula
 * @returns {string} Nome do motorista ou ''
 */
function buscarNomeMotorista(matricula) {
  if (!matricula) return '';
  const lista = carregarMotoristas();
  const encontrado = lista.find(m => m.matricula === matricula.trim());
  return encontrado ? encontrado.nome : '';
}

/**
 * Gerencia o cadastro e exibição de motoristas em motorista.html.
 */
function initMotoristasModule() {
  const form = document.getElementById('formInserirMotorista');
  const container = document.getElementById('listaMotoristasContainer');
  const matInput = document.getElementById('inputMotMatricula');
  const nomeInput = document.getElementById('inputMotNome');

  if (!form || !container) return;

  function renderizarMotoristas() {
    const lista = carregarMotoristas();
    container.innerHTML = '';

    if (lista.length === 0) {
      container.innerHTML = '<p style="color: #666666; font-size: 0.9rem; text-align: center; padding: 20px 10px;">Nenhum motorista cadastrado. Preencha os campos acima e clique em Inserir.</p>';
      return;
    }

    lista.forEach((item, index) => {
      const cardItem = document.createElement('div');
      cardItem.className = 'item-motorista-card';
      cardItem.innerHTML = `
        <span class="dado-escala col-mot-matricula-dado">${item.matricula}</span>
        <span class="dado-escala col-mot-nome-dado">${item.nome}</span>
        <button type="button" class="btn-excluir-item" data-index="${index}" title="Excluir">✕</button>
      `;
      container.appendChild(cardItem);
    });

    container.querySelectorAll('.btn-excluir-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const listaAtual = carregarMotoristas();
        listaAtual.splice(idx, 1);
        localStorage.setItem(MOTORISTAS_STORAGE_KEY, JSON.stringify(listaAtual));
        renderizarMotoristas();
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const novoMotorista = {
      matricula: matInput.value.trim(),
      nome: nomeInput.value.trim()
    };

    if (!novoMotorista.matricula || !novoMotorista.nome) return;

    const listaAtual = carregarMotoristas();

    // Verifica se já existe — atualiza o nome se sim
    const existente = listaAtual.findIndex(m => m.matricula === novoMotorista.matricula);
    if (existente >= 0) {
      listaAtual[existente].nome = novoMotorista.nome;
    } else {
      listaAtual.unshift(novoMotorista);
    }

    localStorage.setItem(MOTORISTAS_STORAGE_KEY, JSON.stringify(listaAtual));

    matInput.value = '';
    nomeInput.value = '';

    renderizarMotoristas();
  });

  renderizarMotoristas();
}


/* ============================================================
   MÓDULO 7: AUTO-PREENCHIMENTO DE MOTORISTA (qualquer página)
   Quando há um campo #inputMatricula e #inputMotorista,
   preenche o nome automaticamente ao digitar a matrícula.
   ============================================================ */

function initMotoristaAutoLookup() {
  const matInput = document.getElementById('inputMatricula');
  const motInput = document.getElementById('inputMotorista');

  if (!matInput || !motInput) return;

  function preencherMotorista() {
    const nome = buscarNomeMotorista(matInput.value.trim());
    if (nome) {
      motInput.value = nome;
      motInput.readOnly = true;
    } else {
      motInput.value = '';
      motInput.readOnly = false;
    }
  }

  matInput.addEventListener('input', preencherMotorista);
  matInput.addEventListener('blur', preencherMotorista);
}

/* ============================================================
   MÓDULO 7b: CADASTRO DE CARROS (carros.html)
   ============================================================ */

const CARROS_STORAGE_KEY = 'controle_motorista_carros';

/**
 * Carrega os carros cadastrados do localStorage.
 * @returns {Array<{sigla: string, numero: string, placa: string}>}
 */
function carregarCarros() {
  try {
    const dados = localStorage.getItem(CARROS_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
}

/**
 * Busca dados do carro pelo número ou placa.
 * @param {string} termo
 * @returns {{sigla: string, numero: string, placa: string} | null}
 */
function buscarDadosCarro(termo) {
  if (!termo) return null;
  const lista = carregarCarros();
  const termoNorm = termo.trim().toUpperCase();
  const termoLimpo = termoNorm.replace(/\D/g, '');
  const encontrado = lista.find(c => {
    if (!c) return false;
    const numC = (c.numero || '').toUpperCase().trim();
    const placaC = (c.placa || '').toUpperCase().trim();
    const numLimpo = numC.replace(/\D/g, '');
    return (
      numC === termoNorm ||
      (termoLimpo && numLimpo === termoLimpo) ||
      (placaC && placaC.replace(/\W/g, '') === termoNorm.replace(/\W/g, ''))
    );
  });
  return encontrado || null;
}

/**
 * Gerencia o cadastro e exibição de carros em carros.html.
 */
function initCarrosModule() {
  const form = document.getElementById('formInserirCarro');
  const container = document.getElementById('listaCarrosContainer');
  const siglaInput = document.getElementById('inputCarroSigla');
  const numInput = document.getElementById('inputCarroNumero');
  const placaInput = document.getElementById('inputCarroPlaca');

  if (!form || !container) return;

  // Força caixa alta em Sigla, N° Carro e Placa
  if (siglaInput) {
    siglaInput.addEventListener('input', () => {
      siglaInput.value = siglaInput.value.toUpperCase();
    });
  }

  if (numInput) {
    numInput.addEventListener('input', () => {
      numInput.value = numInput.value.toUpperCase();
    });
  }

  if (placaInput) {
    placaInput.addEventListener('input', () => {
      placaInput.value = placaInput.value.toUpperCase();
    });
  }

  function ordenarCarros(lista) {
    function extrairNumero(str) {
      if (!str) return 0;
      const digits = String(str).replace(/\D/g, '');
      return digits ? parseInt(digits, 10) : 0;
    }

    return lista.slice().sort((a, b) => {
      // 1. Ordem alfabética nas siglas (ex: DC antes de RJ)
      const siglaA = (a.sigla || '').trim().toUpperCase();
      const siglaB = (b.sigla || '').trim().toUpperCase();
      const siglaComp = siglaA.localeCompare(siglaB, 'pt-BR');
      if (siglaComp !== 0) return siglaComp;

      // 2. Ordem crescente no número do carro (do menor para o maior)
      const numA = extrairNumero(a.numero);
      const numB = extrairNumero(b.numero);
      if (numA !== numB) return numA - numB;

      return String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR', { numeric: true });
    });
  }

  function renderizarCarros() {
    const lista = ordenarCarros(carregarCarros());
    container.innerHTML = '';

    if (lista.length === 0) {
      container.innerHTML = '<p style="color: #666666; font-size: 0.9rem; text-align: center; padding: 20px 10px;">Nenhum carro cadastrado. Preencha os campos acima e clique em Inserir.</p>';
      return;
    }

    lista.forEach((item) => {
      const cardItem = document.createElement('div');
      cardItem.className = 'item-carro-card';
      cardItem.innerHTML = `
        <span class="dado-escala col-carro-sigla-dado">${item.sigla.toUpperCase()}</span>
        <span class="dado-escala col-carro-numero-dado">${item.numero.toUpperCase()}</span>
        <span class="dado-escala col-carro-placa-dado">${item.placa.toUpperCase()}</span>
        <button type="button" class="btn-excluir-item" data-sigla="${item.sigla}" data-numero="${item.numero}" title="Excluir">✕</button>
      `;
      container.appendChild(cardItem);
    });

    container.querySelectorAll('.btn-excluir-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sigla = e.currentTarget.getAttribute('data-sigla');
        const numero = e.currentTarget.getAttribute('data-numero');
        const listaAtual = carregarCarros();
        const idx = listaAtual.findIndex(c => c.sigla === sigla && c.numero === numero);
        if (idx >= 0) {
          listaAtual.splice(idx, 1);
          localStorage.setItem(CARROS_STORAGE_KEY, JSON.stringify(ordenarCarros(listaAtual)));
          renderizarCarros();
        }
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const novoCarro = {
      sigla: siglaInput ? siglaInput.value.trim().toUpperCase() : '',
      numero: numInput ? numInput.value.trim().toUpperCase() : '',
      placa: placaInput ? placaInput.value.trim().toUpperCase() : ''
    };

    if (!novoCarro.sigla || !novoCarro.numero || !novoCarro.placa) return;

    const listaAtual = carregarCarros();

    // Verifica se já existe por sigla e número — atualiza se sim
    const existente = listaAtual.findIndex(c => c.sigla === novoCarro.sigla && c.numero === novoCarro.numero);
    if (existente >= 0) {
      listaAtual[existente] = novoCarro;
    } else {
      listaAtual.push(novoCarro);
    }

    const listaOrdenada = ordenarCarros(listaAtual);
    localStorage.setItem(CARROS_STORAGE_KEY, JSON.stringify(listaOrdenada));
    localStorage.setItem('controle_motorista_ultimo_carro', novoCarro.numero);

    if (siglaInput) siglaInput.value = '';
    if (numInput) numInput.value = '';
    if (placaInput) placaInput.value = '';

    renderizarCarros();
  });

  renderizarCarros();
}


/* ============================================================
   MÓDULO 7b: CADASTRO E CONTROLE DE AVARIAS INTERATIVO (avarias.html)
   Tabela Oficial dos 144 Códigos de Avarias por Clique no Ônibus
   ============================================================ */

const AVARIAS_STORAGE_KEY = 'controle_motorista_avarias';

const TABELA_AVARIAS_144 = [
  { cod: 1, nome: 'PONTEIRA DIANT. "E" QUEBRADA', lado: 'E', sec: 'ponteira_diant', tipo: 'quebrada' },
  { cod: 2, nome: 'PONTEIRA DIANT. "D" QUEBRADA', lado: 'D', sec: 'ponteira_diant', tipo: 'quebrada' },
  { cod: 3, nome: 'PONTEIRA DIANT. "E" RASPADA', lado: 'E', sec: 'ponteira_diant', tipo: 'raspada' },
  { cod: 4, nome: 'PONTEIRA DIANT. "D" RASPADA', lado: 'D', sec: 'ponteira_diant', tipo: 'raspada' },
  { cod: 5, nome: 'PONTEIRA TRAS. "E" QUEBRADA', lado: 'E', sec: 'ponteira_tras', tipo: 'quebrada' },
  { cod: 6, nome: 'PONTEIRA TRAS. "D" QUEBRADA', lado: 'D', sec: 'ponteira_tras', tipo: 'quebrada' },
  { cod: 7, nome: 'PONTEIRA TRAS. "E" RASPADA', lado: 'E', sec: 'ponteira_tras', tipo: 'raspada' },
  { cod: 8, nome: 'PONTEIRA TRAS. "D" RASPADA', lado: 'D', sec: 'ponteira_tras', tipo: 'raspada' },
  { cod: 9, nome: 'COLUNA DIANT. "E" QUEBRADA', lado: 'E', sec: 'coluna_diant', tipo: 'quebrada' },
  { cod: 10, nome: 'COLUNA DIANT. "D" QUEBRADA', lado: 'D', sec: 'coluna_diant', tipo: 'quebrada' },
  { cod: 11, nome: 'COLUNA DIANT. "E" RASPADA', lado: 'E', sec: 'coluna_diant', tipo: 'raspada' },
  { cod: 12, nome: 'COLUNA DIANT. "D" RASPADA', lado: 'D', sec: 'coluna_diant', tipo: 'raspada' },
  { cod: 13, nome: 'COLUNA SUP. DIAN. "E" QUEBRADA', lado: 'E', sec: 'coluna_diant', tipo: 'quebrada' },
  { cod: 14, nome: 'COLUNA SUP. DIAN. "D" QUEBRADA', lado: 'D', sec: 'coluna_diant', tipo: 'quebrada' },
  { cod: 15, nome: 'COLUNA SUP. DIAN. "E" RASPADA', lado: 'E', sec: 'coluna_diant', tipo: 'raspada' },
  { cod: 16, nome: 'COLUNA SUP. DIAN. "D" RASPADA', lado: 'D', sec: 'coluna_diant', tipo: 'raspada' },
  { cod: 17, nome: 'COLUNA TRAS. "E" QUEBRADA', lado: 'E', sec: 'coluna_tras', tipo: 'quebrada' },
  { cod: 18, nome: 'COLUNA TRAS. "D" QUEBRADA', lado: 'D', sec: 'coluna_tras', tipo: 'quebrada' },
  { cod: 19, nome: 'COLUNA TRAS. "E" RASPADA', lado: 'E', sec: 'coluna_tras', tipo: 'raspada' },
  { cod: 20, nome: 'COLUNA TRAS. "D" RASPADA', lado: 'D', sec: 'coluna_tras', tipo: 'raspada' },
  { cod: 21, nome: 'COLUNA SUP. TRAS. "E" QUEBRADA', lado: 'E', sec: 'coluna_tras', tipo: 'quebrada' },
  { cod: 22, nome: 'COLUNA SUP. TRAS. "D" QUEBRADA', lado: 'D', sec: 'coluna_tras', tipo: 'quebrada' },
  { cod: 23, nome: 'COLUNA SUP. TRAS. "E" RASPADA', lado: 'E', sec: 'coluna_tras', tipo: 'raspada' },
  { cod: 24, nome: 'COLUNA SUP. TRAS. "D" RASPADA', lado: 'D', sec: 'coluna_tras', tipo: 'raspada' },
  { cod: 25, nome: 'PARABRISA "E" TRINCADO', lado: 'E', sec: 'parabrisa', tipo: 'trincado' },
  { cod: 26, nome: 'PARABRISA "D" TRINCADO', lado: 'D', sec: 'parabrisa', tipo: 'trincado' },
  { cod: 27, nome: '1ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_1', tipo: 'amassada' },
  { cod: 28, nome: '1ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_1', tipo: 'amassada' },
  { cod: 29, nome: '1ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_1', tipo: 'raspada' },
  { cod: 30, nome: '1ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_1', tipo: 'raspada' },
  { cod: 31, nome: '1ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_1', tipo: 'amassada' },
  { cod: 32, nome: '1ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_1', tipo: 'amassada' },
  { cod: 33, nome: '1ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_1', tipo: 'raspada' },
  { cod: 34, nome: '1ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_1', tipo: 'raspada' },
  { cod: 35, nome: '2ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_2', tipo: 'amassada' },
  { cod: 36, nome: '2ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_2', tipo: 'amassada' },
  { cod: 37, nome: '2ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_2', tipo: 'raspada' },
  { cod: 38, nome: '2ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_2', tipo: 'raspada' },
  { cod: 39, nome: '2ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_2', tipo: 'amassada' },
  { cod: 40, nome: '2ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_2', tipo: 'amassada' },
  { cod: 41, nome: '2ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_2', tipo: 'raspada' },
  { cod: 42, nome: '2ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_2', tipo: 'raspada' },
  { cod: 43, nome: '3ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_3', tipo: 'amassada' },
  { cod: 44, nome: '3ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_3', tipo: 'amassada' },
  { cod: 45, nome: '3ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_3', tipo: 'raspada' },
  { cod: 46, nome: '3ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_3', tipo: 'raspada' },
  { cod: 47, nome: '3ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_3', tipo: 'amassada' },
  { cod: 48, nome: '3ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_3', tipo: 'amassada' },
  { cod: 49, nome: '3ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_3', tipo: 'raspada' },
  { cod: 50, nome: '3ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_3', tipo: 'raspada' },
  { cod: 51, nome: '4ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_4', tipo: 'amassada' },
  { cod: 52, nome: '4ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_4', tipo: 'amassada' },
  { cod: 53, nome: '4ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_4', tipo: 'raspada' },
  { cod: 54, nome: '4ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_4', tipo: 'raspada' },
  { cod: 55, nome: '4ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_4', tipo: 'amassada' },
  { cod: 56, nome: '4ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_4', tipo: 'amassada' },
  { cod: 57, nome: '4ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_4', tipo: 'raspada' },
  { cod: 58, nome: '4ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_4', tipo: 'raspada' },
  { cod: 59, nome: '5ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_5', tipo: 'amassada' },
  { cod: 60, nome: '5ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_5', tipo: 'amassada' },
  { cod: 61, nome: '5ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_5', tipo: 'raspada' },
  { cod: 62, nome: '5ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_5', tipo: 'raspada' },
  { cod: 63, nome: '5ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_5', tipo: 'amassada' },
  { cod: 64, nome: '5ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_5', tipo: 'amassada' },
  { cod: 65, nome: '5ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_5', tipo: 'raspada' },
  { cod: 66, nome: '5ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_5', tipo: 'raspada' },
  { cod: 67, nome: '6ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_6', tipo: 'amassada' },
  { cod: 68, nome: '6ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_6', tipo: 'amassada' },
  { cod: 69, nome: '6ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_6', tipo: 'raspada' },
  { cod: 70, nome: '6ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_6', tipo: 'raspada' },
  { cod: 71, nome: '6ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_6', tipo: 'raspada' },
  { cod: 72, nome: '6ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_6', tipo: 'amassada' },
  { cod: 73, nome: '6ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_6', tipo: 'amassada' },
  { cod: 74, nome: '6ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_6', tipo: 'raspada' },
  { cod: 75, nome: '7ª CHAPA "E" AMASSADA', lado: 'E', sec: 'chapa_7', tipo: 'amassada' },
  { cod: 76, nome: '7ª CHAPA "D" AMASSADA', lado: 'D', sec: 'chapa_7', tipo: 'amassada' },
  { cod: 77, nome: '7ª CHAPA "E" RASPADA', lado: 'E', sec: 'chapa_7', tipo: 'raspada' },
  { cod: 78, nome: '7ª CHAPA "D" RASPADA', lado: 'D', sec: 'chapa_7', tipo: 'raspada' },
  { cod: 79, nome: '7ª SAIA "E" RASPADA', lado: 'E', sec: 'saia_7', tipo: 'raspada' },
  { cod: 80, nome: '7ª SAIA "D" AMASSADA', lado: 'D', sec: 'saia_7', tipo: 'amassada' },
  { cod: 81, nome: '7ª SAIA "E" AMASSADA', lado: 'E', sec: 'saia_7', tipo: 'amassada' },
  { cod: 82, nome: '7ª SAIA "D" RASPADA', lado: 'D', sec: 'saia_7', tipo: 'raspada' },
  { cod: 83, nome: 'LANTERNA "E" AVARIADA', lado: 'E', sec: 'lanterna', tipo: 'avariada' },
  { cod: 84, nome: 'LANTERNA "D" AVARIADA', lado: 'D', sec: 'lanterna', tipo: 'avariada' },
  { cod: 85, nome: 'CAPA DA LANTERNA "E" AVARIADA', lado: 'E', sec: 'lanterna', tipo: 'avariada' },
  { cod: 86, nome: 'CAPA DA LANTERNA "D" AVARIADA', lado: 'D', sec: 'lanterna', tipo: 'avariada' },
  { cod: 87, nome: 'LENTE DO FAROL "E" AVARIADO', lado: 'E', sec: 'farol', tipo: 'avariado' },
  { cod: 88, nome: 'LENTE DO FAROL "D" AVARIADO', lado: 'D', sec: 'farol', tipo: 'avariado' },
  { cod: 89, nome: 'CAPA DO FAROL "E" AVARIADO', lado: 'E', sec: 'farol', tipo: 'avariado' },
  { cod: 90, nome: 'CAPA DO FAROL "D" AVARIADO', lado: 'D', sec: 'farol', tipo: 'avariado' },
  { cod: 91, nome: 'FAROL "E" AVARIADO', lado: 'E', sec: 'farol', tipo: 'avariado' },
  { cod: 92, nome: 'FAROL "D" AVARIADO', lado: 'D', sec: 'farol', tipo: 'avariado' },
  { cod: 93, nome: 'PNEU DIANT. "E" CORTADO', lado: 'E', sec: 'pneu_diant', tipo: 'cortado' },
  { cod: 94, nome: 'PNEU DIANT. "D" CORTADO', lado: 'D', sec: 'pneu_diant', tipo: 'cortado' },
  { cod: 95, nome: 'PNEU DIANT. "E" RASPADO', lado: 'E', sec: 'pneu_diant', tipo: 'raspado' },
  { cod: 96, nome: 'PNEU DIANT. "D" RASPADO', lado: 'D', sec: 'pneu_diant', tipo: 'raspado' },
  { cod: 97, nome: 'PNEU TRAS. "E" CORTADO', lado: 'E', sec: 'pneu_tras', tipo: 'cortado' },
  { cod: 98, nome: 'PNEU TRAS. "D" CORTADO', lado: 'D', sec: 'pneu_tras', tipo: 'cortado' },
  { cod: 99, nome: 'PNEU TRAS. "E" RASPADO', lado: 'E', sec: 'pneu_tras', tipo: 'raspado' },
  { cod: 100, nome: 'PNEU TRAS. "D" RASPADO', lado: 'D', sec: 'pneu_tras', tipo: 'raspado' },
  { cod: 101, nome: 'PNEU DENTRO "E" CORTADO', lado: 'E', sec: 'pneu_tras', tipo: 'cortado' },
  { cod: 102, nome: 'PNEU DENTRO "D" CORTADO', lado: 'D', sec: 'pneu_tras', tipo: 'cortado' },
  { cod: 103, nome: 'ARCO DA RODA DIANT. "E" QUEBRADO', lado: 'E', sec: 'arco_diant', tipo: 'quebrado' },
  { cod: 104, nome: 'ARCO DA RODA DIANT. "D" QUEBRADO', lado: 'D', sec: 'arco_diant', tipo: 'quebrado' },
  { cod: 105, nome: 'ARCO DA RODA DIANT. "E" RASPADO', lado: 'E', sec: 'arco_diant', tipo: 'raspado' },
  { cod: 106, nome: 'ARCO DA RODA DIANT. "D" RASPADO', lado: 'D', sec: 'arco_diant', tipo: 'raspado' },
  { cod: 107, nome: 'ARCO DA RODA TRAS. "E" QUEBRADO', lado: 'E', sec: 'arco_tras', tipo: 'quebrado' },
  { cod: 108, nome: 'ARCO DA RODA TRAS. "D" QUEBRADO', lado: 'D', sec: 'arco_tras', tipo: 'quebrado' },
  { cod: 109, nome: 'ARCO DA RODA TRAS. "E" RASPADO', lado: 'E', sec: 'arco_tras', tipo: 'raspado' },
  { cod: 110, nome: 'ARCO DA RODA TRAS. "D" RASPADO', lado: 'D', sec: 'arco_tras', tipo: 'raspado' },
  { cod: 111, nome: 'ARO DIAN. "E" AMASSADO', lado: 'E', sec: 'aro_diant', tipo: 'amassado' },
  { cod: 112, nome: 'ARO DIAN. "D" AMASSADO', lado: 'D', sec: 'aro_diant', tipo: 'amassado' },
  { cod: 113, nome: 'ARO TRAS. "E" AMASSADO', lado: 'E', sec: 'aro_tras', tipo: 'amassado' },
  { cod: 114, nome: 'ARO TRAS. "D" AMASSADO', lado: 'D', sec: 'aro_tras', tipo: 'amassado' },
  { cod: 115, nome: 'LATERAL DO TETO "E" AVARIADO', lado: 'E', sec: 'teto', tipo: 'avariado' },
  { cod: 116, nome: 'LATERAL DO TETO "D" AVARIADO', lado: 'D', sec: 'teto', tipo: 'avariado' },
  { cod: 117, nome: 'BRAÇO DO RETRO. "E" AVARIADO', lado: 'E', sec: 'retrovisor', tipo: 'avariado' },
  { cod: 118, nome: 'BRAÇO DO RETRO. "D" AVARIADO', lado: 'D', sec: 'retrovisor', tipo: 'avariado' },
  { cod: 119, nome: 'LENTE DO RETRO. "E" AVARIADO', lado: 'E', sec: 'retrovisor', tipo: 'avariado' },
  { cod: 120, nome: 'LENTE DO RETRO. "D" AVARIADO', lado: 'D', sec: 'retrovisor', tipo: 'avariado' },
  { cod: 121, nome: 'CAPA DO RETRO. "E" AVARIADO', lado: 'E', sec: 'retrovisor', tipo: 'avariado' },
  { cod: 122, nome: 'CAPA DO RETRO. "D" AVARIADO', lado: 'D', sec: 'retrovisor', tipo: 'avariado' },
  { cod: 123, nome: 'OLHO DE GATO "E" TRINCADO', lado: 'E', sec: 'olho_gato', tipo: 'trincado' },
  { cod: 124, nome: 'OLHO DE GATO "D" TRINCADO', lado: 'D', sec: 'olho_gato', tipo: 'trincado' },
  { cod: 125, nome: 'PARACHOQUE TRAS. RASPADO', lado: 'G', sec: 'parachoque_tras', tipo: 'raspado' },
  { cod: 126, nome: 'PARACHOQUE TRAS. QUEBRADO', lado: 'G', sec: 'parachoque_tras', tipo: 'quebrado' },
  { cod: 127, nome: 'PARACHOQUE DIAN. RASPADO', lado: 'G', sec: 'parachoque_diant', tipo: 'raspado' },
  { cod: 128, nome: 'PARACHOQUE DIAN. QUEBRADO', lado: 'G', sec: 'parachoque_diant', tipo: 'quebrado' },
  { cod: 129, nome: 'GRA. DO PARACHOQUE SUP. RASPADO', lado: 'G', sec: 'grade_sup', tipo: 'raspado' },
  { cod: 130, nome: 'GRA. DO PARACHOQUE SUP. QUEBRADO', lado: 'G', sec: 'grade_sup', tipo: 'quebrado' },
  { cod: 131, nome: 'GRA. DO PARACHOQUE INF. RASPADO', lado: 'G', sec: 'grade_inf', tipo: 'raspado' },
  { cod: 132, nome: 'GRA. DO PARACHOQUE INF. QUEBRADO', lado: 'G', sec: 'grade_inf', tipo: 'quebrado' },
  { cod: 133, nome: 'BALAUSTRE QUEBRADO/SOLTO', lado: 'G', sec: 'geral', tipo: 'quebrado' },
  { cod: 134, nome: 'VIGIA QUEBRADO', lado: 'G', sec: 'vigia', tipo: 'quebrado' },
  { cod: 135, nome: 'VIDRO DA VISTA QUEBRADO', lado: 'G', sec: 'vidro_vista', tipo: 'quebrado' },
  { cod: 136, nome: 'PORTA DIAN. AVARIADA', lado: 'D', sec: 'porta_diant', tipo: 'avariada' },
  { cod: 137, nome: 'PORTA TRAS. AVARIADA', lado: 'D', sec: 'porta_tras', tipo: 'avariada' },
  { cod: 138, nome: 'CATA VENTO QUEBRADO', lado: 'G', sec: 'geral', tipo: 'quebrado' },
  { cod: 139, nome: 'COMANDO DE SETA QUEBRADO', lado: 'G', sec: 'geral', tipo: 'quebrado' },
  { cod: 140, nome: 'STOP QUEBRADO', lado: 'G', sec: 'geral', tipo: 'quebrado' },
  { cod: 141, nome: 'TAMPA DO FILTRO DE COMB. AVARIADO', lado: 'D', sec: 'tampa_comb', tipo: 'avariado' },
  { cod: 142, nome: 'RETRO. INTER. AVARIADO', lado: 'G', sec: 'geral', tipo: 'avariado' },
  { cod: 143, nome: 'SEM AVARIAS', lado: 'G', sec: 'status', tipo: 'status' },
  { cod: 144, nome: 'MOT NÃO PASSOU AVARIAS', lado: 'G', sec: 'status', tipo: 'status' }
];

function carregarAvarias() {
  try {
    const raw = localStorage.getItem(AVARIAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Gerencia o cadastro, visualização gráfica e seleção interativa por clique em avarias.html.
 */
function initAvariasModule() {
  const form = document.getElementById('formInserirAvaria');
  const containerHistorico = document.getElementById('listaAvariasContainer');
  const dataInput = document.getElementById('inputAvariaData');
  const carroInput = document.getElementById('inputAvariaCarro');
  const descInput = document.getElementById('inputAvariaDescricao');
  const containerVistas = document.getElementById('containerVistasAvarias');
  const containerTags = document.getElementById('containerTagsAvarias');
  const contadorAvarias = document.getElementById('contadorAvarias');
  const btnLimpar = document.getElementById('btnLimparAvarias');
  const btnModelo1 = document.getElementById('btnModelo1');
  const btnModelo2 = document.getElementById('btnModelo2');
  const btnAtalho143 = document.getElementById('btnAtalho143');
  const btnAtalho144 = document.getElementById('btnAtalho144');
  const tabBtns = document.querySelectorAll('.avaria-tab-btn');

  if (!form || !containerVistas) return;

  // Estado do Módulo
  let modeloAtual = 1; // 1 = Ônibus 6 Chapas (Médio), 2 = Ônibus 7 Chapas (Longo)
  let vistaAtual = 'LD'; // 'LD', 'LE', 'DIAN', 'TRAS', 'LISTA'
  const avariasSelecionadas = new Set(); // Conjunto de códigos numéricos ativos

  const containerTrocas = document.getElementById('containerTrocasCarroJornada');
  const datalistCarros = document.getElementById('listaCarrosJornadaDatalist');

  /**
   * Obtém a data e os carros persistentes da jornada (rascunho ativo ou jornada concluída).
   * Suporta o histórico completo de trocas de carro, de linha e de ambos (carro e linha).
   */
  function obterDadosPersistentesJornada() {
    let dataJornada = '';
    let carroAtual = '';
    const carrosHistorico = []; // Array de { numero, rotulo, tipo: 'inicial' | 'anterior' | 'atual' }

    try {
      // 1. Tenta pegar do rascunho ativo de jornada (prioridade máxima)
      const rascunhoRaw = localStorage.getItem('controle_motorista_jornada_rascunho');
      if (rascunhoRaw) {
        const rascunho = JSON.parse(rascunhoRaw);
        if (rascunho.data && rascunho.data.trim()) {
          dataJornada = rascunho.data.trim();
        }
        if (rascunho.carroNumero && rascunho.carroNumero.trim()) {
          carroAtual = rascunho.carroNumero.trim().toUpperCase();
        }

        // Se houver histórico de trocas nas etapas da jornada
        if (Array.isArray(rascunho.etapasJornadaAtiva)) {
          rascunho.etapasJornadaAtiva.forEach((etapa, idx) => {
            const num = (etapa.carroNumero || '').trim().toUpperCase();
            if (num && !carrosHistorico.some(c => c.numero === num)) {
              carrosHistorico.push({
                numero: num,
                rotulo: idx === 0 ? 'Carro Inicial' : `Carro Anterior (${idx + 1})`,
                tipo: 'anterior'
              });
            }
          });
        }
      }

      // 2. Se não encontrou no rascunho, busca na lista de jornadas salvas
      if (!dataJornada || !carroAtual) {
        const jornadasRaw = localStorage.getItem('controle_motorista_jornada');
        if (jornadasRaw) {
          const jornadas = JSON.parse(jornadasRaw);
          if (Array.isArray(jornadas) && jornadas.length > 0) {
            const jRecente = jornadas[0]; // mais recente
            if (!dataJornada && jRecente.data) {
              dataJornada = jRecente.data.trim();
            }
            if (!carroAtual && jRecente.carroNumero) {
              carroAtual = jRecente.carroNumero.trim().toUpperCase();
            }
            if (Array.isArray(jRecente.etapas)) {
              jRecente.etapas.forEach((etapa, idx) => {
                const num = (etapa.carroNumero || '').trim().toUpperCase();
                if (num && !carrosHistorico.some(c => c.numero === num)) {
                  carrosHistorico.push({
                    numero: num,
                    rotulo: idx === 0 ? 'Carro Inicial' : `Carro Anterior (${idx + 1})`,
                    tipo: 'anterior'
                  });
                }
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao obter dados persistentes da jornada para avarias:', e);
    }

    // Se encontramos um carro atual, adiciona ao histórico caso não esteja
    if (carroAtual) {
      const idxExistente = carrosHistorico.findIndex(c => c.numero === carroAtual);
      if (idxExistente >= 0) {
        carrosHistorico[idxExistente].rotulo = carrosHistorico.length > 1 ? 'Carro Atual (Após Troca)' : 'Carro da Jornada';
        carrosHistorico[idxExistente].tipo = 'atual';
      } else {
        carrosHistorico.push({
          numero: carroAtual,
          rotulo: carrosHistorico.length > 0 ? 'Carro Atual (Após Troca)' : 'Carro da Jornada',
          tipo: 'atual'
        });
      }
    }

    return {
      data: dataJornada,
      carroAtual: carroAtual,
      carros: carrosHistorico
    };
  }

  // Fallbacks caso jornada ainda não tenha registros
  function obterDataEscalaFallback() {
    try {
      const dados = localStorage.getItem('controle_motorista_escala');
      if (!dados) return '';
      const lista = JSON.parse(dados);
      if (Array.isArray(lista) && lista.length > 0 && lista[0].data) {
        return lista[0].data;
      }
    } catch {
      return '';
    }
    return '';
  }

  function obterCarroFallback() {
    try {
      const ultimo = localStorage.getItem('controle_motorista_ultimo_carro');
      if (ultimo) return ultimo;
      const dados = localStorage.getItem(CARROS_STORAGE_KEY);
      if (!dados) return '';
      const lista = JSON.parse(dados);
      if (Array.isArray(lista) && lista.length > 0) {
        return lista[lista.length - 1].numero || lista[0].numero || '';
      }
    } catch {
      return '';
    }
    return '';
  }

  const dadosJornada = obterDadosPersistentesJornada();

  // 1. Campo Data: acompanha a data persistente de jornada.html
  if (dataInput) {
    const dataDefinida = dadosJornada.data || obterDataEscalaFallback();
    if (dataDefinida) {
      dataInput.value = dataDefinida;
    } else if (!dataInput.value) {
      const hoje = new Date();
      const d = String(hoje.getDate()).padStart(2, '0');
      const m = String(hoje.getMonth() + 1).padStart(2, '0');
      const a = hoje.getFullYear();
      dataInput.value = `${d}/${m}/${a}`;
    }

    // Máscara automática em tempo real para a data (DD/MM/AAAA)
    dataInput.addEventListener('input', () => {
      let val = dataInput.value.replace(/\D/g, '');
      if (val.length > 8) val = val.slice(0, 8);
      if (val.length >= 5) {
        dataInput.value = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
      } else if (val.length >= 3) {
        dataInput.value = `${val.slice(0, 2)}/${val.slice(2)}`;
      } else {
        dataInput.value = val;
      }
    });

    dataInput.addEventListener('blur', () => {
      if (dataInput.value.trim()) {
        dataInput.value = formatarData(dataInput.value);
      }
    });
  }

  // 2. Campo N° Carro: acompanha o carro persistente de jornada.html (lembrando trocas de carro/linha)
  if (carroInput) {
    const carroDefinido = dadosJornada.carroAtual || obterCarroFallback();
    if (carroDefinido && !carroInput.value) {
      carroInput.value = carroDefinido;
    }

    // Alimenta o datalist com os carros da jornada
    if (datalistCarros && dadosJornada.carros.length > 0) {
      datalistCarros.innerHTML = dadosJornada.carros.map(c => `<option value="${c.numero}">${c.rotulo}</option>`).join('');
    }

    // Se houve troca de carro e há mais de 1 carro registrado na jornada, exibe botões rápidos
    if (containerTrocas && dadosJornada.carros.length > 1) {
      containerTrocas.style.display = 'flex';
      containerTrocas.innerHTML = `
        <span class="troca-carro-aviso-rotulo">🔄 Carros da Jornada:</span>
        <div class="troca-carro-botoes-grupo">
          ${dadosJornada.carros.map(c => {
            const isAtivo = c.numero === carroInput.value.trim().toUpperCase();
            return `
              <button type="button" class="btn-troca-carro-chip ${isAtivo ? 'is-active' : ''}" data-carro="${c.numero}" title="Selecionar ${c.rotulo} (${c.numero})">
                ${c.rotulo}: <strong>${c.numero}</strong>
              </button>
            `;
          }).join('')}
        </div>
      `;

      containerTrocas.querySelectorAll('.btn-troca-carro-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const num = btn.getAttribute('data-carro');
          if (num) {
            carroInput.value = num;
            atualizarChipsTrocaCarro();
            atualizarVista();
          }
        });
      });
    }

    function atualizarChipsTrocaCarro() {
      if (!containerTrocas) return;
      const numAtual = carroInput.value.trim().toUpperCase();
      containerTrocas.querySelectorAll('.btn-troca-carro-chip').forEach(btn => {
        const cNum = btn.getAttribute('data-carro');
        btn.classList.toggle('is-active', cNum === numAtual);
      });
    }

    carroInput.addEventListener('input', () => {
      carroInput.value = carroInput.value.toUpperCase();
      atualizarChipsTrocaCarro();
      atualizarVista();
    });
  }

  function obterAvariaPorCodigo(cod) {
    return TABELA_AVARIAS_144.find(item => item.cod === cod);
  }

  // Alterna uma avaria no conjunto
  function alternarAvaria(cod) {
    const item = obterAvariaPorCodigo(cod);
    if (!item) return;

    if (cod === 143 || cod === 144) {
      // Se selecionou status especial, limpa os danos
      if (avariasSelecionadas.has(cod)) {
        avariasSelecionadas.delete(cod);
      } else {
        avariasSelecionadas.clear();
        avariasSelecionadas.add(cod);
      }
    } else {
      // Se selecionou dano, remove status 143/144
      avariasSelecionadas.delete(143);
      avariasSelecionadas.delete(144);

      if (avariasSelecionadas.has(cod)) {
        avariasSelecionadas.delete(cod);
      } else {
        avariasSelecionadas.add(cod);
      }
    }

    sincronizarEstadoVisual();
  }

  function limparTodasAvarias() {
    avariasSelecionadas.clear();
    sincronizarEstadoVisual();
  }

  // Sincroniza o campo inputAvariaDescricao, as tags e os botões ativos
  function sincronizarEstadoVisual() {
    // 1. Atualiza o input com somente os códigos selecionados (sem nome)
    const codigosOrdenados = Array.from(avariasSelecionadas).sort((a, b) => a - b);
    if (codigosOrdenados.length === 0) {
      descInput.value = '';
    } else {
      descInput.value = codigosOrdenados.join(', ');
    }

    // 2. Contador
    if (contadorAvarias) {
      contadorAvarias.textContent = String(avariasSelecionadas.size);
    }

    // 3. Tags / Chips no painel superior: somente o código sem nome
    if (containerTags) {
      if (avariasSelecionadas.size === 0) {
        containerTags.innerHTML = '<span class="avarias-tag-empty">Nenhuma avaria marcada no ônibus.</span>';
      } else {
        containerTags.innerHTML = '';
        codigosOrdenados.forEach(c => {
          const it = obterAvariaPorCodigo(c);
          const chip = document.createElement('span');
          chip.className = 'avaria-tag-chip';
          if (it) chip.setAttribute('title', `${c} - ${it.nome}`);
          chip.innerHTML = `
            <span><strong>[${c}]</strong></span>
            <button type="button" class="avaria-tag-chip__remove" data-cod="${c}" title="Remover avaria">&times;</button>
          `;
          const btnRemove = chip.querySelector('.avaria-tag-chip__remove');
          btnRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            alternarAvaria(c);
          });
          containerTags.appendChild(chip);
        });
      }
    }

    // 4. Atualiza destaque nos botões da vista atual
    document.querySelectorAll('.btn-avaria-chip').forEach(btn => {
      const cod = parseInt(btn.getAttribute('data-cod'), 10);
      if (avariasSelecionadas.has(cod)) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    document.querySelectorAll('.item-codigo-card').forEach(card => {
      const cod = parseInt(card.getAttribute('data-cod'), 10);
      if (avariasSelecionadas.has(cod)) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });

    // 5. Atualiza botões de atalho
    if (btnAtalho143) {
      btnAtalho143.classList.toggle('is-active', avariasSelecionadas.has(143));
    }
    if (btnAtalho144) {
      btnAtalho144.classList.toggle('is-active', avariasSelecionadas.has(144));
    }
  }

  // Cria um botão chip interativo com o nome oficial completo (sem abreviações)
  function criarChip(cod) {
    const item = obterAvariaPorCodigo(cod);
    if (!item) return '';
    const desc = item.nome; // Nome completo oficial da tabela (sem abreviação)
    const ativo = avariasSelecionadas.has(cod) ? 'is-active' : '';
    return `
      <button type="button" class="btn-avaria-chip ${ativo}" data-cod="${cod}" title="${item.nome}">
        <span class="chip-num">${cod}</span>
        <span class="chip-label">${desc}</span>
      </button>
    `;
  }

  // Renderiza Vista Lado Direito (Portas L/D) - DIANTEIRA NA DIREITA, TRASEIRA NA ESQUERDA (Conforme Imagem 1)
  function renderizarLadoDireito() {
    const isModelo2 = modeloAtual === 2;

    let svgJanelas = '';
    let svgPortas = '';

    if (!isModelo2) {
      // Modelo 1: 6 chapas, 2 portas (dianteira à direita e traseira/meio)
      svgJanelas = `
        <!-- 6ª chapa (traseira à esquerda) -->
        <rect x="35" y="28" width="70" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 5ª chapa -->
        <rect x="115" y="28" width="80" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 4ª chapa -->
        <rect x="205" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 3ª chapa -->
        <rect x="290" y="28" width="60" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 2ª chapa -->
        <rect x="420" y="28" width="85" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 1ª chapa (dianteira à direita) -->
        <rect x="515" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      `;
      svgPortas = `
        <!-- Porta Traseira/Meio -->
        <rect x="360" y="32" width="50" height="98" rx="3" fill="#0f172a" stroke="#00aaff" stroke-width="2" />
        <line x1="385" y1="32" x2="385" y2="130" stroke="#00aaff" stroke-width="1" />
        <text x="385" y="142" font-size="9" fill="#00aaff" text-anchor="middle" font-weight="bold">PORTA MEIO</text>

        <!-- Porta Dianteira (à direita) -->
        <rect x="600" y="32" width="40" height="98" rx="3" fill="#0f172a" stroke="#00aaff" stroke-width="2" />
        <line x1="620" y1="32" x2="620" y2="130" stroke="#00aaff" stroke-width="1" />
        <text x="620" y="142" font-size="9" fill="#00aaff" text-anchor="middle" font-weight="bold">PORTA DIANT.</text>
        <text x="620" y="152" font-size="8" fill="#f59e0b" text-anchor="middle" font-weight="bold">PÉ COLUNA</text>
      `;
    } else {
      // Modelo 2: 7 chapas, portas proporcionais
      svgJanelas = `
        <!-- 7ª chapa -->
        <rect x="35" y="28" width="60" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 6ª chapa -->
        <rect x="105" y="28" width="70" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 5ª chapa -->
        <rect x="185" y="28" width="70" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 4ª chapa -->
        <rect x="265" y="28" width="55" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 3ª chapa -->
        <rect x="385" y="28" width="70" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 2ª chapa -->
        <rect x="465" y="28" width="70" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <!-- 1ª chapa -->
        <rect x="545" y="28" width="50" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      `;
      svgPortas = `
        <!-- Porta Traseira/Meio -->
        <rect x="330" y="32" width="45" height="98" rx="3" fill="#0f172a" stroke="#00aaff" stroke-width="2" />
        <line x1="352" y1="32" x2="352" y2="130" stroke="#00aaff" stroke-width="1" />
        <text x="352" y="142" font-size="9" fill="#00aaff" text-anchor="middle" font-weight="bold">PORTA TRAS.</text>

        <!-- Porta Dianteira (à direita) -->
        <rect x="605" y="32" width="38" height="98" rx="3" fill="#0f172a" stroke="#00aaff" stroke-width="2" />
        <line x1="624" y1="32" x2="624" y2="130" stroke="#00aaff" stroke-width="1" />
        <text x="624" y="142" font-size="9" fill="#00aaff" text-anchor="middle" font-weight="bold">PORTA DIANT.</text>
        <text x="624" y="152" font-size="8" fill="#f59e0b" text-anchor="middle" font-weight="bold">PÉ COLUNA</text>
      `;
    }

    return `
      <div class="onibus-esquema-card">
        <div class="onibus-esquema-titulo">
          <span>LADO DIREITO (L/D) — COM PORTAS DE EMBARQUE/DESEMBARQUE</span>
          <span style="color:#00aaff;">${isModelo2 ? 'Modelo 7 Chapas (Longo)' : 'Modelo 6 Chapas (Médio)'}</span>
        </div>

        <div class="onibus-svg-container">
          <svg viewBox="0 0 710 180" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gradAmarelo" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffdd00" />
                <stop offset="100%" stop-color="#eab308" />
              </linearGradient>
              <linearGradient id="gradAzul" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#0369a1" />
              </linearGradient>
            </defs>

            <!-- Indicadores de Orientação (Traseira na Esquerda / Dianteira na Direita) -->
            <rect x="20" y="3" width="135" height="14" rx="3" fill="#0f172a" opacity="0.85" />
            <text x="87" y="13" font-size="9" font-weight="bold" fill="#f59e0b" text-anchor="middle">⬅️ TRASEIRA (FUNDO)</text>

            <rect x="555" y="3" width="135" height="14" rx="3" fill="#0f172a" opacity="0.85" />
            <text x="622" y="13" font-size="9" font-weight="bold" fill="#00aaff" text-anchor="middle">DIANTEIRA (FRENTE) ➡️</text>

            <!-- Silhueta Principal da Carroceria (Traseira à esquerda, Dianteira à direita) -->
            <path d="M 20,135 L 20,38 Q 20,15 45,15 L 660,15 Q 690,15 690,38 L 685,135 Z" fill="url(#gradAmarelo)" stroke="#1e293b" stroke-width="2" />

            <!-- Faixa Vermelha Separadora -->
            <rect x="20" y="80" width="668" height="6" fill="#dc2626" />

            <!-- Saia / Parte Inferior Azul -->
            <path d="M 20,86 L 687,86 L 685,135 L 20,135 Z" fill="url(#gradAzul)" />

            <!-- Janelas e Portas -->
            ${svgJanelas}
            ${svgPortas}

            <!-- Para-brisa lateral dianteiro (à DIREITA) -->
            <path d="M 648,26 L 665,26 Q 685,26 685,42 L 682,75 L 648,75 Z" fill="#0f172a" stroke="#334155" stroke-width="1.5" />

            <!-- Rodas & Arcos -->
            <!-- Roda Traseira (à ESQUERDA) -->
            <path d="M 135,135 A 25,25 0 0 1 185,135 Z" fill="#0b0e14" />
            <circle cx="160" cy="135" r="21" fill="#1e293b" stroke="#475569" stroke-width="2" />
            <circle cx="160" cy="135" r="10" fill="#94a3b8" />

            <!-- Roda Dianteira (à DIREITA) -->
            <path d="M 535,135 A 25,25 0 0 1 585,135 Z" fill="#0b0e14" />
            <circle cx="560" cy="135" r="21" fill="#1e293b" stroke="#475569" stroke-width="2" />
            <circle cx="560" cy="135" r="10" fill="#94a3b8" />

            <!-- Inscrição Reginas e Frota -->
            <text x="235" y="112" font-family="sans-serif" font-size="22" font-weight="900" font-style="italic" fill="#ffffff" opacity="0.95">Reginas</text>
            <text x="75" y="112" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff">RJ ${carroInput && carroInput.value.trim() ? carroInput.value.trim() : '110.091'}</text>
            <text x="590" y="24" font-size="8.5" font-weight="bold" fill="#00aaff">CÚPULA DIANTEIRA ➡️</text>
          </svg>
        </div>

        <!-- Seções Clicáveis da Carroceria L/D (Ordenadas da Frente para Trás) -->
        <div class="grid-avarias-secoes grid-avarias-secoes--lateral">
          <!-- Dianteira & Teto L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Dianteira & Teto (L/D)</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(116)}
              ${criarChip(10)}
              ${criarChip(12)}
              ${criarChip(14)}
              ${criarChip(16)}
              ${criarChip(2)}
              ${criarChip(4)}
            </div>
          </div>

          <!-- Portas L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Portas L/D</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(136)}
              ${criarChip(137)}
            </div>
          </div>

          <!-- 1ª Chapa e 1ª Saia L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">1ª Chapa & 1ª Saia (Frente)</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(28)}
              ${criarChip(30)}
              ${criarChip(32)}
              ${criarChip(34)}
            </div>
          </div>

          <!-- Roda Dianteira L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Roda Diant. L/D</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(104)}
              ${criarChip(106)}
              ${criarChip(94)}
              ${criarChip(96)}
              ${criarChip(112)}
            </div>
          </div>

          <!-- 2ª Chapa e 2ª Saia L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">2ª Chapa & 2ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(36)}
              ${criarChip(38)}
              ${criarChip(40)}
              ${criarChip(42)}
            </div>
          </div>

          <!-- 3ª Chapa e 3ª Saia L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">3ª Chapa & 3ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(44)}
              ${criarChip(46)}
              ${criarChip(48)}
              ${criarChip(50)}
            </div>
          </div>

          <!-- 4ª Chapa e 4ª Saia L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">4ª Chapa & 4ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(52)}
              ${criarChip(54)}
              ${criarChip(56)}
              ${criarChip(58)}
            </div>
          </div>

          <!-- Roda Traseira L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Roda Tras. L/D</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(108)}
              ${criarChip(110)}
              ${criarChip(98)}
              ${criarChip(100)}
              ${criarChip(102)}
              ${criarChip(114)}
            </div>
          </div>

          <!-- 5ª Chapa e 5ª Saia L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">5ª Chapa & 5ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(60)}
              ${criarChip(62)}
              ${criarChip(64)}
              ${criarChip(66)}
            </div>
          </div>

          <!-- 6ª Chapa e 6ª Saia L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">6ª Chapa & 6ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(68)}
              ${criarChip(70)}
              ${criarChip(72)}
              ${criarChip(74)}
            </div>
          </div>

          ${isModelo2 ? `
            <!-- 7ª Chapa e 7ª Saia L/D (Modelo 2 Longo) -->
            <div class="secao-avaria-box">
              <div class="secao-avaria-box__header">7ª Chapa & 7ª Saia</div>
              <div class="secao-avaria-box__botoes">
                ${criarChip(76)}
                ${criarChip(78)}
                ${criarChip(80)}
                ${criarChip(82)}
              </div>
            </div>
          ` : ''}

          <!-- Coluna Traseira & Acessórios L/D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Traseira (Fundo) & Acessórios</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(18)}
              ${criarChip(20)}
              ${criarChip(22)}
              ${criarChip(24)}
              ${criarChip(6)}
              ${criarChip(8)}
              ${criarChip(124)}
              ${criarChip(141)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Renderiza Vista Lado Esquerdo (Motorista L/E)
  function renderizarLadoEsquerdo() {
    const isModelo2 = modeloAtual === 2;

    let svgJanelas = '';
    if (!isModelo2) {
      // Modelo 1 (6 chapas sem portas)
      svgJanelas = `
        <rect x="35" y="28" width="60" height="42" rx="4" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
        <rect x="105" y="28" width="85" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="200" y="28" width="85" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="295" y="28" width="85" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="390" y="28" width="85" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="485" y="28" width="85" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="580" y="28" width="95" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      `;
    } else {
      // Modelo 2 (7 chapas sem portas - Imagem 1 inferior)
      svgJanelas = `
        <rect x="35" y="28" width="60" height="42" rx="4" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
        <rect x="105" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="190" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="275" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="360" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="445" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="530" y="28" width="75" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <rect x="615" y="28" width="65" height="42" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      `;
    }

    return `
      <div class="onibus-esquema-card">
        <div class="onibus-esquema-titulo">
          <span>LADO ESQUERDO (L/E) — LADO DO MOTORISTA (SEM PORTAS)</span>
          <span style="color:#00aaff;">${isModelo2 ? 'Modelo 7 Chapas (Longo)' : 'Modelo 6 Chapas (Médio)'}</span>
        </div>

        <div class="onibus-svg-container">
          <svg viewBox="0 0 710 180" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gradAmareloLE" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffdd00" />
                <stop offset="100%" stop-color="#eab308" />
              </linearGradient>
              <linearGradient id="gradAzulLE" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#0369a1" />
              </linearGradient>
            </defs>

            <!-- Indicadores de Orientação (Dianteira na Esquerda / Traseira na Direita) -->
            <rect x="20" y="3" width="135" height="14" rx="3" fill="#0f172a" opacity="0.85" />
            <text x="87" y="13" font-size="9" font-weight="bold" fill="#00aaff" text-anchor="middle">⬅️ DIANTEIRA (FRENTE)</text>

            <rect x="555" y="3" width="135" height="14" rx="3" fill="#0f172a" opacity="0.85" />
            <text x="622" y="13" font-size="9" font-weight="bold" fill="#f59e0b" text-anchor="middle">TRASEIRA (FUNDO) ➡️</text>

            <!-- Carroceria Amarela -->
            <path d="M 25,135 L 20,35 Q 20,15 45,15 L 670,15 Q 695,15 695,35 L 690,135 Z" fill="url(#gradAmareloLE)" stroke="#1e293b" stroke-width="2" />

            <!-- Faixa Vermelha Separadora -->
            <rect x="22" y="80" width="671" height="6" fill="#dc2626" />

            <!-- Saia Inferior Azul -->
            <path d="M 23,86 L 692,86 L 690,135 L 24,135 Z" fill="url(#gradAzulLE)" />

            <!-- Janelas Contínuas -->
            ${svgJanelas}

            <!-- Rodas & Arcos -->
            <!-- Roda Dianteira -->
            <path d="M 125,135 A 25,25 0 0 1 175,135 Z" fill="#0b0e14" />
            <circle cx="150" cy="135" r="21" fill="#1e293b" stroke="#475569" stroke-width="2" />
            <circle cx="150" cy="135" r="10" fill="#94a3b8" />

            <!-- Roda Traseira -->
            <path d="M 525,135 A 25,25 0 0 1 575,135 Z" fill="#0b0e14" />
            <circle cx="550" cy="135" r="21" fill="#1e293b" stroke="#475569" stroke-width="2" />
            <circle cx="550" cy="135" r="10" fill="#94a3b8" />

            <!-- Inscrição Reginas -->
            <text x="310" y="112" font-family="sans-serif" font-size="22" font-weight="900" font-style="italic" fill="#ffffff" opacity="0.95">Reginas</text>
            <text x="500" y="112" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff">RJ ${carroInput && carroInput.value.trim() ? carroInput.value.trim() : '110.091'}</text>
            <text x="610" y="112" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff">${carroInput && carroInput.value.trim() ? (carroInput.value.trim().split('.').pop() || carroInput.value.trim()) : '091'}</text>
          </svg>
        </div>

        <!-- Seções Clicáveis da Carroceria L/E -->
        <div class="grid-avarias-secoes grid-avarias-secoes--lateral">
          <!-- Teto e Dianteira L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Teto e Coluna Diant.</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(115, 'Teto')}
              ${criarChip(9, 'Col. Diant Queb')}
              ${criarChip(11, 'Col. Diant Rasp')}
              ${criarChip(13, 'Col. Sup Queb')}
              ${criarChip(15, 'Col. Sup Rasp')}
              ${criarChip(1, 'Pont. Diant Queb')}
              ${criarChip(3, 'Pont. Diant Rasp')}
            </div>
          </div>

          <!-- 1ª Chapa e 1ª Saia L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">1ª Chapa & 1ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(27, '1ª Chapa Amass')}
              ${criarChip(29, '1ª Chapa Rasp')}
              ${criarChip(31, '1ª Saia Amass')}
              ${criarChip(33, '1ª Saia Rasp')}
            </div>
          </div>

          <!-- Roda Dianteira L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Roda Diant. L/E</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(103, 'Arco Quebr')}
              ${criarChip(105, 'Arco Rasp')}
              ${criarChip(93, 'Pneu Cort')}
              ${criarChip(95, 'Pneu Rasp')}
              ${criarChip(111, 'Aro Amass')}
            </div>
          </div>

          <!-- 2ª Chapa e 2ª Saia L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">2ª Chapa & 2ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(35, '2ª Chapa Amass')}
              ${criarChip(37, '2ª Chapa Rasp')}
              ${criarChip(39, '2ª Saia Amass')}
              ${criarChip(41, '2ª Saia Rasp')}
            </div>
          </div>

          <!-- 3ª Chapa e 3ª Saia L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">3ª Chapa & 3ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(43, '3ª Chapa Amass')}
              ${criarChip(45, '3ª Chapa Rasp')}
              ${criarChip(47, '3ª Saia Amass')}
              ${criarChip(49, '3ª Saia Rasp')}
            </div>
          </div>

          <!-- 4ª Chapa e 4ª Saia L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">4ª Chapa & 4ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(51, '4ª Chapa Amass')}
              ${criarChip(53, '4ª Chapa Rasp')}
              ${criarChip(55, '4ª Saia Amass')}
              ${criarChip(57, '4ª Saia Rasp')}
            </div>
          </div>

          <!-- 5ª Chapa e 5ª Saia L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">5ª Chapa & 5ª Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(59, '5ª Chapa Amass')}
              ${criarChip(61, '5ª Chapa Rasp')}
              ${criarChip(63, '5ª Saia Amass')}
              ${criarChip(65, '5ª Saia Rasp')}
            </div>
          </div>

          <!-- Roda Traseira L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Roda Tras. L/E</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(107, 'Arco Quebr')}
              ${criarChip(109, 'Arco Rasp')}
              ${criarChip(97, 'Pneu Cort')}
              ${criarChip(99, 'Pneu Rasp')}
              ${criarChip(101, 'Pneu Dentro Cort')}
              ${criarChip(113, 'Aro Amass')}
            </div>
          </div>

          <!-- 6ª Chapa e 6ª Saia L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">6ª Chapa & Saia</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(67, '6ª Chapa Amass')}
              ${criarChip(69, '6ª Chapa Rasp')}
              ${criarChip(71, '6ª Saia Rasp')}
              ${criarChip(73, '6ª Saia Amass')}
            </div>
          </div>

          ${isModelo2 ? `
            <!-- 7ª Chapa e 7ª Saia L/E (Modelo 2 Longo) -->
            <div class="secao-avaria-box">
              <div class="secao-avaria-box__header">7ª Chapa & 7ª Saia</div>
              <div class="secao-avaria-box__botoes">
                ${criarChip(75, '7ª Chapa Amass')}
                ${criarChip(77, '7ª Chapa Rasp')}
                ${criarChip(79, '7ª Saia Rasp')}
                ${criarChip(81, '7ª Saia Amass')}
              </div>
            </div>
          ` : ''}

          <!-- Coluna Traseira L/E -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Traseira & Acessórios</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(17, 'Col. Tras Queb')}
              ${criarChip(19, 'Col. Tras Rasp')}
              ${criarChip(21, 'Col. Sup Queb')}
              ${criarChip(23, 'Col. Sup Rasp')}
              ${criarChip(5, 'Pont. Tras Queb')}
              ${criarChip(7, 'Pont. Tras Rasp')}
              ${criarChip(123, 'Olho de Gato E')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Renderiza Vista Dianteira (Frente)
  function renderizarDianteira() {
    return `
      <div class="onibus-esquema-card">
        <div class="onibus-esquema-titulo">
          <span>DIANTEIRA — FRENTE DO ÔNIBUS (PARABRISAS, FARÓIS, GRADE E PARA-CHOQUE)</span>
        </div>

        <div class="onibus-svg-container" style="max-width: 420px; margin: 0 auto;">
          <svg viewBox="0 0 300 240" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
            <!-- Teto e Letreiro -->
            <path d="M 40,30 Q 150,10 260,30 L 265,50 L 35,50 Z" fill="#ffd700" stroke="#1e293b" stroke-width="2" />
            <rect x="60" y="24" width="180" height="20" rx="3" fill="#000000" stroke="#334155" stroke-width="1.5" />
            <text x="150" y="38" fill="#ffea00" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">416C CENTRAL</text>

            <!-- Para-brisa E e D -->
            <rect x="40" y="55" width="105" height="70" rx="4" fill="#0f172a" stroke="#00aaff" stroke-width="1.5" />
            <rect x="155" y="55" width="105" height="70" rx="4" fill="#0f172a" stroke="#00aaff" stroke-width="1.5" />
            <text x="92" y="92" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">PARA-BRISA E</text>
            <text x="207" y="92" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">PARA-BRISA D</text>

            <!-- Retrovisores Dianteiros -->
            <!-- Esquerdo -->
            <rect x="15" y="65" width="16" height="42" rx="3" fill="#1e293b" stroke="#e2e8f0" stroke-width="1" />
            <line x1="31" y1="75" x2="39" y2="75" stroke="#94a3b8" stroke-width="3" />
            <!-- Direito -->
            <rect x="269" y="65" width="16" height="42" rx="3" fill="#1e293b" stroke="#e2e8f0" stroke-width="1" />
            <line x1="261" y1="75" x2="269" y2="75" stroke="#94a3b8" stroke-width="3" />

            <!-- Carroceria Frontal e Grade -->
            <rect x="35" y="130" width="230" height="50" fill="#0284c7" />
            <rect x="90" y="135" width="120" height="35" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
            <text x="150" y="157" fill="#ffffff" font-size="12" font-weight="900" text-anchor="middle">GRADE</text>

            <!-- Faróis -->
            <circle cx="65" cy="155" r="14" fill="#fef08a" stroke="#e2e8f0" stroke-width="2" />
            <circle cx="235" cy="155" r="14" fill="#fef08a" stroke="#e2e8f0" stroke-width="2" />

            <!-- Para-choque Frontal e Ponteiras -->
            <rect x="25" y="185" width="250" height="30" rx="5" fill="#ffd700" stroke="#1e293b" stroke-width="2" />
            <text x="150" y="204" fill="#000000" font-size="11" font-weight="bold" text-anchor="middle">PARA-CHOQUE DIANTEIRO</text>

            <rect x="25" y="185" width="40" height="30" rx="3" fill="#ca8a04" opacity="0.4" />
            <rect x="235" y="185" width="40" height="30" rx="3" fill="#ca8a04" opacity="0.4" />
            <text x="45" y="226" font-size="9" fill="#00aaff" font-weight="bold" text-anchor="middle">PONT. E</text>
            <text x="255" y="226" font-size="9" fill="#00aaff" font-weight="bold" text-anchor="middle">PONT. D</text>
          </svg>
        </div>

        <div class="grid-avarias-secoes grid-avarias-secoes--frontal">
          <!-- Vidros e Visores -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Vidros e Para-brisa</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(135, 'Vidro Vista Queb')}
              ${criarChip(25, 'Parabrisa E Trinc')}
              ${criarChip(26, 'Parabrisa D Trinc')}
            </div>
          </div>

          <!-- Faróis E e D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Faróis</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(87, 'Lente Farol E')}
              ${criarChip(89, 'Capa Farol E')}
              ${criarChip(91, 'Farol E Avar')}
              ${criarChip(88, 'Lente Farol D')}
              ${criarChip(90, 'Capa Farol D')}
              ${criarChip(92, 'Farol D Avar')}
            </div>
          </div>

          <!-- Retrovisores E e D -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Retrovisores</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(117, 'Braço Retro E')}
              ${criarChip(119, 'Lente Retro E')}
              ${criarChip(121, 'Capa Retro E')}
              ${criarChip(118, 'Braço Retro D')}
              ${criarChip(120, 'Lente Retro D')}
              ${criarChip(122, 'Capa Retro D')}
            </div>
          </div>

          <!-- Grade e Para-choque Dianteiro -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Grade & Para-choque</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(129, 'Grade Sup Rasp')}
              ${criarChip(130, 'Grade Sup Queb')}
              ${criarChip(131, 'Grade Inf Rasp')}
              ${criarChip(132, 'Grade Inf Queb')}
              ${criarChip(127, 'Parachoque Diant Rasp')}
              ${criarChip(128, 'Parachoque Diant Queb')}
              ${criarChip(1, 'Pont. Diant E Queb')}
              ${criarChip(3, 'Pont. Diant E Rasp')}
              ${criarChip(2, 'Pont. Diant D Queb')}
              ${criarChip(4, 'Pont. Diant D Rasp')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Renderiza Vista Traseira
  function renderizarTraseira() {
    return `
      <div class="onibus-esquema-card">
        <div class="onibus-esquema-titulo">
          <span>TRASEIRA — PARTE POSTERIOR (VIGIA, CHAPA TRASEIRA, LANTERNAS E PARA-CHOQUE)</span>
        </div>

        <div class="onibus-svg-container" style="max-width: 420px; margin: 0 auto;">
          <svg viewBox="0 0 300 240" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
            <!-- Teto Traseiro -->
            <path d="M 40,25 Q 150,15 260,25 L 265,45 L 35,45 Z" fill="#ffd700" stroke="#1e293b" stroke-width="2" />

            <!-- Vigia Traseiro (Vidro) -->
            <rect x="50" y="45" width="200" height="75" rx="6" fill="#0f172a" stroke="#00aaff" stroke-width="2" />
            <text x="150" y="88" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle">VIGIA</text>

            <!-- Chapa Traseira Azul/Amarela -->
            <rect x="35" y="125" width="230" height="60" fill="#0284c7" stroke="#1e293b" stroke-width="1.5" />
            <text x="150" y="155" fill="#ffffff" font-size="15" font-weight="900" font-style="italic" text-anchor="middle">Reginas</text>
            <text x="150" y="175" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle">CHAPA TRASEIRA</text>

            <!-- Lanternas Traseiras Verticais -->
            <!-- Esquerda -->
            <rect x="38" y="132" width="15" height="48" rx="3" fill="#dc2626" stroke="#ffffff" stroke-width="1" />
            <!-- Direita -->
            <rect x="247" y="132" width="15" height="48" rx="3" fill="#dc2626" stroke="#ffffff" stroke-width="1" />

            <!-- Para-choque Traseiro e Ponteiras -->
            <rect x="25" y="190" width="250" height="30" rx="5" fill="#ffd700" stroke="#1e293b" stroke-width="2" />
            <text x="150" y="209" fill="#000000" font-size="11" font-weight="bold" text-anchor="middle">PARACHOQUE TRASEIRO</text>

            <rect x="25" y="190" width="40" height="30" rx="3" fill="#ca8a04" opacity="0.4" />
            <rect x="235" y="190" width="40" height="30" rx="3" fill="#ca8a04" opacity="0.4" />
            <text x="45" y="232" font-size="9" fill="#00aaff" font-weight="bold" text-anchor="middle">PONT. E</text>
            <text x="255" y="232" font-size="9" fill="#00aaff" font-weight="bold" text-anchor="middle">PONT. D</text>
          </svg>
        </div>

        <div class="grid-avarias-secoes grid-avarias-secoes--frontal">
          <!-- Vigia -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Vidro Traseiro</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(134, 'Vigia Quebrado')}
            </div>
          </div>

          <!-- Lanternas Traseiras -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Lanternas</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(83, 'Lanterna E Avar')}
              ${criarChip(85, 'Capa Lanterna E')}
              ${criarChip(84, 'Lanterna D Avar')}
              ${criarChip(86, 'Capa Lanterna D')}
            </div>
          </div>

          <!-- Para-choque Traseiro & Ponteiras -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Para-choque & Ponteiras</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(125, 'Parachoque Tras Rasp')}
              ${criarChip(126, 'Parachoque Tras Queb')}
              ${criarChip(5, 'Pont. Tras E Queb')}
              ${criarChip(7, 'Pont. Tras E Rasp')}
              ${criarChip(6, 'Pont. Tras D Queb')}
              ${criarChip(8, 'Pont. Tras D Rasp')}
            </div>
          </div>

          <!-- Colunas Traseiras -->
          <div class="secao-avaria-box">
            <div class="secao-avaria-box__header">Colunas Traseiras</div>
            <div class="secao-avaria-box__botoes">
              ${criarChip(17, 'Col. Tras E Queb')}
              ${criarChip(19, 'Col. Tras E Rasp')}
              ${criarChip(21, 'Col. Sup Tras E Queb')}
              ${criarChip(23, 'Col. Sup Tras E Rasp')}
              ${criarChip(18, 'Col. Tras D Queb')}
              ${criarChip(20, 'Col. Tras D Rasp')}
              ${criarChip(22, 'Col. Sup Tras D Queb')}
              ${criarChip(24, 'Col. Sup Tras D Rasp')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Renderiza Todos os Códigos (1 a 144) com Busca Instantânea
  function renderizarListaCompleta() {
    return `
      <div class="lista-completa-container">
        <input type="text" id="inputBuscaAvarias" class="lista-completa-busca" placeholder="🔍 Pesquisar código ou avaria (ex: 28, chapa, parabrisa, pneu, grade)..." />

        <div class="lista-completa-grid" id="gridListaCompleta">
          ${TABELA_AVARIAS_144.map(item => `
            <div class="item-codigo-card ${avariasSelecionadas.has(item.cod) ? 'is-active' : ''}" data-cod="${item.cod}">
              <span class="item-codigo-card__cod">${item.cod}</span>
              <span class="item-codigo-card__nome">${item.nome}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Renderiza a vista selecionada
  function atualizarVista() {
    if (vistaAtual === 'LD') {
      containerVistas.innerHTML = renderizarLadoDireito();
    } else if (vistaAtual === 'LE') {
      containerVistas.innerHTML = renderizarLadoEsquerdo();
    } else if (vistaAtual === 'DIAN') {
      containerVistas.innerHTML = renderizarDianteira();
    } else if (vistaAtual === 'TRAS') {
      containerVistas.innerHTML = renderizarTraseira();
    } else if (vistaAtual === 'LISTA') {
      containerVistas.innerHTML = renderizarListaCompleta();

      // Vincula o campo de pesquisa instantânea
      const buscaInput = document.getElementById('inputBuscaAvarias');
      const grid = document.getElementById('gridListaCompleta');
      if (buscaInput && grid) {
        buscaInput.addEventListener('input', () => {
          const termo = buscaInput.value.trim().toLowerCase();
          grid.querySelectorAll('.item-codigo-card').forEach(card => {
            const cod = card.getAttribute('data-cod');
            const nome = card.querySelector('.item-codigo-card__nome').textContent.toLowerCase();
            if (!termo || cod.includes(termo) || nome.includes(termo)) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          });
        });
      }
    }

    // Vincula cliques aos botões da vista recém-renderizada
    vincularCliquesBotoes();
    sincronizarEstadoVisual();
  }

  // Vincula os cliques em qualquer chip ou card
  function vincularCliquesBotoes() {
    containerVistas.querySelectorAll('.btn-avaria-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cod = parseInt(btn.getAttribute('data-cod'), 10);
        alternarAvaria(cod);
      });
    });

    containerVistas.querySelectorAll('.item-codigo-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const cod = parseInt(card.getAttribute('data-cod'), 10);
        alternarAvaria(cod);
      });
    });
  }

  // Eventos das Abas de Vistas
  tabBtns.forEach(tab => {
    tab.addEventListener('click', () => {
      tabBtns.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      vistaAtual = tab.getAttribute('data-vista');
      atualizarVista();
    });
  });

  // Eventos do Seletor de Modelo
  if (btnModelo1 && btnModelo2) {
    btnModelo1.addEventListener('click', () => {
      modeloAtual = 1;
      btnModelo1.classList.add('is-active');
      btnModelo2.classList.remove('is-active');
      atualizarVista();
    });

    btnModelo2.addEventListener('click', () => {
      modeloAtual = 2;
      btnModelo2.classList.add('is-active');
      btnModelo1.classList.remove('is-active');
      atualizarVista();
    });
  }

  // Atalhos Rápidos 143 e 144
  if (btnAtalho143) {
    btnAtalho143.addEventListener('click', () => alternarAvaria(143));
  }
  if (btnAtalho144) {
    btnAtalho144.addEventListener('click', () => alternarAvaria(144));
  }

  // Botão Limpar Seleções
  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparTodasAvarias);
  }

  // Renderiza Histórico de Avarias Gravadas
  function renderizarHistorico() {
    if (!containerHistorico) return;
    const lista = carregarAvarias();
    containerHistorico.innerHTML = '';

    if (lista.length === 0) {
      containerHistorico.innerHTML = '<p style="color: #666666; font-size: 0.9rem; text-align: center; padding: 20px 10px;">Nenhuma avaria registrada. Marque os itens no ônibus acima e clique em Inserir.</p>';
      return;
    }

    lista.forEach((avaria, index) => {
      const card = document.createElement('div');
      card.className = 'item-avaria-card';

      card.innerHTML = `
        <span class="dado-escala col-avaria-data-dado">${avaria.data || '--'}</span>
        <span class="dado-escala col-avaria-carro-dado">${avaria.carro || '--'}</span>
        <span class="dado-escala col-avaria-descricao-dado" title="${avaria.descricao || ''}">${avaria.descricao || '--'}</span>
        <button type="button" class="btn-excluir-item" aria-label="Excluir avaria" data-index="${index}">&#x2715;</button>
      `;

      const btnExcluir = card.querySelector('.btn-excluir-item');
      if (btnExcluir) {
        btnExcluir.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btnExcluir.getAttribute('data-index'), 10);
          const listaAtualizada = carregarAvarias();
          listaAtualizada.splice(idx, 1);
          localStorage.setItem(AVARIAS_STORAGE_KEY, JSON.stringify(listaAtualizada));
          renderizarHistorico();
        });
      }

      containerHistorico.appendChild(card);
    });
  }

  // Submissão do Formulário
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const novaAvaria = {
      data: dataInput ? dataInput.value.trim() : '',
      carro: carroInput ? carroInput.value.trim().toUpperCase() : '',
      descricao: descInput ? descInput.value.trim() : '',
      codigos: Array.from(avariasSelecionadas).sort((a, b) => a - b)
    };

    if (!novaAvaria.carro || !novaAvaria.descricao) {
      alert('Por favor, informe o número do Carro e clique nas avarias do ônibus antes de inserir.');
      return;
    }

    const listaAtual = carregarAvarias();
    listaAtual.unshift(novaAvaria); // Mais recentes no topo
    localStorage.setItem(AVARIAS_STORAGE_KEY, JSON.stringify(listaAtual));

    // Limpa a seleção e o campo após gravar
    limparTodasAvarias();

    renderizarHistorico();
  });

  // Inicialização
  atualizarVista();
  renderizarHistorico();
}


/* ============================================================
   MÓDULO 8: CONTROLE DE JORNADA (jornada.html)
   Formatação de data, auto-preenchimento da semana e
   busca de dados da escala pela data.
   ============================================================ */

function initJornadaModule() {
  const form = document.getElementById('formInserirJornada');
  const container = document.getElementById('jornadaContainer');
  const dataInput = document.getElementById('inputDataJornada');
  const semanaInput = document.getElementById('inputSemana');
  const horaInput = document.getElementById('inputHoraPegada');
  const matInput = document.getElementById('inputJornadaMatricula');
  const motInput = document.getElementById('inputJornadaMotorista');
  const linhaInput = document.getElementById('inputJornadaLinha');
  const linhaNomeInput = document.getElementById('inputJornadaLinhaNome');
  const carroSiglaInput = document.getElementById('inputJornadaCarroSigla');
  const carroNumInput = document.getElementById('inputJornadaCarroNumero');
  const carroPlacaInput = document.getElementById('inputJornadaCarroPlaca');
  const kmPainelInicialInput = document.getElementById('inputKmPainelInicial');
  const kmPainelFinalInput = document.getElementById('inputKmPainelFinal');
  const kmPainelRodadoInput = document.getElementById('inputKmPainelRodado');
  const kmTacoInicialInput = document.getElementById('inputKmTacoInicial');
  const kmTacoFinalInput = document.getElementById('inputKmTacoFinal');
  const kmTacoRodadoInput = document.getElementById('inputKmTacoRodado');
  const avariasInput = document.getElementById('inputAvarias');

  // Novos botões e campos de pontos de jornada e viagem
  const btnChegadaGaragem = document.getElementById('btnChegadaGaragem');
  const inputChegadaGaragem = document.getElementById('inputChegadaGaragem');
  const btnChegadaPonto1 = document.getElementById('btnChegadaPonto1');
  const inputChegadaPonto1 = document.getElementById('inputChegadaPonto1');

  const btnChegadaCarro = document.getElementById('btnChegadaCarro');
  const inputChegadaCarro = document.getElementById('inputChegadaCarro');
  const btnHoraVinculacao = document.getElementById('btnHoraVinculacao');
  const inputHoraVinculacao = document.getElementById('inputHoraVinculacao');

  const btnCarroViagem = document.getElementById('btnCarroViagem');
  const inputCarroViagem = document.getElementById('inputCarroViagem');

  const btnRoletas = document.getElementById('btnRoletas');
  const inputRoletas = document.getElementById('inputRoletas');
  const btnChegadaPonto2 = document.getElementById('btnChegadaPonto2');
  const inputChegadaPonto2 = document.getElementById('inputChegadaPonto2');
  const btnFiscalizacao1 = document.getElementById('btnFiscalizacao1');
  const inputFiscalizacao1 = document.getElementById('inputFiscalizacao1');
  const btnSaidaPonto = document.getElementById('btnSaidaPonto');
  const inputSaidaPonto = document.getElementById('inputSaidaPonto');
  const btnChegadaPlaca = document.getElementById('btnChegadaPlaca');
  const inputChegadaPlaca = document.getElementById('inputChegadaPlaca');
  const btnFiscalizacao2 = document.getElementById('btnFiscalizacao2');
  const inputFiscalizacao2 = document.getElementById('inputFiscalizacao2');
  const btnSaidaPlaca = document.getElementById('btnSaidaPlaca');
  const inputSaidaPlaca = document.getElementById('inputSaidaPlaca');

  // Campos de Roletas Totais (Carro, Roleta Inicial, Roleta Final, Passageiros)
  const inputRoletaTotalCarro = document.getElementById('inputRoletaTotalCarro');
  const inputRoletaInicial = document.getElementById('inputRoletaInicial');
  const inputRoletaFinal = document.getElementById('inputRoletaFinal');
  const inputRoletaPassageiros = document.getElementById('inputRoletaPassageiros');
  const btnRoletaPassageiros = document.getElementById('btnRoletaPassageiros');

  // Campos de Validador Informações
  const inputValidadorCarro = document.getElementById('inputValidadorCarro');
  const inputValidadorGratuidade = document.getElementById('inputValidadorGratuidade');
  const inputValidadorVales = document.getElementById('inputValidadorVales');
  const inputValidadorQrCode = document.getElementById('inputValidadorQrCode');
  const inputValidadorPagantes = document.getElementById('inputValidadorPagantes');

  // Campos de Filipeta Informações
  const inputFilipetaCarro = document.getElementById('inputFilipetaCarro');
  const inputFilipetaColeta = document.getElementById('inputFilipetaColeta');
  const inputFilipetaPagantes = document.getElementById('inputFilipetaPagantes');
  const inputFilipetaGratuidades = document.getElementById('inputFilipetaGratuidades');
  const inputFilipetaVales = document.getElementById('inputFilipetaVales');
  const inputFilipetaPassageiros = document.getElementById('inputFilipetaPassageiros');

  // Elementos do Sistema de Troca de Linha/Carro & Etapas
  const btnTrocaLinhaDireto = document.getElementById('btnTrocaLinhaDireto');
  const btnTrocaCarroDireto = document.getElementById('btnTrocaCarroDireto');
  const btnTrocaAmbosDireto = document.getElementById('btnTrocaAmbosDireto');
  const btnAbrirModalTroca = document.getElementById('btnAbrirModalTroca');
  const indicadorEtapaAtual = document.getElementById('indicadorEtapaAtual');
  const textoEtapaAtiva = document.getElementById('textoEtapaAtiva');
  const badgeEtapasCount = document.getElementById('badgeEtapasCount');

  const modalTroca = document.getElementById('modalTroca');
  const btnFecharModalTroca = document.getElementById('btnFecharModalTroca');
  const btnCancelarTroca = document.getElementById('btnCancelarTroca');
  const btnConfirmarTroca = document.getElementById('btnConfirmarTroca');

  const tabTrocaLinha = document.getElementById('tabTrocaLinha');
  const tabTrocaCarro = document.getElementById('tabTrocaCarro');
  const tabTrocaAmbos = document.getElementById('tabTrocaAmbos');

  const painelTrocaLinha = document.getElementById('painelTrocaLinha');
  const painelTrocaCarro = document.getElementById('painelTrocaCarro');
  const painelTrocaAmbos = document.getElementById('painelTrocaAmbos');

  const lblCarroAtualLinha = document.getElementById('lblCarroAtualLinha');
  const inputTrocaNovaLinha = document.getElementById('inputTrocaNovaLinha');
  const feedbackTrocaLinha = document.getElementById('feedbackTrocaLinha');

  const lblLinhaAtualCarro = document.getElementById('lblLinhaAtualCarro');
  const lblCarroFechamento = document.getElementById('lblCarroFechamento');
  const inputTrocaKmFinalPainelCarroAtual = document.getElementById('inputTrocaKmFinalPainelCarroAtual');
  const inputTrocaKmFinalTacoCarroAtual = document.getElementById('inputTrocaKmFinalTacoCarroAtual');
  const inputTrocaNovoCarro = document.getElementById('inputTrocaNovoCarro');
  const feedbackTrocaCarro = document.getElementById('feedbackTrocaCarro');
  const inputTrocaKmInicialPainelNovoCarro = document.getElementById('inputTrocaKmInicialPainelNovoCarro');
  const inputTrocaKmInicialTacoNovoCarro = document.getElementById('inputTrocaKmInicialTacoNovoCarro');

  const inputTrocaAmbosNovaLinha = document.getElementById('inputTrocaAmbosNovaLinha');
  const feedbackTrocaAmbosLinha = document.getElementById('feedbackTrocaAmbosLinha');
  const lblCarroFechamentoAmbos = document.getElementById('lblCarroFechamentoAmbos');
  const inputTrocaAmbosKmFinalPainelCarroAtual = document.getElementById('inputTrocaAmbosKmFinalPainelCarroAtual');
  const inputTrocaAmbosKmFinalTacoCarroAtual = document.getElementById('inputTrocaAmbosKmFinalTacoCarroAtual');
  const inputTrocaAmbosNovoCarro = document.getElementById('inputTrocaAmbosNovoCarro');
  const feedbackTrocaAmbosCarro = document.getElementById('feedbackTrocaAmbosCarro');
  const inputTrocaAmbosKmInicialPainelNovoCarro = document.getElementById('inputTrocaAmbosKmInicialPainelNovoCarro');
  const inputTrocaAmbosKmInicialTacoNovoCarro = document.getElementById('inputTrocaAmbosKmInicialTacoNovoCarro');
  const painelEtapasSalvasEmAndamento = document.getElementById('painelEtapasSalvasEmAndamento');
  const listaLinhasAnteriores = document.getElementById('listaLinhasAnteriores');
  const listaCarrosAnteriores = document.getElementById('listaCarrosAnteriores');

  let etapasJornadaAtiva = [];
  let tipoTrocaAtual = 'linha';
  let jornadaEmEdicaoIndex = null;

  if (!dataInput || !semanaInput) return;

  const JORNADA_KEY = 'controle_motorista_jornada';
  const JORNADA_RASCUNHO_KEY = 'controle_motorista_jornada_rascunho';
  const ESCALA_KEY = 'controle_motorista_escala';
  const diasSemana = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  const containerRoletasTotaisLinhas = document.getElementById('containerRoletasTotaisLinhas');
  const containerValidadorLinhas = document.getElementById('containerValidadorLinhas');
  const containerFilipetaLinhas = document.getElementById('containerFilipetaLinhas');

  let dadosValidadorPorCarro = {};
  let dadosFilipetaPorCarro = {};

  function obterListaCarrosJornada() {
    const lista = [];
    if (Array.isArray(etapasJornadaAtiva)) {
      etapasJornadaAtiva.forEach(etapa => {
        const c = (etapa.carroNumero || '').trim();
        if (c && !lista.includes(c)) lista.push(c);
      });
    }
    const carroAtual = (carroNumInput && carroNumInput.value.trim()) || '';
    if (carroAtual && !lista.includes(carroAtual)) {
      lista.push(carroAtual);
    }
    if (containerLinhasRoletas) {
      const rows = containerLinhasRoletas.querySelectorAll('.form-jornada-row--viagem-dados');
      rows.forEach(r => {
        const cInp = r.querySelector('.col-jornada-carro-viagem');
        const c = cInp ? cInp.value.trim() : '';
        if (c && !lista.includes(c)) lista.push(c);
      });
    }
    return lista.length > 0 ? lista : (carroAtual ? [carroAtual] : ['']);
  }

  function coletarValoresCamposMultiCarro() {
    if (containerValidadorLinhas) {
      const rowsVal = containerValidadorLinhas.querySelectorAll('.form-jornada-row--validador');
      rowsVal.forEach(r => {
        const carro = r.getAttribute('data-carro');
        if (carro) {
          const gratInp = r.querySelector('.validador-gratuidade-item');
          const valesInp = r.querySelector('.validador-vales-item');
          const qrInp = r.querySelector('.validador-qrcode-item');
          const pagInp = r.querySelector('.validador-pagantes-item');
          dadosValidadorPorCarro[carro] = {
            carro: carro,
            gratuidade: gratInp ? gratInp.value.trim() : '',
            valesTransporte: valesInp ? valesInp.value.trim() : '',
            qrCode: qrInp ? qrInp.value.trim() : '',
            pagantes: pagInp ? pagInp.value.trim() : ''
          };
        }
      });
    }

    if (containerFilipetaLinhas) {
      const rowsFil = containerFilipetaLinhas.querySelectorAll('.form-jornada-row--filipeta');
      rowsFil.forEach(r => {
        const carro = r.getAttribute('data-carro');
        if (carro) {
          const colInp = r.querySelector('.filipeta-coleta-item');
          const pagInp = r.querySelector('.filipeta-pagantes-item');
          const gratInp = r.querySelector('.filipeta-gratuidades-item');
          const valesInp = r.querySelector('.filipeta-vales-item');
          const passInp = r.querySelector('.filipeta-passageiros-item');
          dadosFilipetaPorCarro[carro] = {
            carro: carro,
            coleta: colInp ? colInp.value.trim() : '',
            pagantes: pagInp ? pagInp.value.trim() : '',
            gratuidades: gratInp ? gratInp.value.trim() : '',
            valesTransporte: valesInp ? valesInp.value.trim() : '',
            passageiros: passInp ? passInp.value.trim() : ''
          };
        }
      });
    }
  }

  // Cálculo automático do campo Pagantes no Validador:
  // (passageiros - gratuidade - vale transportes - qrcode = Pagantes)
  function calcularTodosValidadorPagantes() {
    if (containerValidadorLinhas) {
      const rowsVal = containerValidadorLinhas.querySelectorAll('.form-jornada-row--validador');
      rowsVal.forEach(r => {
        const c = r.getAttribute('data-carro');
        let passVal = 0;
        let temPassageiros = false;

        // 1. Tenta buscar no container de roletas para o carro específico
        if (containerRoletasTotaisLinhas) {
          const rowRoleta = c 
            ? containerRoletasTotaisLinhas.querySelector(`.form-jornada-row--roletas-total[data-carro="${c}"]`)
            : containerRoletasTotaisLinhas.querySelector('.form-jornada-row--roletas-total');
          if (rowRoleta) {
            const inpPass = rowRoleta.querySelector('.input-roleta-pass-item');
            if (inpPass && inpPass.value !== '' && inpPass.value !== '--') {
              passVal = parseFloat(String(inpPass.value).replace(/\D/g, '')) || 0;
              temPassageiros = true;
            }
          }
        }

        // 2. Se não encontrou, busca no campo geral inputRoletaPassageiros
        if (!temPassageiros && inputRoletaPassageiros && inputRoletaPassageiros.value !== '' && inputRoletaPassageiros.value !== '--') {
          passVal = parseFloat(String(inputRoletaPassageiros.value).replace(/\D/g, '')) || 0;
          temPassageiros = true;
        }

        const gratInp = r.querySelector('.validador-gratuidade-item');
        const valesInp = r.querySelector('.validador-vales-item');
        const qrInp = r.querySelector('.validador-qrcode-item');
        const pagInp = r.querySelector('.validador-pagantes-item');

        if (pagInp) {
          if (temPassageiros) {
            const grat = parseFloat(String(gratInp?.value || '').replace(/\D/g, '')) || 0;
            const vales = parseFloat(String(valesInp?.value || '').replace(/\D/g, '')) || 0;
            const qr = parseFloat(String(qrInp?.value || '').replace(/\D/g, '')) || 0;
            const pagantes = passVal - grat - vales - qr;
            pagInp.value = pagantes >= 0 ? pagantes : 0;
          } else {
            pagInp.value = '';
          }
        }
      });
    } else if (inputValidadorPagantes) {
      let passVal = 0;
      let temPassageiros = false;
      if (inputRoletaPassageiros && inputRoletaPassageiros.value !== '' && inputRoletaPassageiros.value !== '--') {
        passVal = parseFloat(String(inputRoletaPassageiros.value).replace(/\D/g, '')) || 0;
        temPassageiros = true;
      }
      if (temPassageiros) {
        const grat = parseFloat(String(inputValidadorGratuidade?.value || '').replace(/\D/g, '')) || 0;
        const vales = parseFloat(String(inputValidadorVales?.value || '').replace(/\D/g, '')) || 0;
        const qr = parseFloat(String(inputValidadorQrCode?.value || '').replace(/\D/g, '')) || 0;
        const pagantes = passVal - grat - vales - qr;
        inputValidadorPagantes.value = pagantes >= 0 ? pagantes : 0;
      } else {
        inputValidadorPagantes.value = '';
      }
    }
  }

  function renderizarSecoesMultiCarro() {
    coletarValoresCamposMultiCarro();
    const carrosCronologicos = obterListaCarrosJornada();
    // Exibe sempre com o ÚLTIMO carro adicionado EM CIMA (ordem decrescente)
    const carrosOrdemDecrescente = [...carrosCronologicos].reverse();

    // 1. Roletas Totais
    if (containerRoletasTotaisLinhas) {
      containerRoletasTotaisLinhas.innerHTML = carrosOrdemDecrescente.map((c, idx) => {
        const isTop = idx === 0;
        const idCarroAttr = isTop ? 'id="inputRoletaTotalCarro"' : `id="inputRoletaTotalCarro_${c}"`;
        const idIniAttr = isTop ? 'id="inputRoletaInicial"' : `id="inputRoletaInicial_${c}"`;
        const idFimAttr = isTop ? 'id="inputRoletaFinal"' : `id="inputRoletaFinal_${c}"`;
        const idPassAttr = isTop ? 'id="inputRoletaPassageiros"' : `id="inputRoletaPassageiros_${c}"`;
        return `
          <div class="form-escala-row form-jornada-row--roletas-total" data-carro="${c}">
            <input type="text" ${idCarroAttr} class="input-escala col-jornada-carro-viagem" value="${c}" placeholder="Carro" readonly />
            <input type="text" ${idIniAttr} class="input-escala input-jornada-info input-roleta-ini-item" data-carro="${c}" placeholder="Roleta Inicial" readonly />
            <input type="text" ${idFimAttr} class="input-escala input-jornada-info input-roleta-fim-item" data-carro="${c}" placeholder="Roleta Final" readonly />
            <input type="text" ${idPassAttr} class="input-escala input-jornada-info input-roleta-pass-item" data-carro="${c}" placeholder="Passageiros" readonly />
          </div>
        `;
      }).join('');
    }

    // 2. Validador Informações
    if (containerValidadorLinhas) {
      containerValidadorLinhas.innerHTML = carrosOrdemDecrescente.map((c, idx) => {
        const isTop = idx === 0;
        const idCarroAttr = isTop ? 'id="inputValidadorCarro"' : `id="inputValidadorCarro_${c}"`;
        const idGratAttr = isTop ? 'id="inputValidadorGratuidade"' : `id="inputValidadorGratuidade_${c}"`;
        const idValesAttr = isTop ? 'id="inputValidadorVales"' : `id="inputValidadorVales_${c}"`;
        const idQrAttr = isTop ? 'id="inputValidadorQrCode"' : `id="inputValidadorQrCode_${c}"`;
        const idPagAttr = isTop ? 'id="inputValidadorPagantes"' : `id="inputValidadorPagantes_${c}"`;
        const val = dadosValidadorPorCarro[c] || {};
        return `
          <div class="form-escala-row form-jornada-row--validador" data-carro="${c}">
            <input type="text" ${idCarroAttr} class="input-escala col-jornada-carro-viagem" value="${c}" placeholder="Carro" readonly />
            <input type="text" ${idGratAttr} class="input-escala input-jornada-info validador-gratuidade-item" data-carro="${c}" value="${val.gratuidade || ''}" placeholder="Gratuidade" inputmode="numeric" />
            <input type="text" ${idValesAttr} class="input-escala input-jornada-info validador-vales-item" data-carro="${c}" value="${val.valesTransporte || ''}" placeholder="Vales Transp." inputmode="numeric" />
            <input type="text" ${idQrAttr} class="input-escala input-jornada-info validador-qrcode-item" data-carro="${c}" value="${val.qrCode || ''}" placeholder="QrCode" inputmode="numeric" />
            <input type="text" ${idPagAttr} class="input-escala input-jornada-info validador-pagantes-item" data-carro="${c}" value="${val.pagantes !== undefined ? val.pagantes : ''}" placeholder="Pagantes" readonly />
          </div>
        `;
      }).join('');

      containerValidadorLinhas.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
          calcularTodosValidadorPagantes();
          coletarValoresCamposMultiCarro();
          salvarRascunhoJornada();
        });
      });

      calcularTodosValidadorPagantes();
    }

    // 3. Filipeta Informações
    if (containerFilipetaLinhas) {
      containerFilipetaLinhas.innerHTML = carrosOrdemDecrescente.map((c, idx) => {
        const isTop = idx === 0;
        const idCarroAttr = isTop ? 'id="inputFilipetaCarro"' : `id="inputFilipetaCarro_${c}"`;
        const idColAttr = isTop ? 'id="inputFilipetaColeta"' : `id="inputFilipetaColeta_${c}"`;
        const idPagAttr = isTop ? 'id="inputFilipetaPagantes"' : `id="inputFilipetaPagantes_${c}"`;
        const idGratAttr = isTop ? 'id="inputFilipetaGratuidades"' : `id="inputFilipetaGratuidades_${c}"`;
        const idValesAttr = isTop ? 'id="inputFilipetaVales"' : `id="inputFilipetaVales_${c}"`;
        const idPassAttr = isTop ? 'id="inputFilipetaPassageiros"' : `id="inputFilipetaPassageiros_${c}"`;
        const fil = dadosFilipetaPorCarro[c] || {};
        return `
          <div class="form-escala-row form-jornada-row--filipeta" data-carro="${c}">
            <input type="text" ${idCarroAttr} class="input-escala col-jornada-carro-viagem" value="${c}" placeholder="Carro" readonly />
            <input type="text" ${idColAttr} class="input-escala input-jornada-info filipeta-coleta-item" data-carro="${c}" value="${fil.coleta || ''}" placeholder="N°. Coleta" inputmode="numeric" />
            <input type="text" ${idPagAttr} class="input-escala input-jornada-info filipeta-pagantes-item" data-carro="${c}" value="${fil.pagantes || ''}" placeholder="Pagantes" inputmode="numeric" />
            <input type="text" ${idGratAttr} class="input-escala input-jornada-info filipeta-gratuidades-item" data-carro="${c}" value="${fil.gratuidades || ''}" placeholder="Gratuidades" inputmode="numeric" />
            <input type="text" ${idValesAttr} class="input-escala input-jornada-info filipeta-vales-item" data-carro="${c}" value="${fil.valesTransporte || ''}" placeholder="Vales Transp." inputmode="numeric" />
            <input type="text" ${idPassAttr} class="input-escala input-jornada-info filipeta-passageiros-item" data-carro="${c}" value="${fil.passageiros || ''}" placeholder="Passageiros" inputmode="numeric" />
          </div>
        `;
      }).join('');

      containerFilipetaLinhas.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
          coletarValoresCamposMultiCarro();
          salvarRascunhoJornada();
        });
      });
    }

    atualizarRoletasTotaisAutomaticas();
  }

  /* --- Persistência localStorage --- */

  function carregarJornadas() {
    try {
      const dados = localStorage.getItem(JORNADA_KEY);
      return dados ? JSON.parse(dados) : [];
    } catch {
      return [];
    }
  }

  function salvarJornadas(lista) {
    localStorage.setItem(JORNADA_KEY, JSON.stringify(lista));
  }

  /* --- Persistência Offline do Rascunho da Jornada em Andamento --- */

  function salvarRascunhoJornada() {
    try {
      coletarValoresCamposMultiCarro();
      const sessoesAtuais = obterTodasLinhasRoletas();
      const rascunho = {
        data: dataInput ? dataInput.value : '',
        semana: semanaInput ? semanaInput.value : '',
        horaPegada: horaInput ? horaInput.value : '',
        matricula: matInput ? matInput.value : '',
        motorista: motInput ? motInput.value : '',
        linha: linhaInput ? linhaInput.value : '',
        linhaNome: linhaNomeInput ? linhaNomeInput.value : '',
        carroSigla: carroSiglaInput ? carroSiglaInput.value : '',
        carroNumero: carroNumInput ? carroNumInput.value : '',
        carroPlaca: carroPlacaInput ? carroPlacaInput.value : '',
        kmPainelInicial: kmPainelInicialInput ? kmPainelInicialInput.value : '',
        kmPainelFinal: kmPainelFinalInput ? kmPainelFinalInput.value : '',
        kmPainelRodado: kmPainelRodadoInput ? kmPainelRodadoInput.value : '',
        kmTacoInicial: kmTacoInicialInput ? kmTacoInicialInput.value : '',
        kmTacoFinal: kmTacoFinalInput ? kmTacoFinalInput.value : '',
        kmTacoRodado: kmTacoRodadoInput ? kmTacoRodadoInput.value : '',
        avarias: avariasInput ? avariasInput.value : '',
        chegadaGaragem: inputChegadaGaragem ? inputChegadaGaragem.value : '',
        chegadaPonto1: inputChegadaPonto1 ? inputChegadaPonto1.value : '',
        chegadaCarro: inputChegadaCarro ? inputChegadaCarro.value : '',
        horaVinculacao: inputHoraVinculacao ? inputHoraVinculacao.value : '',
        roletaInicial: inputRoletaInicial ? inputRoletaInicial.value : '',
        roletaFinal: inputRoletaFinal ? inputRoletaFinal.value : '',
        roletaPassageiros: inputRoletaPassageiros ? inputRoletaPassageiros.value : '',
        validador: {
          carro: inputValidadorCarro ? inputValidadorCarro.value : '',
          gratuidade: inputValidadorGratuidade ? inputValidadorGratuidade.value : '',
          valesTransporte: inputValidadorVales ? inputValidadorVales.value : '',
          qrCode: inputValidadorQrCode ? inputValidadorQrCode.value : '',
          pagantes: inputValidadorPagantes ? inputValidadorPagantes.value : ''
        },
        filipeta: {
          carro: inputFilipetaCarro ? inputFilipetaCarro.value : '',
          coleta: inputFilipetaColeta ? inputFilipetaColeta.value : '',
          pagantes: inputFilipetaPagantes ? inputFilipetaPagantes.value : '',
          gratuidades: inputFilipetaGratuidades ? inputFilipetaGratuidades.value : '',
          valesTransporte: inputFilipetaVales ? inputFilipetaVales.value : '',
          passageiros: inputFilipetaPassageiros ? inputFilipetaPassageiros.value : ''
        },
        dadosValidadorPorCarro: dadosValidadorPorCarro,
        dadosFilipetaPorCarro: dadosFilipetaPorCarro,
        sessoes: sessoesAtuais,
        etapasJornadaAtiva: etapasJornadaAtiva || []
      };

      localStorage.setItem(JORNADA_RASCUNHO_KEY, JSON.stringify(rascunho));
    } catch (e) {
      console.warn('[Jornada] Erro ao salvar rascunho offline:', e);
    }
  }

  function limparRascunhoJornada() {
    try {
      localStorage.removeItem(JORNADA_RASCUNHO_KEY);
    } catch (e) {
      console.warn('[Jornada] Erro ao limpar rascunho:', e);
    }
  }

  function restaurarRascunhoJornada() {
    try {
      const salvo = localStorage.getItem(JORNADA_RASCUNHO_KEY);
      if (!salvo) return;
      const rascunho = JSON.parse(salvo);
      if (!rascunho || typeof rascunho !== 'object') return;

      if (dataInput && rascunho.data) dataInput.value = rascunho.data;
      if (semanaInput && rascunho.semana) semanaInput.value = rascunho.semana;
      if (horaInput && rascunho.horaPegada) {
        horaInput.value = rascunho.horaPegada;
        horaInput.readOnly = true;
      }
      if (matInput && rascunho.matricula) {
        matInput.value = rascunho.matricula;
        matInput.readOnly = true;
      }
      if (motInput && rascunho.motorista) {
        motInput.value = rascunho.motorista;
        motInput.readOnly = true;
      }
      if (linhaInput && rascunho.linha) {
        linhaInput.value = rascunho.linha;
        linhaInput.readOnly = true;
      }
      if (linhaNomeInput && rascunho.linhaNome) linhaNomeInput.value = rascunho.linhaNome;

      if (carroNumInput && rascunho.carroNumero) carroNumInput.value = rascunho.carroNumero;
      if (carroSiglaInput && rascunho.carroSigla) {
        carroSiglaInput.value = rascunho.carroSigla;
        carroSiglaInput.readOnly = true;
      }
      if (carroPlacaInput && rascunho.carroPlaca) {
        carroPlacaInput.value = rascunho.carroPlaca;
        carroPlacaInput.readOnly = true;
      }

      if (kmPainelInicialInput && rascunho.kmPainelInicial) kmPainelInicialInput.value = rascunho.kmPainelInicial;
      if (kmPainelFinalInput && rascunho.kmPainelFinal) kmPainelFinalInput.value = rascunho.kmPainelFinal;
      if (kmPainelRodadoInput && rascunho.kmPainelRodado) kmPainelRodadoInput.value = rascunho.kmPainelRodado;

      if (kmTacoInicialInput && rascunho.kmTacoInicial) kmTacoInicialInput.value = rascunho.kmTacoInicial;
      if (kmTacoFinalInput && rascunho.kmTacoFinal) kmTacoFinalInput.value = rascunho.kmTacoFinal;
      if (kmTacoRodadoInput && rascunho.kmTacoRodado) kmTacoRodadoInput.value = rascunho.kmTacoRodado;

      if (avariasInput && rascunho.avarias) avariasInput.value = rascunho.avarias;

      if (inputChegadaGaragem && rascunho.chegadaGaragem) {
        inputChegadaGaragem.value = rascunho.chegadaGaragem;
        inputChegadaGaragem.readOnly = true;
      }
      if (inputChegadaPonto1 && rascunho.chegadaPonto1) {
        inputChegadaPonto1.value = rascunho.chegadaPonto1;
        inputChegadaPonto1.readOnly = true;
      }
      if (inputChegadaCarro && rascunho.chegadaCarro) {
        inputChegadaCarro.value = rascunho.chegadaCarro;
        inputChegadaCarro.readOnly = true;
      }
      if (inputHoraVinculacao && rascunho.horaVinculacao) {
        inputHoraVinculacao.value = rascunho.horaVinculacao;
        inputHoraVinculacao.readOnly = true;
      }

      // Validador
      if (rascunho.validador) {
        if (inputValidadorCarro && rascunho.validador.carro) inputValidadorCarro.value = rascunho.validador.carro;
        if (inputValidadorGratuidade && rascunho.validador.gratuidade) inputValidadorGratuidade.value = rascunho.validador.gratuidade;
        if (inputValidadorVales && rascunho.validador.valesTransporte) inputValidadorVales.value = rascunho.validador.valesTransporte;
        if (inputValidadorQrCode && rascunho.validador.qrCode) inputValidadorQrCode.value = rascunho.validador.qrCode;
        if (inputValidadorPagantes && rascunho.validador.pagantes !== undefined) inputValidadorPagantes.value = rascunho.validador.pagantes;
        calcularTodosValidadorPagantes();
      }

      // Filipeta
      if (rascunho.filipeta) {
        if (inputFilipetaCarro && rascunho.filipeta.carro) inputFilipetaCarro.value = rascunho.filipeta.carro;
        if (inputFilipetaColeta && rascunho.filipeta.coleta) inputFilipetaColeta.value = rascunho.filipeta.coleta;
        if (inputFilipetaPagantes && rascunho.filipeta.pagantes) inputFilipetaPagantes.value = rascunho.filipeta.pagantes;
        if (inputFilipetaGratuidades && rascunho.filipeta.gratuidades) inputFilipetaGratuidades.value = rascunho.filipeta.gratuidades;
        if (inputFilipetaVales && rascunho.filipeta.valesTransporte) inputFilipetaVales.value = rascunho.filipeta.valesTransporte;
        if (inputFilipetaPassageiros && rascunho.filipeta.passageiros) inputFilipetaPassageiros.value = rascunho.filipeta.passageiros;
      }

      // Etapas em andamento
      if (Array.isArray(rascunho.etapasJornadaAtiva) && rascunho.etapasJornadaAtiva.length > 0) {
        etapasJornadaAtiva = rascunho.etapasJornadaAtiva;
        if (indicadorEtapaAtual) indicadorEtapaAtual.style.display = 'none';
        renderizarEtapasEmAndamento();
      }

      // Tabela de viagens (sessões dinâmicas)
      if (containerLinhasRoletas && Array.isArray(rascunho.sessoes) && rascunho.sessoes.length > 0) {
        containerLinhasRoletas.innerHTML = '';
        totalLinhasRoletas = 0;
        rascunho.sessoes.forEach(s => {
          criarNovaLinhaRoletas(s);
        });
      }

      // Sincroniza campos de Carro apenas nas linhas que estiverem vazias
      if (carroNumInput && carroNumInput.value.trim()) {
        document.querySelectorAll('.col-jornada-carro-viagem').forEach(inp => {
          if (!inp.value.trim()) inp.value = carroNumInput.value.trim();
        });
      }

      if (rascunho.dadosValidadorPorCarro) {
        dadosValidadorPorCarro = rascunho.dadosValidadorPorCarro;
      }
      if (rascunho.dadosFilipetaPorCarro) {
        dadosFilipetaPorCarro = rascunho.dadosFilipetaPorCarro;
      }

      if (inputRoletaInicial && rascunho.roletaInicial) inputRoletaInicial.value = rascunho.roletaInicial;
      if (inputRoletaFinal && rascunho.roletaFinal) inputRoletaFinal.value = rascunho.roletaFinal;
      if (inputRoletaPassageiros && rascunho.roletaPassageiros) inputRoletaPassageiros.value = rascunho.roletaPassageiros;

      renderizarSecoesMultiCarro();
      atualizarRoletasTotaisAutomaticas();
    } catch (e) {
      console.warn('[Jornada] Erro ao restaurar rascunho:', e);
    }
  }

  /**
   * Preenche todos os campos do formulário da jornada com os dados de um card existente,
   * permitindo ao usuário visualizar o que já foi preenchido e completar os campos vazios ou em branco.
   */
  function preencherFormularioComJornada(jornada, index) {
    if (!jornada) return;
    jornadaEmEdicaoIndex = (index !== undefined && index !== null) ? Number(index) : null;

    if (dataInput && jornada.data) dataInput.value = jornada.data;
    if (semanaInput && (jornada.semana || jornada.diaSemana)) semanaInput.value = jornada.semana || jornada.diaSemana;
    if (horaInput) {
      horaInput.value = jornada.horaPegada || '';
      horaInput.readOnly = true;
    }
    if (matInput) {
      matInput.value = jornada.matricula || '';
      matInput.readOnly = true;
    }
    if (motInput) {
      motInput.value = jornada.motorista || '';
      motInput.readOnly = true;
    }
    if (linhaInput) {
      linhaInput.value = jornada.linha || '';
      linhaInput.readOnly = true;
    }
    if (linhaNomeInput) {
      linhaNomeInput.value = jornada.linhaNome || '';
      linhaNomeInput.readOnly = true;
    }

    if (carroNumInput) carroNumInput.value = jornada.carroNumero || '';
    if (carroSiglaInput) {
      carroSiglaInput.value = jornada.carroSigla || '';
      carroSiglaInput.readOnly = true;
    }
    if (carroPlacaInput) {
      carroPlacaInput.value = jornada.carroPlaca || '';
      carroPlacaInput.readOnly = true;
    }

    if (kmPainelInicialInput) kmPainelInicialInput.value = jornada.kmPainelInicial || '';
    if (kmPainelFinalInput) kmPainelFinalInput.value = jornada.kmPainelFinal || '';
    if (kmPainelRodadoInput) kmPainelRodadoInput.value = jornada.kmPainelRodado || '';

    if (kmTacoInicialInput) kmTacoInicialInput.value = jornada.kmTacoInicial || '';
    if (kmTacoFinalInput) kmTacoFinalInput.value = jornada.kmTacoFinal || '';
    if (kmTacoRodadoInput) kmTacoRodadoInput.value = jornada.kmTacoRodado || '';

    if (avariasInput) avariasInput.value = jornada.avarias || '';

    if (inputChegadaGaragem) inputChegadaGaragem.value = jornada.chegadaGaragem || '';
    if (inputChegadaPonto1) inputChegadaPonto1.value = jornada.chegadaPonto1 || '';
    if (inputChegadaCarro) inputChegadaCarro.value = jornada.chegadaCarro || '';
    if (inputHoraVinculacao) inputHoraVinculacao.value = jornada.horaVinculacao || '';

    if (inputRoletas) inputRoletas.value = jornada.roletas || '';
    if (inputChegadaPonto2) inputChegadaPonto2.value = jornada.chegadaPonto2 || '';
    if (inputFiscalizacao1) inputFiscalizacao1.value = jornada.fiscalizacao1 || '';
    if (inputSaidaPonto) inputSaidaPonto.value = jornada.saidaPonto || '';
    if (inputChegadaPlaca) inputChegadaPlaca.value = jornada.chegadaPlaca || '';
    if (inputFiscalizacao2) inputFiscalizacao2.value = jornada.fiscalizacao2 || '';
    if (inputSaidaPlaca) inputSaidaPlaca.value = jornada.saidaPlaca || '';

    if (inputRoletaInicial) inputRoletaInicial.value = jornada.roletaInicial || '';
    if (inputRoletaFinal) inputRoletaFinal.value = jornada.roletaFinal || '';
    if (inputRoletaPassageiros) inputRoletaPassageiros.value = jornada.roletaPassageiros || '';

    // Sessoes dinâmicas de viagem
    if (containerLinhasRoletas) {
      containerLinhasRoletas.innerHTML = '';
      totalLinhasRoletas = 0;
      if (Array.isArray(jornada.sessoes) && jornada.sessoes.length > 0) {
        jornada.sessoes.forEach(s => criarNovaLinhaRoletas(s));
      }
    }

    // Validador e Filipeta por carro
    if (jornada.validador) {
      const c = jornada.validador.carro || jornada.carroNumero || '';
      if (c) dadosValidadorPorCarro[c] = jornada.validador;
      if (inputValidadorCarro) inputValidadorCarro.value = c;
      if (inputValidadorGratuidade) inputValidadorGratuidade.value = jornada.validador.gratuidade || '';
      if (inputValidadorVales) inputValidadorVales.value = jornada.validador.valesTransporte || '';
      if (inputValidadorQrCode) inputValidadorQrCode.value = jornada.validador.qrCode || '';
      if (inputValidadorPagantes) inputValidadorPagantes.value = (jornada.validador && jornada.validador.pagantes !== undefined) ? jornada.validador.pagantes : '';
    }
    if (jornada.filipeta) {
      const c = jornada.filipeta.carro || jornada.carroNumero || '';
      if (c) dadosFilipetaPorCarro[c] = jornada.filipeta;
      if (inputFilipetaCarro) inputFilipetaCarro.value = c;
      if (inputFilipetaColeta) inputFilipetaColeta.value = jornada.filipeta.coleta || '';
      if (inputFilipetaPagantes) inputFilipetaPagantes.value = jornada.filipeta.pagantes || '';
      if (inputFilipetaGratuidades) inputFilipetaGratuidades.value = jornada.filipeta.gratuidades || '';
      if (inputFilipetaVales) inputFilipetaVales.value = jornada.filipeta.valesTransporte || '';
      if (inputFilipetaPassageiros) inputFilipetaPassageiros.value = jornada.filipeta.passageiros || '';
    }

    calcularTodosValidadorPagantes();

    // Etapas anteriores em andamento
    if (Array.isArray(jornada.etapas) && jornada.etapas.length > 1) {
      etapasJornadaAtiva = jornada.etapas.slice(0, -1);
      renderizarEtapasEmAndamento();
    } else {
      etapasJornadaAtiva = [];
      renderizarEtapasEmAndamento();
    }

    // Aplica destaque visual no card sendo editado/atualizado
    document.querySelectorAll('.item-jornada-card').forEach((el, idx) => {
      if (idx === jornadaEmEdicaoIndex) {
        el.classList.add('item-jornada-card--editando');
      } else {
        el.classList.remove('item-jornada-card--editando');
      }
    });

    renderizarSecoesMultiCarro();
    atualizarRoletasTotaisAutomaticas();
    salvarRascunhoJornada();
  }

  /**
   * Reseta o formulário após salvar ou limpar, garantindo readonly correto.
   */
  function resetarFormularioJornada() {
    jornadaEmEdicaoIndex = null;
    etapasJornadaAtiva = [];
    renderizarEtapasEmAndamento();
    if (indicadorEtapaAtual) indicadorEtapaAtual.style.display = 'none';

    if (dataInput) dataInput.value = '';
    if (semanaInput) semanaInput.value = '';
    if (horaInput) { horaInput.value = ''; horaInput.readOnly = true; }
    if (matInput) { matInput.value = ''; matInput.readOnly = true; }
    if (motInput) { motInput.value = ''; motInput.readOnly = true; }
    if (linhaInput) { linhaInput.value = ''; linhaInput.readOnly = true; }
    if (linhaNomeInput) { linhaNomeInput.value = ''; linhaNomeInput.readOnly = true; }
    if (carroSiglaInput) { carroSiglaInput.value = ''; carroSiglaInput.readOnly = true; }
    if (carroNumInput) carroNumInput.value = '';
    if (carroPlacaInput) { carroPlacaInput.value = ''; carroPlacaInput.readOnly = true; }
    if (kmPainelInicialInput) kmPainelInicialInput.value = '';
    if (kmPainelFinalInput) kmPainelFinalInput.value = '';
    if (kmPainelRodadoInput) kmPainelRodadoInput.value = '';
    if (kmTacoInicialInput) kmTacoInicialInput.value = '';
    if (kmTacoFinalInput) kmTacoFinalInput.value = '';
    if (kmTacoRodadoInput) kmTacoRodadoInput.value = '';
    if (avariasInput) avariasInput.value = '';

    if (inputChegadaGaragem) { inputChegadaGaragem.value = ''; inputChegadaGaragem.readOnly = true; }
    if (inputChegadaPonto1) { inputChegadaPonto1.value = ''; inputChegadaPonto1.readOnly = true; }
    if (inputChegadaCarro) { inputChegadaCarro.value = ''; inputChegadaCarro.readOnly = true; }
    if (inputHoraVinculacao) { inputHoraVinculacao.value = ''; inputHoraVinculacao.readOnly = true; }
    if (inputRoletas) inputRoletas.value = '';
    if (inputChegadaPonto2) { inputChegadaPonto2.value = ''; inputChegadaPonto2.readOnly = true; }
    if (inputFiscalizacao1) { inputFiscalizacao1.value = ''; inputFiscalizacao1.readOnly = true; }
    if (inputSaidaPonto) { inputSaidaPonto.value = ''; inputSaidaPonto.readOnly = true; }
    if (inputChegadaPlaca) { inputChegadaPlaca.value = ''; inputChegadaPlaca.readOnly = true; }
    if (inputFiscalizacao2) { inputFiscalizacao2.value = ''; inputFiscalizacao2.readOnly = true; }
    if (inputSaidaPlaca) { inputSaidaPlaca.value = ''; inputSaidaPlaca.readOnly = true; }

    if (inputRoletaInicial) inputRoletaInicial.value = '';
    if (inputRoletaFinal) inputRoletaFinal.value = '';
    if (inputRoletaPassageiros) inputRoletaPassageiros.value = '';
    if (inputValidadorPagantes) inputValidadorPagantes.value = '';

    dadosValidadorPorCarro = {};
    dadosFilipetaPorCarro = {};

    if (containerLinhasRoletas) {
      containerLinhasRoletas.innerHTML = '';
      totalLinhasRoletas = 0;
    }

    document.querySelectorAll('.item-jornada-card--editando').forEach(el => el.classList.remove('item-jornada-card--editando'));

    renderizarSecoesMultiCarro();
    atualizarRoletasTotaisAutomaticas();
  }

  /* --- Helper: Captura todos os dados da etapa atualmente no formulário --- */

  function capturarDadosEtapaAtual(tipoTroca, horaTroca) {
    coletarValoresCamposMultiCarro();
    const sessoesTabela = obterTodasLinhasRoletas();
    const cNum = carroNumInput ? carroNumInput.value.trim().toUpperCase() : '';

    let cRoletaIni = '';
    let cRoletaFim = '';
    let cRoletaPass = '';
    if (containerRoletasTotaisLinhas) {
      const rowCarro = containerRoletasTotaisLinhas.querySelector(`[data-carro="${cNum}"]`);
      if (rowCarro) {
        const iniEl = rowCarro.querySelector('.input-roleta-ini-item');
        const fimEl = rowCarro.querySelector('.input-roleta-fim-item');
        const passEl = rowCarro.querySelector('.input-roleta-pass-item');
        if (iniEl) cRoletaIni = iniEl.value.trim();
        if (fimEl) cRoletaFim = fimEl.value.trim();
        if (passEl) cRoletaPass = passEl.value.trim();
      }
    }
    if (!cRoletaIni && inputRoletaInicial) cRoletaIni = inputRoletaInicial.value.trim();
    if (!cRoletaFim && inputRoletaFinal) cRoletaFim = inputRoletaFinal.value.trim();
    if (!cRoletaPass && inputRoletaPassageiros) cRoletaPass = inputRoletaPassageiros.value.trim();

    const valDado = dadosValidadorPorCarro[cNum] || {
      carro: cNum,
      gratuidade: inputValidadorGratuidade ? inputValidadorGratuidade.value.trim() : '',
      valesTransporte: inputValidadorVales ? inputValidadorVales.value.trim() : '',
      qrCode: inputValidadorQrCode ? inputValidadorQrCode.value.trim() : '',
      pagantes: inputValidadorPagantes ? inputValidadorPagantes.value.trim() : ''
    };

    const filDado = dadosFilipetaPorCarro[cNum] || {
      carro: cNum,
      coleta: inputFilipetaColeta ? inputFilipetaColeta.value.trim() : '',
      pagantes: inputFilipetaPagantes ? inputFilipetaPagantes.value.trim() : '',
      gratuidades: inputFilipetaGratuidades ? inputFilipetaGratuidades.value.trim() : '',
      valesTransporte: inputFilipetaVales ? inputFilipetaVales.value.trim() : '',
      passageiros: inputFilipetaPassageiros ? inputFilipetaPassageiros.value.trim() : ''
    };

    return {
      numeroEtapa: etapasJornadaAtiva.length + 1,
      tipoTroca: tipoTroca || 'inicio',
      horaTroca: horaTroca || (new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })),
      linha: linhaInput ? linhaInput.value.trim() : '',
      linhaNome: linhaNomeInput ? linhaNomeInput.value.trim() : '',
      carroSigla: carroSiglaInput ? carroSiglaInput.value.trim().toUpperCase() : '',
      carroNumero: cNum,
      carroPlaca: carroPlacaInput ? carroPlacaInput.value.trim().toUpperCase() : '',
      kmPainelInicial: kmPainelInicialInput ? kmPainelInicialInput.value.trim() : '',
      kmPainelFinal: kmPainelFinalInput ? kmPainelFinalInput.value.trim() : '',
      kmPainelRodado: kmPainelRodadoInput ? kmPainelRodadoInput.value.trim() : '',
      kmTacoInicial: kmTacoInicialInput ? kmTacoInicialInput.value.trim() : '',
      kmTacoFinal: kmTacoFinalInput ? kmTacoFinalInput.value.trim() : '',
      kmTacoRodado: kmTacoRodadoInput ? kmTacoRodadoInput.value.trim() : '',
      avarias: avariasInput ? avariasInput.value.trim() : '',
      chegadaGaragem: inputChegadaGaragem ? inputChegadaGaragem.value.trim() : '',
      chegadaPonto1: inputChegadaPonto1 ? inputChegadaPonto1.value.trim() : '',
      chegadaCarro: inputChegadaCarro ? inputChegadaCarro.value.trim() : '',
      horaVinculacao: inputHoraVinculacao ? inputHoraVinculacao.value.trim() : '',
      roletas: (sessoesTabela[0] && sessoesTabela[0].roletas) || (inputRoletas ? inputRoletas.value.trim() : ''),
      chegadaPonto2: (sessoesTabela[0] && sessoesTabela[0].chegadaPonto2) || (inputChegadaPonto2 ? inputChegadaPonto2.value.trim() : ''),
      fiscalizacao1: (sessoesTabela[0] && sessoesTabela[0].fiscalizacao1) || (inputFiscalizacao1 ? inputFiscalizacao1.value.trim() : ''),
      saidaPonto: (sessoesTabela[0] && sessoesTabela[0].saidaPonto) || (inputSaidaPonto ? inputSaidaPonto.value.trim() : ''),
      chegadaPlaca: (sessoesTabela[0] && sessoesTabela[0].chegadaPlaca) || (inputChegadaPlaca ? inputChegadaPlaca.value.trim() : ''),
      fiscalizacao2: (sessoesTabela[0] && sessoesTabela[0].fiscalizacao2) || (inputFiscalizacao2 ? inputFiscalizacao2.value.trim() : ''),
      saidaPlaca: (sessoesTabela[0] && sessoesTabela[0].saidaPlaca) || (inputSaidaPlaca ? inputSaidaPlaca.value.trim() : ''),
      sessoes: sessoesTabela.filter(s => s.roletas || s.chegadaPonto2 || s.fiscalizacao1 || s.saidaPonto || s.chegadaPlaca || s.fiscalizacao2 || s.saidaPlaca),
      roletaInicial: cRoletaIni,
      roletaFinal: cRoletaFim,
      roletaPassageiros: cRoletaPass,
      validador: valDado,
      filipeta: filDado
    };
  }

  /* --- Renderização de uma etapa individual nos cards --- */

  function renderizarBlocoEtapa(dados, isEtapa) {
    const sessoes = dados.sessoes || [];
    const temSessoes = sessoes.length > 0 || dados.roletas;
    const temKmPainel = dados.kmPainelInicial || dados.kmPainelFinal || dados.kmPainelRodado;
    const temKmTaco = dados.kmTacoInicial || dados.kmTacoFinal || dados.kmTacoRodado;
    const temPontos1 = dados.chegadaGaragem || dados.chegadaPonto1;
    const temPontos2 = dados.chegadaCarro || dados.horaVinculacao;

    let rotuloTipoTroca = 'INÍCIO';
    if (dados.tipoTroca === 'linha') rotuloTipoTroca = 'TROCA DE LINHA';
    else if (dados.tipoTroca === 'carro') rotuloTipoTroca = 'TROCA DE CARRO';
    else if (dados.tipoTroca === 'ambos') rotuloTipoTroca = 'TROCA DE LINHA E CARRO';

    return `
      ${isEtapa ? `
        <div class="badge-etapa-header ${dados.numeroEtapa === 1 ? 'badge-etapa-header--inicio' : 'badge-etapa-header--recente'}">
          <span>📍 ETAPA ${dados.numeroEtapa} (${rotuloTipoTroca})</span>
          <span>Linha: <strong>${dados.linha || '--'}</strong> • Carro: <strong>${dados.carroSigla ? `[${dados.carroSigla}] ` : ''}${dados.carroNumero || '--'}</strong></span>
        </div>
        <div class="item-jornada-row item-jornada-row--middle" style="margin: 2px 0 4px;">
          <span class="dado-escala col-jornada-linha-dado">Linha: ${dados.linha || '--'} — ${dados.linhaNome || '--'}</span>
          <span class="dado-escala col-jornada-carro-dado">Carro: ${dados.carroSigla || ''} ${dados.carroNumero || '--'} (${dados.carroPlaca || '--'})</span>
        </div>
      ` : ''}

      ${temKmPainel ? `
        <div class="item-jornada-row item-jornada-row--km">
          <div class="col-jornada-km-box">
            <span class="col-jornada-km-tag">Painel Inicial</span>
            <span class="col-jornada-km-val">${dados.kmPainelInicial || '--'}</span>
          </div>
          <div class="col-jornada-km-box">
            <span class="col-jornada-km-tag">Painel Final</span>
            <span class="col-jornada-km-val">${dados.kmPainelFinal || '--'}</span>
          </div>
          <div class="col-jornada-km-box">
            <span class="col-jornada-km-tag">Painel Rodado</span>
            <span class="col-jornada-km-val col-jornada-km-val--rodado">${dados.kmPainelRodado || '--'}</span>
          </div>
        </div>
      ` : ''}

      ${temKmTaco ? `
        <div class="item-jornada-row item-jornada-row--km">
          <div class="col-jornada-km-box">
            <span class="col-jornada-km-tag">Tacógrafo Inicial</span>
            <span class="col-jornada-km-val">${dados.kmTacoInicial || '--'}</span>
          </div>
          <div class="col-jornada-km-box">
            <span class="col-jornada-km-tag">Tacógrafo Final</span>
            <span class="col-jornada-km-val">${dados.kmTacoFinal || '--'}</span>
          </div>
          <div class="col-jornada-km-box">
            <span class="col-jornada-km-tag">Tacógrafo Rodado</span>
            <span class="col-jornada-km-val col-jornada-km-val--rodado">${dados.kmTacoRodado || '--'}</span>
          </div>
        </div>
      ` : ''}

      ${dados.avarias ? `
        <div class="item-jornada-row item-jornada-row--bottom">
          <span class="dado-escala col-jornada-avarias-dado">${dados.avarias}</span>
        </div>
      ` : ''}

      ${temPontos1 ? `
        <div class="item-jornada-row item-jornada-row--dupla">
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Chegada Garagem</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.chegadaGaragem || '--:--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Chegada Ponto</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.chegadaPonto1 || '--:--'}</span>
          </div>
        </div>
      ` : ''}

      ${temPontos2 ? `
        <div class="item-jornada-row item-jornada-row--dupla">
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Chegada Carro</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.chegadaCarro || '--:--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Hora Vinculação</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.horaVinculacao || '--:--'}</span>
          </div>
        </div>
      ` : ''}

      ${temSessoes ? `
        <div class="jornada-divisor-linha" style="opacity:0.35; margin: 4px 0;" aria-hidden="true"></div>
        ${sessoes.length > 0 ? sessoes.map((s, idx) => `
          ${idx > 0 ? '<div class="jornada-divisor-linha" style="opacity:0.35; margin: 3px 0;" aria-hidden="true"></div>' : ''}
          <div class="item-jornada-row item-jornada-row--viagem">
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Carro</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.carro || dados.carroNumero || '--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Roletas ${sessoes.length > 1 ? '#' + (s.indice || (idx + 1)) : ''}</span>
              <span class="col-jornada-km-val">${s.roletas || '--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Cheg. Ponto</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.chegadaPonto2 || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Fiscaliz.</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.fiscalizacao1 || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Saída Ponto</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.saidaPonto || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Cheg. Placa</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.chegadaPlaca || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Fiscaliz.</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.fiscalizacao2 || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Saída Placa</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${s.saidaPlaca || '--:--'}</span>
            </div>
          </div>
        `).join('') : `
          <div class="item-jornada-row item-jornada-row--viagem">
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Carro</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.carroNumero || '--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Roletas</span>
              <span class="col-jornada-km-val">${dados.roletas || '--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Cheg. Ponto</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.chegadaPonto2 || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Fiscaliz.</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.fiscalizacao1 || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Saída Ponto</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.saidaPonto || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Cheg. Placa</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.chegadaPlaca || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Fiscaliz.</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.fiscalizacao2 || '--:--'}</span>
            </div>
            <div class="item-jornada-ponto-box">
              <span class="col-jornada-km-tag">Saída Placa</span>
              <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.saidaPlaca || '--:--'}</span>
            </div>
          </div>
        `}
      ` : ''}

      ${(dados.roletaInicial || dados.roletaFinal) ? `
        <div class="jornada-divisor-linha" style="opacity:0.35; margin: 4px 0;" aria-hidden="true"></div>
        <div class="item-jornada-row item-jornada-row--roletas-total">
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Carro</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.carroNumero || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Roleta Inicial</span>
            <span class="col-jornada-km-val">${dados.roletaInicial || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Roleta Final</span>
            <span class="col-jornada-km-val">${dados.roletaFinal || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Passageiros</span>
            <span class="col-jornada-km-val">${dados.roletaPassageiros !== undefined && dados.roletaPassageiros !== '' ? dados.roletaPassageiros : ((dados.roletaInicial && dados.roletaFinal && !isNaN(parseFloat(dados.roletaFinal.replace(/\D/g, ''))) && !isNaN(parseFloat(dados.roletaInicial.replace(/\D/g, '')))) ? (parseFloat(dados.roletaFinal.replace(/\D/g, '')) - parseFloat(dados.roletaInicial.replace(/\D/g, ''))) : '--')}</span>
          </div>
        </div>
      ` : ''}

      ${dados.validador && (dados.validador.gratuidade || dados.validador.valesTransporte || dados.validador.qrCode || dados.validador.pagantes) ? `
        <div class="jornada-divisor-linha" style="opacity:0.35; margin: 4px 0;" aria-hidden="true"></div>
        <div class="item-jornada-row item-jornada-row--validador">
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Carro</span>
            <span class="col-jornada-km-val">${dados.validador.carro || dados.carroNumero || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Gratuidade</span>
            <span class="col-jornada-km-val">${dados.validador.gratuidade || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Vales Transp.</span>
            <span class="col-jornada-km-val">${dados.validador.valesTransporte || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">QrCode</span>
            <span class="col-jornada-km-val">${dados.validador.qrCode || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Pagantes</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.validador.pagantes !== undefined && dados.validador.pagantes !== '' ? dados.validador.pagantes : ((dados.roletaPassageiros && !isNaN(parseFloat(String(dados.roletaPassageiros).replace(/\D/g, '')))) ? Math.max(0, parseFloat(String(dados.roletaPassageiros).replace(/\D/g, '')) - (parseFloat(String(dados.validador.gratuidade || '').replace(/\D/g, '')) || 0) - (parseFloat(String(dados.validador.valesTransporte || '').replace(/\D/g, '')) || 0) - (parseFloat(String(dados.validador.qrCode || '').replace(/\D/g, '')) || 0)) : '--')}</span>
          </div>
        </div>
      ` : ''}

      ${dados.filipeta && (dados.filipeta.coleta || dados.filipeta.pagantes || dados.filipeta.gratuidades || dados.filipeta.valesTransporte || dados.filipeta.passageiros) ? `
        <div class="jornada-divisor-linha" style="opacity:0.35; margin: 4px 0;" aria-hidden="true"></div>
        <div class="item-jornada-row item-jornada-row--filipeta">
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Carro</span>
            <span class="col-jornada-km-val">${dados.filipeta.carro || dados.carroNumero || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">N°. Coleta</span>
            <span class="col-jornada-km-val">${dados.filipeta.coleta || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Pagantes</span>
            <span class="col-jornada-km-val">${dados.filipeta.pagantes || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Gratuidades</span>
            <span class="col-jornada-km-val">${dados.filipeta.gratuidades || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Vales Transp.</span>
            <span class="col-jornada-km-val">${dados.filipeta.valesTransporte || '--'}</span>
          </div>
          <div class="item-jornada-ponto-box">
            <span class="col-jornada-km-tag">Passageiros</span>
            <span class="col-jornada-km-val col-jornada-km-val--ponto">${dados.filipeta.passageiros || '--'}</span>
          </div>
        </div>
      ` : ''}
    `;
  }

  /* --- Renderização das Etapas Concluídas em Andamento (ao vivo no formulário) --- */

  function atualizarLinhasECarrosAnteriores() {
    if (listaLinhasAnteriores) {
      listaLinhasAnteriores.innerHTML = '';
      if (Array.isArray(etapasJornadaAtiva) && etapasJornadaAtiva.length > 0) {
        // Mantém as linhas anteriores abaixo apenas quando houve troca de linha
        const anteriores = [...etapasJornadaAtiva].reverse();
        anteriores.forEach(etapa => {
          if (etapa.linha && (etapa.tipoTroca === 'linha' || etapa.tipoTroca === 'ambos')) {
            const rowLinha = document.createElement('div');
            rowLinha.className = 'form-escala-row form-jornada-row--middle linha-anterior-item';
            rowLinha.innerHTML = `
              <input type="text" class="input-escala col-jornada-linha" value="${etapa.linha}" readonly tabindex="-1" title="Linha anterior mantida" />
              <input type="text" class="input-escala col-jornada-linha-nome" value="${etapa.linhaNome || ''}" readonly tabindex="-1" title="Nome da linha anterior mantida" />
            `;
            listaLinhasAnteriores.appendChild(rowLinha);
          }
        });
      }
    }

    if (listaCarrosAnteriores) {
      listaCarrosAnteriores.innerHTML = '';
      if (Array.isArray(etapasJornadaAtiva) && etapasJornadaAtiva.length > 0) {
        // Exibe os carros anteriores abaixo dos campos do novo carro (que fica acima)
        const etapasCarro = etapasJornadaAtiva.filter(e => e.carroNumero && (e.tipoTroca === 'carro' || e.tipoTroca === 'ambos'));
        if (etapasCarro.length > 0) {
          listaCarrosAnteriores.style.display = 'flex';
          const anteriores = [...etapasCarro].reverse();
          anteriores.forEach(etapa => {
            const blocoCarro = document.createElement('div');
            blocoCarro.className = 'bloco-carro-anterior-item';
            blocoCarro.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%;';
            blocoCarro.innerHTML = `
              <div class="form-escala-row form-jornada-row--carro carro-anterior-item">
                <input type="text" class="input-escala col-jornada-carro-sigla" value="${etapa.carroSigla || ''}" placeholder="Sigla" readonly tabindex="-1" />
                <input type="text" class="input-escala col-jornada-carro-numero" value="${etapa.carroNumero || ''}" placeholder="N° Carro" readonly tabindex="-1" />
                <input type="text" class="input-escala col-jornada-carro-placa" value="${etapa.carroPlaca || ''}" placeholder="Placa Carro" readonly tabindex="-1" />
              </div>
              <div class="form-escala-row form-jornada-row--km">
                <input type="text" class="input-escala col-jornada-km" value="${etapa.kmPainelInicial || ''}" placeholder="KM Painel Inicial" readonly tabindex="-1" />
                <input type="text" class="input-escala col-jornada-km" value="${etapa.kmPainelFinal || ''}" placeholder="KM Painel Final" readonly tabindex="-1" />
                <input type="text" class="input-escala col-jornada-km col-jornada-km--rodado" value="${etapa.kmPainelRodado || ''}" placeholder="KM Painel Rodado" readonly tabindex="-1" />
              </div>
              <div class="form-escala-row form-jornada-row--km">
                <input type="text" class="input-escala col-jornada-km" value="${etapa.kmTacoInicial || ''}" placeholder="KM Tacógrafo Inicial" readonly tabindex="-1" />
                <input type="text" class="input-escala col-jornada-km" value="${etapa.kmTacoFinal || ''}" placeholder="KM Tacógrafo Final" readonly tabindex="-1" />
                <input type="text" class="input-escala col-jornada-km col-jornada-km--rodado" value="${etapa.kmTacoRodado || ''}" placeholder="KM Tacógrafo Rodado" readonly tabindex="-1" />
              </div>
              <div class="form-escala-row form-jornada-row--bottom">
                <input type="text" class="input-escala col-jornada-avarias" value="${etapa.avarias || ''}" placeholder="Avarias" readonly tabindex="-1" />
              </div>
            `;
            listaCarrosAnteriores.appendChild(blocoCarro);
          });
        } else {
          listaCarrosAnteriores.style.display = 'none';
        }
      } else {
        listaCarrosAnteriores.style.display = 'none';
      }
    }
  }

  function renderizarEtapasEmAndamento() {
    atualizarLinhasECarrosAnteriores();
    // Conforme solicitado pelo usuário, essas informações intermediárias não aparecem mais na tela do formulário.
    // Todas as informações continuam 100% salvas internamente e irão para o card final ao clicar em INSERIR.
    if (painelEtapasSalvasEmAndamento) {
      painelEtapasSalvasEmAndamento.innerHTML = '';
      painelEtapasSalvasEmAndamento.style.display = 'none';
    }
    if (indicadorEtapaAtual) {
      indicadorEtapaAtual.style.display = 'none';
    }
  }

  /* --- Renderização dos registros no card --- */

  function renderizarJornadas() {
    if (!container) return;
    const lista = carregarJornadas();
    container.innerHTML = '';

    if (lista.length === 0) {
      container.innerHTML = '<p style="color: #666666; font-size: 0.9rem; text-align: center; padding: 20px 10px;">Nenhuma jornada cadastrada. Preencha os campos acima e clique em Inserir.</p>';
      return;
    }

    sincronizarCarroComUltimaJornada();

    lista.forEach((item, index) => {
      const cardItem = document.createElement('div');
      cardItem.className = 'item-jornada-card' + (jornadaEmEdicaoIndex === index ? ' item-jornada-card--editando' : '');
      cardItem.setAttribute('data-index', index);
      cardItem.setAttribute('title', 'Clique no card para carregar e atualizar informações');
      const temCarro = item.carroNumero || item.carroPlaca || item.carroSigla;
      const temMultiEtapas = item.etapas && Array.isArray(item.etapas) && item.etapas.length > 1;

      cardItem.innerHTML = `
        <div class="item-jornada-row item-jornada-row--top">
          <span class="dado-escala col-jornada-semana-dado">${item.semana || item.diaSemana || '--'}</span>
          <span class="dado-escala col-jornada-data-dado">${item.data || '--/--/----'}</span>
          <span class="dado-escala col-jornada-hora-dado">${item.horaPegada || '--:--'}</span>
          <button type="button" class="btn-excluir-item" data-index="${index}" title="Excluir">✕</button>
        </div>
        <div class="item-jornada-row item-jornada-row--motorista">
          <span class="dado-escala col-jornada-matricula-dado">${item.matricula || '--'}</span>
          <span class="dado-escala col-jornada-motorista-dado">${item.motorista || '--'}</span>
        </div>

        ${!temMultiEtapas ? `
          <div class="item-jornada-row item-jornada-row--middle">
            <span class="dado-escala col-jornada-linha-dado">${item.linha || '--'}</span>
            <span class="dado-escala col-jornada-linhanome-dado">${item.linhaNome || '--'}</span>
          </div>
          ${temCarro ? `
            <div class="jornada-divisor-linha" aria-hidden="true"></div>
            <div class="item-jornada-row item-jornada-row--carro">
              <span class="dado-escala col-jornada-carro-sigla-dado">${item.carroSigla || '--'}</span>
              <span class="dado-escala col-jornada-carro-numero-dado">${item.carroNumero || '--'}</span>
              <span class="dado-escala col-jornada-carro-placa-dado">${item.carroPlaca || '--'}</span>
            </div>
          ` : ''}
          ${renderizarBlocoEtapa(item, false)}
        ` : `
          <!-- ETAPAS EM ORDEM DECRESCENTE (Mais recente no topo, inicial por baixo) -->
          <div class="container-etapas-jornada" style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
            ${[...item.etapas].reverse().map(etapa => `
              <div class="item-jornada-etapa">
                ${renderizarBlocoEtapa(etapa, true)}
              </div>
            `).join('<div class="jornada-divisor-linha" style="opacity:0.35; margin: 4px 0;" aria-hidden="true"></div>')}
          </div>
        `}
      `;

      cardItem.addEventListener('click', (e) => {
        if (e.target.closest('.btn-excluir-item')) return;
        preencherFormularioComJornada(item, index);
        if (form) {
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      container.appendChild(cardItem);
    });

    container.querySelectorAll('.btn-excluir-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = e.currentTarget.getAttribute('data-index');
        const idxNum = Number(idx);
        if (jornadaEmEdicaoIndex === idxNum) {
          jornadaEmEdicaoIndex = null;
        } else if (jornadaEmEdicaoIndex !== null && jornadaEmEdicaoIndex > idxNum) {
          jornadaEmEdicaoIndex--;
        }
        const listaAtual = carregarJornadas();
        listaAtual.splice(idxNum, 1);
        salvarJornadas(listaAtual);
        renderizarJornadas();
      });
    });
  }

  /* --- Gerenciamento do Modal de Troca de Linha/Carro --- */

  function selecionarAbaTroca(tipo) {
    tipoTrocaAtual = tipo;
    [tabTrocaLinha, tabTrocaCarro, tabTrocaAmbos].forEach(tab => {
      if (!tab) return;
      if (tab.getAttribute('data-tipo') === tipo) {
        tab.classList.add('tab-troca-btn--active');
      } else {
        tab.classList.remove('tab-troca-btn--active');
      }
    });
    if (painelTrocaLinha) painelTrocaLinha.style.display = tipo === 'linha' ? 'flex' : 'none';
    if (painelTrocaCarro) painelTrocaCarro.style.display = tipo === 'carro' ? 'flex' : 'none';
    if (painelTrocaAmbos) painelTrocaAmbos.style.display = tipo === 'ambos' ? 'flex' : 'none';
  }

  if (tabTrocaLinha) tabTrocaLinha.addEventListener('click', () => selecionarAbaTroca('linha'));
  if (tabTrocaCarro) tabTrocaCarro.addEventListener('click', () => selecionarAbaTroca('carro'));
  if (tabTrocaAmbos) tabTrocaAmbos.addEventListener('click', () => selecionarAbaTroca('ambos'));

  function abrirModalTroca(tipoDesejado) {
    if (!modalTroca) return;
    if (tipoDesejado) {
      tipoTrocaAtual = tipoDesejado;
    }
    const carroAtual = carroNumInput ? carroNumInput.value.trim() : '';
    const linhaAtual = linhaInput ? linhaInput.value.trim() : '';

    if (lblCarroAtualLinha) lblCarroAtualLinha.textContent = carroAtual || '--';
    if (lblLinhaAtualCarro) lblLinhaAtualCarro.textContent = linhaAtual || '--';
    if (lblCarroFechamento) lblCarroFechamento.textContent = carroAtual || '--';
    if (lblCarroFechamentoAmbos) lblCarroFechamentoAmbos.textContent = carroAtual || '--';

    // Fechamento Painel e Tacógrafo do carro atual pré-carregados se já existirem no form
    if (inputTrocaKmFinalPainelCarroAtual && kmPainelFinalInput) {
      inputTrocaKmFinalPainelCarroAtual.value = kmPainelFinalInput.value.trim();
    }
    if (inputTrocaKmFinalTacoCarroAtual && kmTacoFinalInput) {
      inputTrocaKmFinalTacoCarroAtual.value = kmTacoFinalInput.value.trim();
    }
    if (inputTrocaAmbosKmFinalPainelCarroAtual && kmPainelFinalInput) {
      inputTrocaAmbosKmFinalPainelCarroAtual.value = kmPainelFinalInput.value.trim();
    }
    if (inputTrocaAmbosKmFinalTacoCarroAtual && kmTacoFinalInput) {
      inputTrocaAmbosKmFinalTacoCarroAtual.value = kmTacoFinalInput.value.trim();
    }

    selecionarAbaTroca(tipoTrocaAtual);

    // Garante que o popup ("pop") aparece imediatamente visível e centralizado na tela, sem rolagem externa
    document.body.style.overflow = 'hidden';
    modalTroca.scrollTop = 0;
    modalTroca.style.display = 'flex';
    modalTroca.setAttribute('aria-hidden', 'false');

    // Foca o campo inicial para conveniência imediata
    setTimeout(() => {
      if (tipoTrocaAtual === 'linha' && inputTrocaNovaLinha) inputTrocaNovaLinha.focus();
      else if (tipoTrocaAtual === 'carro' && inputTrocaNovoCarro) inputTrocaNovoCarro.focus();
      else if (tipoTrocaAtual === 'ambos' && inputTrocaAmbosNovaLinha) inputTrocaAmbosNovaLinha.focus();
    }, 60);
  }

  function fecharModalTroca() {
    if (!modalTroca) return;
    document.body.style.overflow = '';
    modalTroca.style.display = 'none';
    modalTroca.setAttribute('aria-hidden', 'true');
  }

  // Eventos dos 3 Botões Diretos de Troca (Troca Linha, Troca Carro, Troca linha e Carro)
  [
    { el: btnTrocaLinhaDireto, tipo: 'linha' },
    { el: btnTrocaCarroDireto, tipo: 'carro' },
    { el: btnTrocaAmbosDireto, tipo: 'ambos' }
  ].forEach(({ el, tipo }) => {
    if (!el) return;
    el.addEventListener('click', (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      abrirModalTroca(tipo);
    });
  });

  if (btnAbrirModalTroca) {
    btnAbrirModalTroca.addEventListener('click', (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      abrirModalTroca();
    });
  }
  if (btnFecharModalTroca) btnFecharModalTroca.addEventListener('click', fecharModalTroca);
  if (btnCancelarTroca) btnCancelarTroca.addEventListener('click', fecharModalTroca);

  // Auto-complete de Linhas dentro do modal
  [inputTrocaNovaLinha, inputTrocaAmbosNovaLinha].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase();
      const fb = inp === inputTrocaNovaLinha ? feedbackTrocaLinha : feedbackTrocaAmbosLinha;
      if (!fb) return;
      const dado = buscarDadosLinha(inp.value.trim());
      if (dado) {
        fb.textContent = `✓ ${dado.nome}`;
      } else {
        fb.textContent = '';
      }
    });
  });

  // Auto-complete de Carros dentro do modal
  [inputTrocaNovoCarro, inputTrocaAmbosNovoCarro].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      const fb = inp === inputTrocaNovoCarro ? feedbackTrocaCarro : feedbackTrocaAmbosCarro;
      if (!fb) return;
      const dado = buscarDadosCarro(inp.value.trim());
      if (dado) {
        fb.textContent = `✓ [${dado.sigla}] Placa: ${dado.placa}`;
      } else {
        fb.textContent = '';
      }
    });
  });

  // Confirmação de Troca
  if (btnConfirmarTroca) {
    btnConfirmarTroca.addEventListener('click', () => {
      const horaTroca = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (tipoTrocaAtual === 'linha') {
        const novaLinhaNum = inputTrocaNovaLinha ? inputTrocaNovaLinha.value.trim().toUpperCase() : '';
        if (!novaLinhaNum) {
          alert('Por favor, informe o número da nova linha.');
          return;
        }
        // Salva a etapa anterior com todas as informações intactas
        etapasJornadaAtiva.push(capturarDadosEtapaAtual('linha', horaTroca));

        // Aplica a nova linha
        const dadosLinha = buscarDadosLinha(novaLinhaNum);
        if (linhaInput) linhaInput.value = novaLinhaNum;
        if (linhaNomeInput) linhaNomeInput.value = dadosLinha ? dadosLinha.nome : novaLinhaNum;

        // Limpa campos do modal de troca de linha
        if (inputTrocaNovaLinha) inputTrocaNovaLinha.value = '';
        if (feedbackTrocaLinha) feedbackTrocaLinha.textContent = '';

      } else if (tipoTrocaAtual === 'carro') {
        const novoCarroNum = inputTrocaNovoCarro ? inputTrocaNovoCarro.value.trim() : '';
        if (!novoCarroNum) {
          alert('Por favor, informe o número do novo carro.');
          return;
        }

        // Fechamento dos 2 KMs (Painel e Tacógrafo) do carro atual
        const kmFinalPainel = inputTrocaKmFinalPainelCarroAtual ? inputTrocaKmFinalPainelCarroAtual.value.trim() : '';
        if (kmFinalPainel && kmPainelFinalInput) {
          kmPainelFinalInput.value = kmFinalPainel;
          calcularKmRodado(kmPainelInicialInput, kmPainelFinalInput, kmPainelRodadoInput);
        }
        const kmFinalTaco = inputTrocaKmFinalTacoCarroAtual ? inputTrocaKmFinalTacoCarroAtual.value.trim() : '';
        if (kmFinalTaco && kmTacoFinalInput) {
          kmTacoFinalInput.value = kmFinalTaco;
          calcularKmRodado(kmTacoInicialInput, kmTacoFinalInput, kmTacoRodadoInput);
        }

        // Salva a etapa anterior com todas as informações intactas
        etapasJornadaAtiva.push(capturarDadosEtapaAtual('carro', horaTroca));

        // Aplica o novo carro
        if (carroNumInput) carroNumInput.value = novoCarroNum;
        buscarCarroJornada();

        // Abertura dos 2 KMs (Painel e Tacógrafo) do novo carro
        const novoKmPainelIni = inputTrocaKmInicialPainelNovoCarro ? inputTrocaKmInicialPainelNovoCarro.value.trim() : '';
        const novoKmTacoIni = inputTrocaKmInicialTacoNovoCarro ? inputTrocaKmInicialTacoNovoCarro.value.trim() : '';

        if (kmPainelInicialInput) kmPainelInicialInput.value = novoKmPainelIni;
        if (kmPainelFinalInput) kmPainelFinalInput.value = '';
        if (kmPainelRodadoInput) kmPainelRodadoInput.value = '';
        if (kmTacoInicialInput) kmTacoInicialInput.value = novoKmTacoIni;
        if (kmTacoFinalInput) kmTacoFinalInput.value = '';
        if (kmTacoRodadoInput) kmTacoRodadoInput.value = '';
        if (avariasInput) avariasInput.value = '';

        // Renderiza seções de Roletas Totais, Validador e Filipeta com o novo carro no topo e anteriores abaixo
        renderizarSecoesMultiCarro();

        // Cria nova linha na tabela de roletas com o número do novo carro
        criarNovaLinhaRoletas({ carro: novoCarroNum });

        // Limpa campos do modal de troca de carro
        if (inputTrocaNovoCarro) inputTrocaNovoCarro.value = '';
        if (inputTrocaKmFinalPainelCarroAtual) inputTrocaKmFinalPainelCarroAtual.value = '';
        if (inputTrocaKmFinalTacoCarroAtual) inputTrocaKmFinalTacoCarroAtual.value = '';
        if (inputTrocaKmInicialPainelNovoCarro) inputTrocaKmInicialPainelNovoCarro.value = '';
        if (inputTrocaKmInicialTacoNovoCarro) inputTrocaKmInicialTacoNovoCarro.value = '';
        if (feedbackTrocaCarro) feedbackTrocaCarro.textContent = '';

      } else if (tipoTrocaAtual === 'ambos') {
        const novaLinhaNum = inputTrocaAmbosNovaLinha ? inputTrocaAmbosNovaLinha.value.trim().toUpperCase() : '';
        const novoCarroNum = inputTrocaAmbosNovoCarro ? inputTrocaAmbosNovoCarro.value.trim() : '';
        if (!novaLinhaNum || !novoCarroNum) {
          alert('Por favor, informe a nova linha e o novo carro.');
          return;
        }

        // Fechamento dos 2 KMs (Painel e Tacógrafo) do carro atual
        const kmFinalPainel = inputTrocaAmbosKmFinalPainelCarroAtual ? inputTrocaAmbosKmFinalPainelCarroAtual.value.trim() : '';
        if (kmFinalPainel && kmPainelFinalInput) {
          kmPainelFinalInput.value = kmFinalPainel;
          calcularKmRodado(kmPainelInicialInput, kmPainelFinalInput, kmPainelRodadoInput);
        }
        const kmFinalTaco = inputTrocaAmbosKmFinalTacoCarroAtual ? inputTrocaAmbosKmFinalTacoCarroAtual.value.trim() : '';
        if (kmFinalTaco && kmTacoFinalInput) {
          kmTacoFinalInput.value = kmFinalTaco;
          calcularKmRodado(kmTacoInicialInput, kmTacoFinalInput, kmTacoRodadoInput);
        }

        // Salva etapa anterior com todas as informações intactas
        etapasJornadaAtiva.push(capturarDadosEtapaAtual('ambos', horaTroca));

        // Aplica nova linha
        const dadosLinha = buscarDadosLinha(novaLinhaNum);
        if (linhaInput) linhaInput.value = novaLinhaNum;
        if (linhaNomeInput) linhaNomeInput.value = dadosLinha ? dadosLinha.nome : novaLinhaNum;

        // Aplica novo carro
        if (carroNumInput) carroNumInput.value = novoCarroNum;
        buscarCarroJornada();

        // Abertura dos 2 KMs (Painel e Tacógrafo) do novo carro
        const novoKmPainelIni = inputTrocaAmbosKmInicialPainelNovoCarro ? inputTrocaAmbosKmInicialPainelNovoCarro.value.trim() : '';
        const novoKmTacoIni = inputTrocaAmbosKmInicialTacoNovoCarro ? inputTrocaAmbosKmInicialTacoNovoCarro.value.trim() : '';

        if (kmPainelInicialInput) kmPainelInicialInput.value = novoKmPainelIni;
        if (kmPainelFinalInput) kmPainelFinalInput.value = '';
        if (kmPainelRodadoInput) kmPainelRodadoInput.value = '';
        if (kmTacoInicialInput) kmTacoInicialInput.value = novoKmTacoIni;
        if (kmTacoFinalInput) kmTacoFinalInput.value = '';
        if (kmTacoRodadoInput) kmTacoRodadoInput.value = '';
        if (avariasInput) avariasInput.value = '';

        // Renderiza seções de Roletas Totais, Validador e Filipeta com o novo carro no topo e anteriores abaixo
        renderizarSecoesMultiCarro();

        // Cria nova linha na tabela de roletas com o número do novo carro
        criarNovaLinhaRoletas({ carro: novoCarroNum });

        // Limpa campos do modal de troca de ambos
        if (inputTrocaAmbosNovaLinha) inputTrocaAmbosNovaLinha.value = '';
        if (inputTrocaAmbosNovoCarro) inputTrocaAmbosNovoCarro.value = '';
        if (inputTrocaAmbosKmFinalPainelCarroAtual) inputTrocaAmbosKmFinalPainelCarroAtual.value = '';
        if (inputTrocaAmbosKmFinalTacoCarroAtual) inputTrocaAmbosKmFinalTacoCarroAtual.value = '';
        if (inputTrocaAmbosKmInicialPainelNovoCarro) inputTrocaAmbosKmInicialPainelNovoCarro.value = '';
        if (inputTrocaAmbosKmInicialTacoNovoCarro) inputTrocaAmbosKmInicialTacoNovoCarro.value = '';
        if (feedbackTrocaAmbosLinha) feedbackTrocaAmbosLinha.textContent = '';
        if (feedbackTrocaAmbosCarro) feedbackTrocaAmbosCarro.textContent = '';
      }

      // Mantém indicador de etapas oculto na tela conforme solicitação
      if (indicadorEtapaAtual) {
        indicadorEtapaAtual.style.display = 'none';
      }

      // Mantém todas as informações anteriores visíveis na tela em ordem decrescente
      renderizarEtapasEmAndamento();

      salvarRascunhoJornada();
      fecharModalTroca();
    });
  }

  /* --- Submissão do formulário (INSERIR) --- */

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Captura etapa final atualmente no formulário
      const etapaFinal = capturarDadosEtapaAtual('final');
      etapaFinal.numeroEtapa = etapasJornadaAtiva.length + 1;

      let todasEtapas = [];
      if (etapasJornadaAtiva.length > 0) {
        todasEtapas = [...etapasJornadaAtiva, etapaFinal];
      }

      const novaJornada = {
        semana: semanaInput ? semanaInput.value.trim() : '',
        data: dataInput ? dataInput.value.trim() : '',
        horaPegada: horaInput ? formatarHorario(horaInput.value.trim()) : '',
        matricula: matInput ? matInput.value.trim() : '',
        motorista: motInput ? motInput.value.trim() : '',
        linha: etapaFinal.linha,
        linhaNome: etapaFinal.linhaNome,
        carroSigla: etapaFinal.carroSigla,
        carroNumero: etapaFinal.carroNumero,
        carroPlaca: etapaFinal.carroPlaca,
        kmPainelInicial: etapaFinal.kmPainelInicial,
        kmPainelFinal: etapaFinal.kmPainelFinal,
        kmPainelRodado: etapaFinal.kmPainelRodado,
        kmTacoInicial: etapaFinal.kmTacoInicial,
        kmTacoFinal: etapaFinal.kmTacoFinal,
        kmTacoRodado: etapaFinal.kmTacoRodado,
        avarias: etapaFinal.avarias,
        chegadaGaragem: etapaFinal.chegadaGaragem,
        chegadaPonto1: etapaFinal.chegadaPonto1,
        chegadaCarro: etapaFinal.chegadaCarro,
        horaVinculacao: etapaFinal.horaVinculacao,
        roletas: etapaFinal.roletas,
        chegadaPonto2: etapaFinal.chegadaPonto2,
        fiscalizacao1: etapaFinal.fiscalizacao1,
        saidaPonto: etapaFinal.saidaPonto,
        chegadaPlaca: etapaFinal.chegadaPlaca,
        fiscalizacao2: etapaFinal.fiscalizacao2,
        saidaPlaca: etapaFinal.saidaPlaca,
        sessoes: etapaFinal.sessoes,
        roletaInicial: etapaFinal.roletaInicial,
        roletaFinal: etapaFinal.roletaFinal,
        validador: etapaFinal.validador,
        filipeta: etapaFinal.filipeta,
        etapas: todasEtapas
      };

      const listaAtual = carregarJornadas();
      const dataBusca = (novaJornada.data || '').replace(/\D/g, '');

      // Localiza se já existe um card correspondente (por índice em edição ou pela data informada)
      let indexExistente = -1;
      if (jornadaEmEdicaoIndex !== null && jornadaEmEdicaoIndex >= 0 && jornadaEmEdicaoIndex < listaAtual.length) {
        indexExistente = jornadaEmEdicaoIndex;
      } else if (dataBusca) {
        indexExistente = listaAtual.findIndex(j => {
          const jData = (j.data || '').replace(/\D/g, '');
          if (jData !== dataBusca) return false;
          if (novaJornada.matricula && j.matricula) {
            return novaJornada.matricula.trim() === j.matricula.trim();
          }
          return true;
        });
      }

      if (indexExistente !== -1) {
        // Atualiza a jornada existente preenchendo todos os campos vazios ou em branco com as novas informações
        const existente = listaAtual[indexExistente];

        const mesclarCampo = (novo, antigo) => {
          if (novo !== undefined && novo !== null && String(novo).trim() !== '' && String(novo).trim() !== '--') {
            return novo;
          }
          return (antigo !== undefined && antigo !== null) ? antigo : '';
        };

        const jornadaAtualizada = {
          semana: mesclarCampo(novaJornada.semana, existente.semana || existente.diaSemana),
          data: mesclarCampo(novaJornada.data, existente.data),
          horaPegada: mesclarCampo(novaJornada.horaPegada, existente.horaPegada),
          matricula: mesclarCampo(novaJornada.matricula, existente.matricula),
          motorista: mesclarCampo(novaJornada.motorista, existente.motorista),
          linha: mesclarCampo(novaJornada.linha, existente.linha),
          linhaNome: mesclarCampo(novaJornada.linhaNome, existente.linhaNome),
          carroSigla: mesclarCampo(novaJornada.carroSigla, existente.carroSigla),
          carroNumero: mesclarCampo(novaJornada.carroNumero, existente.carroNumero),
          carroPlaca: mesclarCampo(novaJornada.carroPlaca, existente.carroPlaca),

          kmPainelInicial: mesclarCampo(novaJornada.kmPainelInicial, existente.kmPainelInicial),
          kmPainelFinal: mesclarCampo(novaJornada.kmPainelFinal, existente.kmPainelFinal),
          kmPainelRodado: '',

          kmTacoInicial: mesclarCampo(novaJornada.kmTacoInicial, existente.kmTacoInicial),
          kmTacoFinal: mesclarCampo(novaJornada.kmTacoFinal, existente.kmTacoFinal),
          kmTacoRodado: '',

          avarias: mesclarCampo(novaJornada.avarias, existente.avarias),

          chegadaGaragem: mesclarCampo(novaJornada.chegadaGaragem, existente.chegadaGaragem),
          chegadaPonto1: mesclarCampo(novaJornada.chegadaPonto1, existente.chegadaPonto1),
          chegadaCarro: mesclarCampo(novaJornada.chegadaCarro, existente.chegadaCarro),
          horaVinculacao: mesclarCampo(novaJornada.horaVinculacao, existente.horaVinculacao),
          roletas: mesclarCampo(novaJornada.roletas, existente.roletas),
          chegadaPonto2: mesclarCampo(novaJornada.chegadaPonto2, existente.chegadaPonto2),
          fiscalizacao1: mesclarCampo(novaJornada.fiscalizacao1, existente.fiscalizacao1),
          saidaPonto: mesclarCampo(novaJornada.saidaPonto, existente.saidaPonto),
          chegadaPlaca: mesclarCampo(novaJornada.chegadaPlaca, existente.chegadaPlaca),
          fiscalizacao2: mesclarCampo(novaJornada.fiscalizacao2, existente.fiscalizacao2),
          saidaPlaca: mesclarCampo(novaJornada.saidaPlaca, existente.saidaPlaca),

          roletaInicial: mesclarCampo(novaJornada.roletaInicial, existente.roletaInicial),
          roletaFinal: mesclarCampo(novaJornada.roletaFinal, existente.roletaFinal),
          roletaPassageiros: '',

          validador: {
            carro: mesclarCampo(novaJornada.validador?.carro, existente.validador?.carro || existente.carroNumero),
            gratuidade: mesclarCampo(novaJornada.validador?.gratuidade, existente.validador?.gratuidade),
            valesTransporte: mesclarCampo(novaJornada.validador?.valesTransporte, existente.validador?.valesTransporte),
            qrCode: mesclarCampo(novaJornada.validador?.qrCode, existente.validador?.qrCode),
            pagantes: mesclarCampo(novaJornada.validador?.pagantes, existente.validador?.pagantes)
          },

          filipeta: {
            carro: mesclarCampo(novaJornada.filipeta?.carro, existente.filipeta?.carro || existente.carroNumero),
            coleta: mesclarCampo(novaJornada.filipeta?.coleta, existente.filipeta?.coleta),
            pagantes: mesclarCampo(novaJornada.filipeta?.pagantes, existente.filipeta?.pagantes),
            gratuidades: mesclarCampo(novaJornada.filipeta?.gratuidades, existente.filipeta?.gratuidades),
            valesTransporte: mesclarCampo(novaJornada.filipeta?.valesTransporte, existente.filipeta?.valesTransporte),
            passageiros: mesclarCampo(novaJornada.filipeta?.passageiros, existente.filipeta?.passageiros)
          }
        };

        // Recalcular KM Painel Rodado se inicial e final estiverem preenchidos
        if (jornadaAtualizada.kmPainelInicial && jornadaAtualizada.kmPainelFinal) {
          const iniP = parseFloat(String(jornadaAtualizada.kmPainelInicial).replace(/\D/g, ''));
          const fimP = parseFloat(String(jornadaAtualizada.kmPainelFinal).replace(/\D/g, ''));
          if (!isNaN(iniP) && !isNaN(fimP) && fimP >= iniP) {
            jornadaAtualizada.kmPainelRodado = String(fimP - iniP);
          } else {
            jornadaAtualizada.kmPainelRodado = mesclarCampo(novaJornada.kmPainelRodado, existente.kmPainelRodado);
          }
        } else {
          jornadaAtualizada.kmPainelRodado = mesclarCampo(novaJornada.kmPainelRodado, existente.kmPainelRodado);
        }

        // Recalcular KM Taco Rodado se inicial e final estiverem preenchidos
        if (jornadaAtualizada.kmTacoInicial && jornadaAtualizada.kmTacoFinal) {
          const iniT = parseFloat(String(jornadaAtualizada.kmTacoInicial).replace(/\D/g, ''));
          const fimT = parseFloat(String(jornadaAtualizada.kmTacoFinal).replace(/\D/g, ''));
          if (!isNaN(iniT) && !isNaN(fimT) && fimT >= iniT) {
            jornadaAtualizada.kmTacoRodado = String(fimT - iniT);
          } else {
            jornadaAtualizada.kmTacoRodado = mesclarCampo(novaJornada.kmTacoRodado, existente.kmTacoRodado);
          }
        } else {
          jornadaAtualizada.kmTacoRodado = mesclarCampo(novaJornada.kmTacoRodado, existente.kmTacoRodado);
        }

        // Recalcular Passageiros Roleta se inicial e final estiverem preenchidos
        if (jornadaAtualizada.roletaInicial && jornadaAtualizada.roletaFinal) {
          const iniR = parseFloat(String(jornadaAtualizada.roletaInicial).replace(/\D/g, ''));
          const fimR = parseFloat(String(jornadaAtualizada.roletaFinal).replace(/\D/g, ''));
          if (!isNaN(iniR) && !isNaN(fimR) && fimR >= iniR) {
            jornadaAtualizada.roletaPassageiros = String(fimR - iniR);
          } else {
            jornadaAtualizada.roletaPassageiros = mesclarCampo(novaJornada.roletaPassageiros, existente.roletaPassageiros);
          }
        } else {
          jornadaAtualizada.roletaPassageiros = mesclarCampo(novaJornada.roletaPassageiros, existente.roletaPassageiros);
        }

        // Recalcular Pagantes Validador (passageiros - gratuidade - valesTransporte - qrCode)
        const vPass = parseFloat(String(jornadaAtualizada.roletaPassageiros || '').replace(/\D/g, ''));
        if (!isNaN(vPass) && jornadaAtualizada.roletaPassageiros !== '' && jornadaAtualizada.roletaPassageiros !== '--') {
          const vGrat = parseFloat(String(jornadaAtualizada.validador.gratuidade || '').replace(/\D/g, '')) || 0;
          const vVales = parseFloat(String(jornadaAtualizada.validador.valesTransporte || '').replace(/\D/g, '')) || 0;
          const vQr = parseFloat(String(jornadaAtualizada.validador.qrCode || '').replace(/\D/g, '')) || 0;
          const vPag = vPass - vGrat - vVales - vQr;
          jornadaAtualizada.validador.pagantes = String(vPag >= 0 ? vPag : 0);
        } else if (novaJornada.validador?.pagantes) {
          jornadaAtualizada.validador.pagantes = novaJornada.validador.pagantes;
        }

        // Recalcular Passageiros Filipeta se estiver vazio
        if (!jornadaAtualizada.filipeta.passageiros && (jornadaAtualizada.filipeta.pagantes || jornadaAtualizada.filipeta.gratuidades || jornadaAtualizada.filipeta.valesTransporte)) {
          const pag = parseFloat(String(jornadaAtualizada.filipeta.pagantes || '').replace(/\D/g, '')) || 0;
          const gra = parseFloat(String(jornadaAtualizada.filipeta.gratuidades || '').replace(/\D/g, '')) || 0;
          const val = parseFloat(String(jornadaAtualizada.filipeta.valesTransporte || '').replace(/\D/g, '')) || 0;
          const totalFil = pag + gra + val;
          if (totalFil > 0) {
            jornadaAtualizada.filipeta.passageiros = String(totalFil);
          }
        }

        // Sessões de viagem
        if (Array.isArray(novaJornada.sessoes) && novaJornada.sessoes.length > 0) {
          jornadaAtualizada.sessoes = novaJornada.sessoes;
        } else if (Array.isArray(existente.sessoes) && existente.sessoes.length > 0) {
          jornadaAtualizada.sessoes = existente.sessoes;
        } else {
          jornadaAtualizada.sessoes = [];
        }

        // Etapas
        if (Array.isArray(novaJornada.etapas) && novaJornada.etapas.length > 0) {
          if (Array.isArray(existente.etapas) && existente.etapas.length > 0) {
            jornadaAtualizada.etapas = novaJornada.etapas.map((etapaNova, i) => {
              const etapaAntiga = existente.etapas.find(ea => ea.numeroEtapa === etapaNova.numeroEtapa || ea.carroNumero === etapaNova.carroNumero) || existente.etapas[i];
              if (!etapaAntiga) return etapaNova;
              const etapaMesclada = { ...etapaAntiga };
              Object.keys(etapaNova).forEach(k => {
                etapaMesclada[k] = mesclarCampo(etapaNova[k], etapaAntiga[k]);
              });
              return etapaMesclada;
            });
          } else {
            jornadaAtualizada.etapas = novaJornada.etapas;
          }
        } else if (Array.isArray(existente.etapas) && existente.etapas.length > 0) {
          jornadaAtualizada.etapas = existente.etapas.map((etapaAntiga, idx) => {
            if (idx === existente.etapas.length - 1 || etapaAntiga.carroNumero === jornadaAtualizada.carroNumero) {
              const etapaMesclada = { ...etapaAntiga };
              Object.keys(etapaFinal).forEach(k => {
                etapaMesclada[k] = mesclarCampo(etapaFinal[k], etapaAntiga[k]);
              });
              return etapaMesclada;
            }
            return etapaAntiga;
          });
        } else {
          jornadaAtualizada.etapas = [];
        }

        listaAtual[indexExistente] = jornadaAtualizada;
        salvarJornadas(listaAtual);
      } else {
        // Novo registro: insere no topo
        listaAtual.unshift(novaJornada);
        salvarJornadas(listaAtual);
      }

      // Limpa o rascunho persistido offline
      limparRascunhoJornada();

      // Reseta e limpa o formulário de forma centralizada
      resetarFormularioJornada();

      // Atualiza os cards em tela
      renderizarJornadas();
    });
  }

  /* --- Limpeza de campos derivados --- */

  function limparCamposDerivados(limparSemana = false) {
    if (limparSemana && semanaInput) semanaInput.value = '';
    if (horaInput) { horaInput.value = ''; horaInput.readOnly = true; }
    if (matInput) { matInput.value = ''; matInput.readOnly = true; }
    if (motInput) { motInput.value = ''; motInput.readOnly = true; }
    if (linhaInput) { linhaInput.value = ''; linhaInput.readOnly = true; }
    if (linhaNomeInput) { linhaNomeInput.value = ''; linhaNomeInput.readOnly = true; }
  }

  /* --- Cálculo automático de KM Rodado --- */

  function calcularKmRodado(iniInput, finInput, rodInput) {
    if (!iniInput || !finInput || !rodInput) return;
    const iniVal = parseFloat(iniInput.value.replace(/\D/g, ''));
    const finVal = parseFloat(finInput.value.replace(/\D/g, ''));

    if (!isNaN(iniVal) && !isNaN(finVal)) {
      const rodado = finVal - iniVal;
      rodInput.value = rodado >= 0 ? rodado : 0;
    } else {
      rodInput.value = '';
    }
  }

  /* --- Busca automática de carro pelo Nº Carro --- */

  function buscarCarroJornada() {
    const num = carroNumInput ? carroNumInput.value.trim() : '';
    // Sincroniza campos de Carro apenas nas linhas que estiverem vazias
    document.querySelectorAll('.col-jornada-carro-viagem').forEach(inp => {
      if (!inp.value.trim()) inp.value = num;
    });
    if (!num) {
      if (carroSiglaInput) { carroSiglaInput.value = ''; carroSiglaInput.readOnly = true; }
      if (carroPlacaInput) { carroPlacaInput.value = ''; carroPlacaInput.readOnly = true; }
      renderizarSecoesMultiCarro();
      return;
    }
    const dadosCarro = buscarDadosCarro(num);
    if (dadosCarro) {
      if (carroSiglaInput) { carroSiglaInput.value = dadosCarro.sigla || ''; carroSiglaInput.readOnly = true; }
      if (carroPlacaInput) { carroPlacaInput.value = dadosCarro.placa || ''; carroPlacaInput.readOnly = true; }
    } else {
      if (carroSiglaInput) { carroSiglaInput.value = ''; carroSiglaInput.readOnly = true; }
      if (carroPlacaInput) { carroPlacaInput.value = ''; carroPlacaInput.readOnly = true; }
    }
    renderizarSecoesMultiCarro();
    atualizarRoletasTotaisAutomaticas();
    salvarRascunhoJornada();
  }

  /* --- Processamento de data (formatar + semana + buscar escala) --- */

  function processarData() {
    const raw = dataInput.value.replace(/\D/g, '');
    if (!raw || raw.length < 6) {
      limparCamposDerivados(true);
      jornadaEmEdicaoIndex = null;
      document.querySelectorAll('.item-jornada-card--editando').forEach(el => el.classList.remove('item-jornada-card--editando'));
      salvarRascunhoJornada();
      return;
    }

    let dia = '';
    let mes = '';
    let ano = '';

    if (raw.length === 8) {
      dia = raw.slice(0, 2);
      mes = raw.slice(2, 4);
      ano = raw.slice(4, 8);
    } else if (raw.length === 6) {
      dia = raw.slice(0, 2);
      mes = raw.slice(2, 4);
      ano = '20' + raw.slice(4, 6);
    } else {
      limparCamposDerivados(true);
      jornadaEmEdicaoIndex = null;
      document.querySelectorAll('.item-jornada-card--editando').forEach(el => el.classList.remove('item-jornada-card--editando'));
      salvarRascunhoJornada();
      return;
    }

    const dataFormatada = `${dia}/${mes}/${ano}`;

    // Formata o campo data
    dataInput.value = dataFormatada;

    // Calcula e preenche o dia da semana
    const dateObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
    if (!isNaN(dateObj.getTime())) {
      semanaInput.value = diasSemana[dateObj.getDay()];
    } else {
      semanaInput.value = '';
    }

    // 1. Verifica se já existe uma jornada registrada nos cards para esta data
    const listaJornadas = carregarJornadas();
    const dataBusca = dataFormatada.replace(/\D/g, '');
    const idxExistente = listaJornadas.findIndex(j => (j.data || '').replace(/\D/g, '') === dataBusca);

    if (idxExistente !== -1) {
      // Carrega os dados existentes no formulário para completar os campos vazios ou em branco
      preencherFormularioComJornada(listaJornadas[idxExistente], idxExistente);
      return;
    }

    // 2. Se não houver jornada cadastrada, busca dados da escala pela data formatada
    jornadaEmEdicaoIndex = null;
    document.querySelectorAll('.item-jornada-card--editando').forEach(el => el.classList.remove('item-jornada-card--editando'));
    buscarEscalaPorData(dataFormatada);
    salvarRascunhoJornada();
  }

  /**
   * Busca no localStorage da escala um registro com a mesma data
   * e preenche os campos correspondentes na jornada.
   */
  function buscarEscalaPorData(dataFormatada) {
    try {
      const dados = localStorage.getItem(ESCALA_KEY);
      if (!dados) {
        limparCamposDerivados(false);
        salvarRascunhoJornada();
        return;
      }

      const escalas = JSON.parse(dados);
      const dataBusca = dataFormatada.replace(/\D/g, '');

      const encontrada = escalas.find(e => {
        const dataEscala = e.data ? e.data.replace(/\D/g, '') : '';
        return dataEscala === dataBusca;
      });

      if (encontrada) {
        if (horaInput) {
          horaInput.value = encontrada.horario || '';
          horaInput.readOnly = true;
        }
        if (matInput) {
          matInput.value = encontrada.matricula || '';
          matInput.readOnly = true;
        }
        if (motInput) {
          motInput.value = encontrada.motorista || '';
          motInput.readOnly = true;
        }
        if (linhaInput) {
          linhaInput.value = encontrada.linhaNumero || '';
          linhaInput.readOnly = true;
        }
        if (linhaNomeInput) {
          linhaNomeInput.value = encontrada.linhaNome || '';
          linhaNomeInput.readOnly = true;
        }
      } else {
        // Se não encontrar na escala, limpa os campos derivados mas mantém como readonly
        limparCamposDerivados(false);
      }
      salvarRascunhoJornada();
    } catch (err) {
      console.warn('[Jornada] Erro ao buscar escala:', err);
    }
  }

  /* --- Máscaras e eventos de campo --- */

  // Máscara em tempo real para o campo data
  dataInput.addEventListener('input', () => {
    let val = dataInput.value.replace(/\D/g, '');
    if (!val || val.length === 0) {
      limparCamposDerivados(true);
      jornadaEmEdicaoIndex = null;
      document.querySelectorAll('.item-jornada-card--editando').forEach(el => el.classList.remove('item-jornada-card--editando'));
      dataInput.value = '';
      return;
    }
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length >= 5) {
      dataInput.value = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length >= 3) {
      dataInput.value = `${val.slice(0, 2)}/${val.slice(2)}`;
    } else {
      dataInput.value = val;
    }
    if (val.length === 8) {
      processarData();
    }
  });

  // Formata e processa ao sair do campo (blur) ou pressionar Enter
  dataInput.addEventListener('blur', processarData);
  dataInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processarData();
      if (carroNumInput) carroNumInput.focus();
      else if (avariasInput) avariasInput.focus();
    }
  });

  // Eventos do campo Nº Carro (Auto-lookup de Sigla e Placa)
  if (carroNumInput) {
    carroNumInput.addEventListener('input', () => {
      carroNumInput.value = carroNumInput.value.toUpperCase();
      buscarCarroJornada();
    });

    carroNumInput.addEventListener('blur', buscarCarroJornada);

    carroNumInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarCarroJornada();
        if (kmPainelInicialInput) kmPainelInicialInput.focus();
        else if (avariasInput) avariasInput.focus();
      }
    });
  }

  // Eventos para cálculo automático de KM Painel
  if (kmPainelInicialInput && kmPainelFinalInput && kmPainelRodadoInput) {
    kmPainelInicialInput.addEventListener('input', () => {
      calcularKmRodado(kmPainelInicialInput, kmPainelFinalInput, kmPainelRodadoInput);
    });
    kmPainelFinalInput.addEventListener('input', () => {
      calcularKmRodado(kmPainelInicialInput, kmPainelFinalInput, kmPainelRodadoInput);
    });
  }

  // Eventos para cálculo automático de KM Tacógrafo
  if (kmTacoInicialInput && kmTacoFinalInput && kmTacoRodadoInput) {
    kmTacoInicialInput.addEventListener('input', () => {
      calcularKmRodado(kmTacoInicialInput, kmTacoFinalInput, kmTacoRodadoInput);
    });
    kmTacoFinalInput.addEventListener('input', () => {
      calcularKmRodado(kmTacoInicialInput, kmTacoFinalInput, kmTacoRodadoInput);
    });
  }

  // Máscara em tempo real para o campo Hora Pegada (HH:MM)
  if (horaInput) {
    horaInput.addEventListener('input', () => {
      let val = horaInput.value.replace(/\D/g, '');
      if (val.length > 4) val = val.slice(0, 4);
      if (val.length >= 3) {
        horaInput.value = `${val.slice(0, 2)}:${val.slice(2)}`;
      } else {
        horaInput.value = val;
      }
    });

    horaInput.addEventListener('blur', () => {
      if (horaInput.value.trim()) {
        horaInput.value = formatarHorario(horaInput.value);
      }
    });
  }

  // Auto-lookup de linha na jornada
  if (linhaInput && linhaNomeInput) {
    linhaInput.addEventListener('input', () => {
      linhaInput.value = linhaInput.value.toUpperCase();
      const dados = buscarDadosLinha(linhaInput.value.trim());
      linhaNomeInput.value = dados ? dados.nome : '';
    });

    linhaInput.addEventListener('blur', () => {
      const dados = buscarDadosLinha(linhaInput.value.trim());
      linhaNomeInput.value = dados ? dados.nome : '';
    });
  }

  /* --- Integração de Botões de Horário Automático (HH:MM) --- */

  function obterHoraAtualHHMM() {
    if (window.RelogioAntiFraude && typeof window.RelogioAntiFraude.getHorarioFormatado === 'function') {
      const full = window.RelogioAntiFraude.getHorarioFormatado();
      if (full && full.length >= 5) return full.slice(0, 5);
    }
    const agora = new Date();
    const h = String(agora.getHours()).padStart(2, '0');
    const m = String(agora.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function vincularBotaoHora(btn, input) {
    if (!btn || !input) return;
    // Campos com botões são exclusivamente automáticos: não recebem dados manualmente e não podem ser editados
    input.readOnly = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const hora = obterHoraAtualHHMM();
      input.value = hora;
      input.classList.remove('input-ponto-animado');
      void input.offsetWidth;
      input.classList.add('input-ponto-animado');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Vincula botões fixos superiores com entrada automática de horário (HH:MM)
  vincularBotaoHora(btnChegadaGaragem, inputChegadaGaragem);
  vincularBotaoHora(btnChegadaPonto1, inputChegadaPonto1);
  vincularBotaoHora(btnChegadaCarro, inputChegadaCarro);
  vincularBotaoHora(btnHoraVinculacao, inputHoraVinculacao);

  /* --- Gerenciamento da Tabela de Roletas e Viagens (Header com Botões + Linhas Dinâmicas de Inputs) --- */

  const containerLinhasRoletas = document.getElementById('containerLinhasRoletas');
  let totalLinhasRoletas = 0;

  function registrarHoraNoInput(input) {
    if (!input) return;
    const hora = obterHoraAtualHHMM();
    input.value = hora;
    input.classList.remove('input-ponto-animado');
    void input.offsetWidth;
    input.classList.add('input-ponto-animado');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function preencherPontoColuna(colunaIndex) {
    if (!containerLinhasRoletas) return;
    const linhas = containerLinhasRoletas.querySelectorAll('.form-jornada-row--viagem-dados');
    if (linhas.length === 0) return;
    // Os botões de marcação SEMPRE alteram exclusivamente a ÚLTIMA fila aberta
    const targetLinha = linhas[linhas.length - 1];
    const inputs = targetLinha.querySelectorAll('.col-jornada-hora-ponto');
    const targetInput = inputs[colunaIndex];
    if (targetInput) {
      registrarHoraNoInput(targetInput);
    }
  }

  function temRoletaAnotada(linhaEl) {
    if (!linhaEl) return false;
    const roletasInput = linhaEl.querySelector('.col-jornada-roletas');
    return !!(roletasInput && roletasInput.value.trim() !== '');
  }

  function isLinhaSemRoleta(linhaEl) {
    // Regra: Mesmo com hora registrada, se não tiver roleta anotada, tem que desaparecer
    return !temRoletaAnotada(linhaEl);
  }

  function atualizarRoletasTotaisAutomaticas() {
    const lista = carregarJornadas();
    const numCarroPadrao = (carroNumInput && carroNumInput.value.trim()) ||
                          (lista.length > 0 && lista[0].carroNumero) || '';

    // Agrupa roletas válidas por carro
    const roletasPorCarro = {};
    if (containerLinhasRoletas) {
      const rows = containerLinhasRoletas.querySelectorAll('.form-jornada-row--viagem-dados');
      rows.forEach(row => {
        const roletaInp = row.querySelector('.col-jornada-roletas');
        const carroInp = row.querySelector('.col-jornada-carro-viagem');
        const roletaVal = roletaInp ? roletaInp.value.trim() : '';
        const carroVal = (carroInp && carroInp.value.trim()) || numCarroPadrao;
        if (roletaVal !== '' && carroVal !== '') {
          if (!roletasPorCarro[carroVal]) roletasPorCarro[carroVal] = [];
          roletasPorCarro[carroVal].push(roletaVal);
        }
      });
    }

    if (containerRoletasTotaisLinhas) {
      const rowsTotais = containerRoletasTotaisLinhas.querySelectorAll('.form-jornada-row--roletas-total');
      rowsTotais.forEach(r => {
        const carro = r.getAttribute('data-carro');
        const inpIni = r.querySelector('.input-roleta-ini-item');
        const inpFim = r.querySelector('.input-roleta-fim-item');
        const inpPass = r.querySelector('.input-roleta-pass-item');
        if (carro && roletasPorCarro[carro] && roletasPorCarro[carro].length > 0) {
          const arr = roletasPorCarro[carro];
          const iniStr = arr[0];
          const fimStr = arr[arr.length - 1];
          if (inpIni) inpIni.value = iniStr;
          if (inpFim) inpFim.value = fimStr;
          const numIni = parseFloat(iniStr.replace(/\D/g, ''));
          const numFim = parseFloat(fimStr.replace(/\D/g, ''));
          if (!isNaN(numIni) && !isNaN(numFim) && inpPass) {
            const pass = numFim - numIni;
            inpPass.value = pass >= 0 ? pass : 0;
          } else if (inpPass) {
            inpPass.value = '';
          }
        } else {
          if (inpIni) inpIni.value = '';
          if (inpFim) inpFim.value = '';
          if (inpPass) inpPass.value = '';
        }
      });
    }

    // Mantém compatibilidade com referências do topo
    const topRow = containerRoletasTotaisLinhas ? containerRoletasTotaisLinhas.firstElementChild : null;
    if (topRow) {
      const topCarroVal = topRow.getAttribute('data-carro') || numCarroPadrao;
      if (roletasPorCarro[topCarroVal] && roletasPorCarro[topCarroVal].length > 0) {
        const arr = roletasPorCarro[topCarroVal];
        if (inputRoletaInicial) inputRoletaInicial.value = arr[0];
        if (inputRoletaFinal) inputRoletaFinal.value = arr[arr.length - 1];
        const numIni = parseFloat(arr[0].replace(/\D/g, ''));
        const numFim = parseFloat(arr[arr.length - 1].replace(/\D/g, ''));
        if (inputRoletaPassageiros) {
          if (!isNaN(numIni) && !isNaN(numFim)) {
            const pass = numFim - numIni;
            inputRoletaPassageiros.value = pass >= 0 ? pass : 0;
          } else {
            inputRoletaPassageiros.value = '';
          }
        }
      } else {
        if (inputRoletaInicial) inputRoletaInicial.value = '';
        if (inputRoletaFinal) inputRoletaFinal.value = '';
        if (inputRoletaPassageiros) inputRoletaPassageiros.value = '';
      }
    }
    calcularTodosValidadorPagantes();
  }

  function vincularLinhaDados(linhaEl) {
    const pontosInputs = linhaEl.querySelectorAll('.col-jornada-hora-ponto');
    pontosInputs.forEach((inp) => {
      inp.readOnly = true;
    });

    const roletasInput = linhaEl.querySelector('.col-jornada-roletas');
    if (roletasInput) {
      // Atualização em tempo real conforme digitação da roleta
      roletasInput.addEventListener('input', () => {
        atualizarRoletasTotaisAutomaticas();
        salvarRascunhoJornada();
      });
      roletasInput.addEventListener('change', () => {
        atualizarRoletasTotaisAutomaticas();
        salvarRascunhoJornada();
      });

      // Apertando Enter no campo sem roleta anotada: a linha desaparece
      roletasInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          if (isLinhaSemRoleta(linhaEl)) {
            e.preventDefault();
            e.stopPropagation();
            linhaEl.remove();
            atualizarRoletasTotaisAutomaticas();
            salvarRascunhoJornada();
          }
        }
      });

      // Saindo do campo (blur): se não tiver roleta anotada e o usuário não clicou nos botões da viagem, desaparece
      roletasInput.addEventListener('blur', () => {
        setTimeout(() => {
          const activeEl = document.activeElement;
          const headerViagem = document.querySelector('.form-jornada-row--viagem-header');
          const clicouNoHeader = headerViagem && (headerViagem === activeEl || headerViagem.contains(activeEl));
          const focoNaLinha = linhaEl && (linhaEl === activeEl || linhaEl.contains(activeEl));

          if (!clicouNoHeader && !focoNaLinha && isLinhaSemRoleta(linhaEl)) {
            linhaEl.remove();
            atualizarRoletasTotaisAutomaticas();
            salvarRascunhoJornada();
          } else {
            atualizarRoletasTotaisAutomaticas();
            salvarRascunhoJornada();
          }
        }, 220);
      });
    }
  }

  // Tocando fora no celular ou clicando fora com mouse/teclado:
  // Mesmo com hora registrada, se não tiver roleta anotada, tem que desaparecer
  const tratarInteracaoFora = (e) => {
    if (!containerLinhasRoletas) return;
    const headerViagem = document.querySelector('.form-jornada-row--viagem-header');
    if (headerViagem && headerViagem.contains(e.target)) return;
    if (btnAbrirModalTroca && (btnAbrirModalTroca === e.target || btnAbrirModalTroca.contains(e.target))) return;
    if (btnTrocaLinhaDireto && (btnTrocaLinhaDireto === e.target || btnTrocaLinhaDireto.contains(e.target))) return;
    if (btnTrocaCarroDireto && (btnTrocaCarroDireto === e.target || btnTrocaCarroDireto.contains(e.target))) return;
    if (btnTrocaAmbosDireto && (btnTrocaAmbosDireto === e.target || btnTrocaAmbosDireto.contains(e.target))) return;
    if (modalTroca && (modalTroca === e.target || modalTroca.contains(e.target))) return;

    const linhas = containerLinhasRoletas.querySelectorAll('.form-jornada-row--viagem-dados');
    let removeuAlguma = false;
    linhas.forEach(linha => {
      if (!linha.contains(e.target) && isLinhaSemRoleta(linha)) {
        linha.remove();
        removeuAlguma = true;
      }
    });
    if (removeuAlguma) {
      atualizarRoletasTotaisAutomaticas();
      salvarRascunhoJornada();
    }
  };

  document.addEventListener('pointerdown', tratarInteracaoFora, true);
  document.addEventListener('touchstart', tratarInteracaoFora, { passive: true, capture: true });

  function obterTodasLinhasRoletas() {
    const sessoes = [];
    if (!containerLinhasRoletas) return sessoes;
    const rows = containerLinhasRoletas.querySelectorAll('.form-jornada-row--viagem-dados');
    const numCarroPadrao = carroNumInput ? carroNumInput.value.trim() : '';

    rows.forEach((row, idx) => {
      const carroInput = row.querySelector('.col-jornada-carro-viagem');
      const roletasInput = row.querySelector('.col-jornada-roletas');
      const pontosInputs = row.querySelectorAll('.col-jornada-hora-ponto');
      const carroVal = (carroInput && carroInput.value.trim()) || numCarroPadrao;
      const roletasVal = roletasInput ? roletasInput.value.trim() : '';
      const p = Array.from(pontosInputs).map(inp => inp.value.trim());

      sessoes.push({
        indice: idx + 1,
        carro: carroVal,
        roletas: roletasVal,
        chegadaPonto2: p[0] || '',
        fiscalizacao1: p[1] || '',
        saidaPonto: p[2] || '',
        chegadaPlaca: p[3] || '',
        fiscalizacao2: p[4] || '',
        saidaPlaca: p[5] || ''
      });
    });
    return sessoes;
  }

  function criarNovaLinhaRoletas(dadosIniciais) {
    if (!containerLinhasRoletas) return;
    totalLinhasRoletas++;

    const row = document.createElement('div');
    row.className = 'form-escala-row form-jornada-row--viagem-dados';
    row.setAttribute('data-linha', totalLinhasRoletas);

    const lista = carregarJornadas();
    const numCarroAtual = (dadosIniciais && dadosIniciais.carro) ||
                          (carroNumInput && carroNumInput.value.trim()) ||
                          (lista.length > 0 && lista[0].carroNumero) || '';

    const roletaVal = (dadosIniciais && dadosIniciais.roletas) || '';
    const p0 = (dadosIniciais && dadosIniciais.chegadaPonto2) || '';
    const p1 = (dadosIniciais && dadosIniciais.fiscalizacao1) || '';
    const p2 = (dadosIniciais && dadosIniciais.saidaPonto) || '';
    const p3 = (dadosIniciais && dadosIniciais.chegadaPlaca) || '';
    const p4 = (dadosIniciais && dadosIniciais.fiscalizacao2) || '';
    const p5 = (dadosIniciais && dadosIniciais.saidaPlaca) || '';

    // Linha com Carro antes de Roletas (8 inputs)
    row.innerHTML = `
      <input type="text" class="input-escala col-jornada-carro-viagem" placeholder="Carro" value="${numCarroAtual}" readonly />
      <input type="text" class="input-escala col-jornada-roletas" placeholder="Roletas" value="${roletaVal}" />
      <input type="text" class="input-escala col-jornada-hora-ponto" placeholder="--:--" maxlength="5" value="${p0}" readonly />
      <input type="text" class="input-escala col-jornada-hora-ponto" placeholder="--:--" maxlength="5" value="${p1}" readonly />
      <input type="text" class="input-escala col-jornada-hora-ponto" placeholder="--:--" maxlength="5" value="${p2}" readonly />
      <input type="text" class="input-escala col-jornada-hora-ponto" placeholder="--:--" maxlength="5" value="${p3}" readonly />
      <input type="text" class="input-escala col-jornada-hora-ponto" placeholder="--:--" maxlength="5" value="${p4}" readonly />
      <input type="text" class="input-escala col-jornada-hora-ponto" placeholder="--:--" maxlength="5" value="${p5}" readonly />
    `;

    containerLinhasRoletas.appendChild(row);
    vincularLinhaDados(row);

    const novoInputRoletas = row.querySelector('.col-jornada-roletas');
    if (!dadosIniciais && novoInputRoletas) {
      novoInputRoletas.focus();
      if (typeof novoInputRoletas.scrollIntoView === 'function') {
        novoInputRoletas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    atualizarRoletasTotaisAutomaticas();
    salvarRascunhoJornada();
  }

  // Vincula o botão Roletas (+) para abrir uma nova linha de inputs logo abaixo
  if (btnRoletas) {
    btnRoletas.addEventListener('click', (e) => {
      e.preventDefault();
      criarNovaLinhaRoletas();
    });
  }

  // Vincula os botões de ponto da linha de cabeçalho para preencher a linha ativa
  if (btnChegadaPonto2) {
    btnChegadaPonto2.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPontoColuna(0);
    });
  }
  if (btnFiscalizacao1) {
    btnFiscalizacao1.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPontoColuna(1);
    });
  }
  if (btnSaidaPonto) {
    btnSaidaPonto.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPontoColuna(2);
    });
  }
  if (btnChegadaPlaca) {
    btnChegadaPlaca.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPontoColuna(3);
    });
  }
  if (btnFiscalizacao2) {
    btnFiscalizacao2.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPontoColuna(4);
    });
  }
  if (btnSaidaPlaca) {
    btnSaidaPlaca.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPontoColuna(5);
    });
  }

  function sincronizarCarroComUltimaJornada() {
    const lista = carregarJornadas();
    if (lista.length > 0 && lista[0].carroNumero) {
      const ultimoCarro = lista[0].carroNumero;
      document.querySelectorAll('.col-jornada-carro-viagem').forEach(inp => {
        if (!inp.value.trim()) inp.value = ultimoCarro;
      });
    }
    atualizarRoletasTotaisAutomaticas();
  }

  // Vincula a primeira linha caso exista
  if (containerLinhasRoletas) {
    const primeiraLinha = containerLinhasRoletas.querySelector('.form-jornada-row--viagem-dados');
    if (primeiraLinha) {
      vincularLinhaDados(primeiraLinha);
    }
  }

  sincronizarCarroComUltimaJornada();

  /* --- Renderização inicial --- */
  renderizarJornadas();

  /* --- Restauração de Rascunho Offline da Jornada --- */
  restaurarRascunhoJornada();
  renderizarSecoesMultiCarro();
  calcularTodosValidadorPagantes();

  /* --- Eventos de Salvamento de Rascunho em Tempo Real --- */
  if (containerValidadorLinhas) {
    containerValidadorLinhas.addEventListener('input', (e) => {
      if (e.target && e.target.classList && (
        e.target.classList.contains('validador-gratuidade-item') ||
        e.target.classList.contains('validador-vales-item') ||
        e.target.classList.contains('validador-qrcode-item')
      )) {
        calcularTodosValidadorPagantes();
        coletarValoresCamposMultiCarro();
        salvarRascunhoJornada();
      }
    });
  }

  if (form) {
    form.addEventListener('input', salvarRascunhoJornada);
    form.addEventListener('change', salvarRascunhoJornada);
  }
  window.addEventListener('beforeunload', salvarRascunhoJornada);
}

/* ============================================================
   PONTO DE ENTRADA PRINCIPAL
   ============================================================ */

function initApp() {
  console.group('[App] Controle do Motorista — Inicializando...');
  try {
    const deviceType = applyDeviceClass();
    updateCurrentDate();
    updateFooterYear();
    updateFooterVersion();
    initPolyfillFormSubmit();
    initEnterNavigationAndSubmitLock();
    initCardButtonListeners();
    initEscalaModule();
    initLinhasModule();
    initLinhaAutoLookup();
    initMotoristasModule();
    initMotoristaAutoLookup();
    initCarrosModule();
    initAvariasModule();
    initJornadaModule();
    registerDeviceResizeListener();
    console.info(`[App] Sistema pronto no modo: ${deviceType}`);
  } catch (err) {
    console.error('[App] Erro na inicialização do script.js:', err);
  }
  console.groupEnd();
}

// Namespace global para utilitários e inspeção
window.ControleMotorista = Object.assign(window.ControleMotorista || {}, {
  getDeviceType: detectDeviceType,
  updateDate: updateCurrentDate,
  buscarDadosLinha: buscarDadosLinha,
  buscarNomeMotorista: buscarNomeMotorista,
  buscarDadosCarro: buscarDadosCarro,
  versao: window.VERSAO_SISTEMA || '2.1.0'
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
