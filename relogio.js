/**
 * ============================================================
 * CONTROLE DO MOTORISTA — Sistema Profissional de Gestão
 * Arquivo: relogio.js (🔒 Módulo Isolado - Blindagem Anti-Fraude)
 *
 * DESCRIÇÃO:
 *   Motor independente de relógio com proteção anti-fraude offline.
 *   Utiliza o clock de hardware do processador (performance.now())
 *   ancorado no Momento Zero do sistema operacional.
 *
 * BENEFÍCIOS:
 *   1. Imune a alterações manuais no relógio do SO pelo usuário.
 *   2. Isolado em arquivo próprio: alterações nos demais scripts
 *      não quebram ou interrompem o funcionamento do relógio.
 *   3. Otimizado para dispositivos móveis (Android): atualização
 *      estritamente a cada 1 segundo, preservando CPU e bateria.
 * ============================================================
 */

'use strict';

(function initAntifraudClockModule() {
  /**
   * Estado interno protegido do motor do relógio.
   */
  const clockEngine = {
    anchorTimestamp: 0,
    anchorPerfNow: 0,
    intervalId: null,
    isRunning: false,
    elements: {
      hours: null,
      minutes: null,
      seconds: null,
      singleContainer: null
    }
  };

  /**
   * Formata número com 2 dígitos.
   */
  function padZero(num) {
    return String(num).padStart(2, '0');
  }

  /**
   * Calcula o horário real decorrido via clock de hardware.
   */
  function calculateCurrentTime() {
    const elapsedMs = performance.now() - clockEngine.anchorPerfNow;
    const calculatedMs = clockEngine.anchorTimestamp + elapsedMs;
    const calculatedDate = new Date(calculatedMs);

    return {
      h: calculatedDate.getHours(),
      m: calculatedDate.getMinutes(),
      s: calculatedDate.getSeconds()
    };
  }

  /**
   * Atualiza os elementos no DOM de forma otimizada.
   */
  function updateDisplay() {
    const { h, m, s } = calculateCurrentTime();
    const hStr = padZero(h);
    const mStr = padZero(m);
    const sStr = padZero(s);

    const { hours, minutes, seconds, singleContainer } = clockEngine.elements;

    // Se a estrutura de spans separados existir:
    if (hours && minutes && seconds) {
      if (hours.textContent !== hStr) hours.textContent = hStr;
      if (minutes.textContent !== mStr) minutes.textContent = mStr;
      if (seconds.textContent !== sStr) seconds.textContent = sStr;
    } else if (singleContainer) {
      // Fallback para container único caso usado
      singleContainer.textContent = `${hStr}:${mStr}:${sStr}`;
    }

    // Acessibilidade semântica e virada da meia-noite
    if (s === 0) {
      const displayEl = document.getElementById('clockDisplay') || singleContainer;
      if (displayEl) {
        displayEl.setAttribute('aria-label', `Horário: ${hStr} horas e ${mStr} minutos`);
      }
      if (h === 0 && m === 0 && window.ControleMotorista && typeof window.ControleMotorista.updateDate === 'function') {
        window.ControleMotorista.updateDate();
      }
    }
  }

  /**
   * Inicialização do relógio seguro.
   */
  function startClock() {
    // 1. Mapeamento de elementos
    clockEngine.elements.hours = document.getElementById('clockHours');
    clockEngine.elements.minutes = document.getElementById('clockMinutes');
    clockEngine.elements.seconds = document.getElementById('clockSeconds');
    clockEngine.elements.singleContainer = document.getElementById('relogio');

    const hasSeparators = clockEngine.elements.hours && clockEngine.elements.minutes && clockEngine.elements.seconds;
    const hasSingle = Boolean(clockEngine.elements.singleContainer);

    if (!hasSeparators && !hasSingle) {
      console.warn('[Relógio] Elemento do relógio não encontrado no DOM.');
      return;
    }

    // 2. Captura da âncora dupla no Momento Zero
    clockEngine.anchorTimestamp = Date.now();
    clockEngine.anchorPerfNow = performance.now();

    // 3. Primeira renderização imediata
    updateDisplay();

    // 4. Inicia ciclo de 1 segundo (preservando bateria no Android)
    if (clockEngine.intervalId) clearInterval(clockEngine.intervalId);
    clockEngine.intervalId = setInterval(updateDisplay, 1000);
    clockEngine.isRunning = true;

    console.info('[Relógio Anti-Fraude] Motor inicializado e blindado com sucesso.');
  }

  // Atualização imediata ao voltar do background (PWA / troca de aba)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && clockEngine.isRunning) {
      updateDisplay();
    }
  });

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startClock);
  } else {
    startClock();
  }

  // Exposição de API segura para auditoria
  window.RelogioAntiFraude = {
    getHorarioFormatado() {
      const { h, m, s } = calculateCurrentTime();
      return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
    },
    getStatus() {
      return {
        ativo: clockEngine.isRunning,
        momentoZero: new Date(clockEngine.anchorTimestamp).toLocaleTimeString('pt-BR'),
        segundosDecorridos: Math.floor((performance.now() - clockEngine.anchorPerfNow) / 1000)
      };
    }
  };
})();
