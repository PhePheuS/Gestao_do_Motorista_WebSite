/**
 * ============================================================
 * CONTROLE DO MOTORISTA — Sistema Profissional de Gestão
 * Arquivo: versao.js
 * Descrição: Controle centralizado de versão do sistema.
 *            Atualiza automaticamente todos os rodapés da aplicação.
 * ============================================================
 */

'use strict';

(function () {
  // CONFIGURAÇÃO CENTRAL DE VERSÃO
  // ATENÇÃO: Incrementar esta versão a cada alteração no projeto!
  const VERSAO_ATUAL = '2.37.0';
  const DATA_VERSAO = '2026-08-30';

  // Exporta globalmente
  window.VERSAO_SISTEMA = VERSAO_ATUAL;
  window.DATA_VERSAO_SISTEMA = DATA_VERSAO;

  // Garante atualização no ControleMotorista se já existir ou quando for criado
  if (!window.ControleMotorista) {
    window.ControleMotorista = {};
  }
  window.ControleMotorista.versao = VERSAO_ATUAL;

  /**
   * Aplica a versão atual em todos os elementos de rodapé da página.
   */
  function aplicarVersaoNoRodape() {
    const elementos = document.querySelectorAll('.app-footer__version, [data-versao]');
    elementos.forEach(function (el) {
      el.textContent = 'v' + VERSAO_ATUAL;
    });

    const elementoAno = document.getElementById('footerYear');
    if (elementoAno) {
      elementoAno.textContent = new Date().getFullYear();
    }
  }

  // Executa imediatamente se o DOM já estiver pronto, ou aguarda o carregamento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarVersaoNoRodape);
  } else {
    aplicarVersaoNoRodape();
  }

  // Registra globalmente para chamadas manuais se necessário
  window.atualizarVersaoRodape = aplicarVersaoNoRodape;
})();
