# Regras do Projeto — Controle do Motorista

## 1. Controle Obrigatório de Versão (`versao.js`)
- **TODA E QUALQUER ALTERAÇÃO** feita no projeto (HTML, CSS, JS ou qualquer arquivo) **DEVE** obrigatoriamente vir acompanhada de um incremento de versão no arquivo `versao.js`.
- O arquivo `versao.js` é a única fonte de verdade para a versão do sistema.
- A versão é injetada automaticamente no rodapé (`.app-footer__version`) de todas as páginas da aplicação.
- Padrão de versionamento: `vX.Y.Z` (Semantic Versioning):
  - **Patch (`Z`)**: Pequenas correções de bugs ou pequenos ajustes visuais.
  - **Minor (`Y`)**: Adição de novos campos, funcionalidades ou melhorias em módulos existentes.
  - **Major (`X`)**: Novo módulo completo, reformulação estrutural ou grandes entregas.
