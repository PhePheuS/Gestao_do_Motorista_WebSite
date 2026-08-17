let rowCount = 0;
let timeOffset = 0; 
let lastDeletedData = null; 
let linesHistory = []; 
let carsHistory = [];
let sessionsHistory = []; // cada carro+linha ativa = 1 sessão = 1 coluna nas tabelas 

function initDashboard() {
    const tableBody = document.getElementById('trip-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    rowCount = 0;

    syncClock();
    setInterval(updateClock, 1000);
    setInterval(syncClock, 600000);

    const savedData = localStorage.getItem('driver_control_data');
    if (savedData) {
        loadData(JSON.parse(savedData));
    } else {
        linesHistory = [];
        carsHistory = [];
        sessionsHistory = [];
        
        const dataInput = document.getElementById('header-data');
        if (dataInput && !dataInput.value) {
            const hoje = new Date();
            const dia = padZero(hoje.getDate());
            const mes = padZero(hoje.getMonth() + 1);
            const ano = hoje.getFullYear();
            const raw = `${dia}${mes}${ano}`;
            dataInput.value = raw;
            dataInput.dataset.rawDate = raw;
            formatDateLong(dataInput);
        }

        renderLinesHistory();
        renderCarsHistory();
        addRow();
    }

    document.getElementById('btn-novo').addEventListener('click', resetForm);
    const btnWhatsApp = document.getElementById('btn-whatsapp');
    if (btnWhatsApp) btnWhatsApp.addEventListener('click', enviarWhatsApp);
    document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

    const btnInserirLinha = document.getElementById('btn-inserir-linha');
    if (btnInserirLinha) btnInserirLinha.addEventListener('click', inserirNovaLinha);

    const btnInserirCarro = document.getElementById('btn-inserir-carro');
    if (btnInserirCarro) btnInserirCarro.addEventListener('click', inserirNovoCarro);

    ['input-nova-linha', 'input-nova-desc', 'input-novo-carro', 'input-novas-avarias'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (id.includes('linha')) inserirNovaLinha();
                    else inserirNovoCarro();
                }
            });
        }
    });

    const btnUndo = document.createElement('button');
    btnUndo.id = 'btn-undo';
    btnUndo.className = 'btn btn-secondary no-print';
    btnUndo.style.display = 'none';
    btnUndo.innerHTML = '<span class="icon">↺</span> Desfazer Limpeza';
    btnUndo.onclick = undoReset;
    document.querySelector('.action-bar').appendChild(btnUndo);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === 'Tab') {
            const inputs = Array.from(document.querySelectorAll('input:not([readonly]):not([type="hidden"])'));
            const index = inputs.indexOf(e.target);
            
            if (e.target.id.startsWith('rol-')) {
                const rows = document.querySelectorAll('#trip-table-body tr');
                const lastRow = rows[rows.length - 1];
                if (e.target.id === `rol-${lastRow.dataset.index}`) {
                    e.preventDefault();
                    addRow();
                    setTimeout(() => {
                        const newRows = document.querySelectorAll('#trip-table-body tr');
                        const nextH1 = document.getElementById(`h1-${newRows[newRows.length-1].dataset.index}`);
                        if (nextH1) nextH1.focus();
                    }, 10);
                    return;
                }
            }

            if (e.key === 'Enter' && index > -1 && index < inputs.length - 1) {
                e.preventDefault();
                inputs[index + 1].focus();
            }
        }
    });

    document.addEventListener('input', saveToLocal);

    const dataInput = document.getElementById('header-data');
    if (dataInput) {
        dataInput.addEventListener('focus', (e) => {
            if (e.target.dataset.rawDate) {
                e.target.value = e.target.dataset.rawDate;
            } else {
                e.target.value = e.target.value.replace(/\D/g, "");
            }
            e.target.select();
        });
        
        dataInput.addEventListener('blur', (e) => {
            // Se já estiver formatado (contém letras), não faz nada
            if (/[a-zA-Z]/.test(e.target.value)) {
                return;
            }
            let val = e.target.value.replace(/\D/g, "");
            if (val.length === 6 || val.length === 8) {
                e.target.dataset.rawDate = val;
                formatDateLong(e.target);
            } else if (val === "") {
                const hoje = new Date();
                const dia = padZero(hoje.getDate());
                const mes = padZero(hoje.getMonth() + 1);
                const ano = hoje.getFullYear();
                const raw = `${dia}${mes}${ano}`;
                e.target.value = raw;
                e.target.dataset.rawDate = raw;
                formatDateLong(e.target);
            } else {
                if (e.target.dataset.rawDate) {
                    e.target.value = e.target.dataset.rawDate;
                    formatDateLong(e.target);
                }
            }
            saveToLocal();
        });
        
        dataInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, "");
            if (val.length === 8) {
                e.target.blur(); // Dispara o blur que faz a formatação uma única vez
            }
        });
    }

    const pegadaInput = document.getElementById('header-pegada');
    if (pegadaInput) pegadaInput.addEventListener('input', (e) => formatTime(e.target));

    const vendaInput = document.getElementById('header-venda');
    if (vendaInput) {
        vendaInput.addEventListener('input', (e) => formatCurrency(e.target));
        if (vendaInput.value) {
            formatCurrency(vendaInput);
        }
    }

    const motInput = document.getElementById('header-motorista');
    const matInput = document.getElementById('header-matricula');
    if (motInput) {
        if (!motInput.value) motInput.value = localStorage.getItem('saved_motorista') || "";
        motInput.addEventListener('input', (e) => {
            localStorage.setItem('saved_motorista', e.target.value);
            saveToLocal();
        });
    }
    if (matInput) {
        if (!matInput.value) matInput.value = localStorage.getItem('saved_matricula') || "";
        matInput.addEventListener('input', (e) => {
            localStorage.setItem('saved_matricula', e.target.value);
            saveToLocal();
        });
    }

    const btnFecharModal = document.getElementById('btn-fechar-modal');
    if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalWhatsApp);
    const waModal = document.getElementById('whatsapp-modal');
    if (waModal) {
        waModal.addEventListener('click', (e) => {
            if (e.target === waModal) fecharModalWhatsApp();
        });
    }

    calculateTotals();
}

function inserirNovaLinha() {
    const inputNum = document.getElementById('input-nova-linha');
    const inputDesc = document.getElementById('input-nova-desc');
    if (inputNum && inputNum.value.trim() !== "") {
        const newLineNum = inputNum.value.toUpperCase();
        const newLineDesc = inputDesc.value || "Linha não especificada";
        linesHistory.push({ num: newLineNum, desc: newLineDesc });

        // Nova sessão: carro ativo atual + nova linha
        const activeCar = document.getElementById('header-carro')?.value || "";
        const existingSession = activeCar ? sessionsHistory.find(s => s.carNum === activeCar && s.lineNum === "") : null;
        if (existingSession) {
            existingSession.lineNum = newLineNum;
        } else {
            sessionsHistory.push({
                carNum: activeCar,
                lineNum: newLineNum,
                val: { gratuidades: "", vt: "", qr: "" },
                fil: { coleta: "", pagantes: "", gratuidades: "", vt: "" }
            });
        }

        renderLinesHistory();
        inputNum.value = ""; inputDesc.value = "";
        calculateTotals();
        saveToLocal();
    } else inputNum.focus();
}

function inserirNovoCarro() {
    const inputNum = document.getElementById('input-novo-carro');
    const inputAvarias = document.getElementById('input-novas-avarias');
    const activeLinha = document.getElementById('header-linha-num')?.value || "";
    if (inputNum && inputNum.value.trim() !== "") {
        const newCarNum = inputNum.value.toUpperCase();
        carsHistory.push({ 
            num: newCarNum, 
            avarias: inputAvarias.value || "Nenhuma avaria relatada",
            linha: activeLinha
        });

        // Nova sessão: novo carro + linha ativa atual
        const existingSession = activeLinha ? sessionsHistory.find(s => s.lineNum === activeLinha && s.carNum === "") : null;
        if (existingSession) {
            existingSession.carNum = newCarNum;
        } else {
            sessionsHistory.push({
                carNum: newCarNum,
                lineNum: activeLinha,
                val: { gratuidades: "", vt: "", qr: "" },
                fil: { coleta: "", pagantes: "", gratuidades: "", vt: "" }
            });
        }

        renderCarsHistory();
        inputNum.value = ""; inputAvarias.value = "";
        calculateTotals();
        saveToLocal();
    } else inputNum.focus();
}

function renderLinesHistory() {
    const container = document.getElementById('lines-history-container');
    const displayNum = document.getElementById('header-linha-num');
    const displayDesc = document.getElementById('header-linha-nome');
    if (!container) return;
    container.innerHTML = "";
    linesHistory.forEach((linha, index) => {
        const isActive = index === linesHistory.length - 1;
        const lineEl = document.createElement('div');
        lineEl.style = `display: flex; gap: 1.5rem; padding: 0.5rem; border-left: ${isActive ? '4px solid var(--accent-blue)' : '2px solid var(--border-color)'}; background: ${isActive ? 'rgba(47, 129, 247, 0.05)' : 'transparent'}; border-radius: 0 8px 8px 0;`;
        lineEl.innerHTML = `
            <div style="flex: 0 0 80px;">
                <span style="font-size: 0.6rem; display: block; opacity: 0.6;">Nº LINHA:</span>
                <span style="color: var(--accent-blue); font-weight: bold; font-size: 1.1rem;">${linha.num}</span>
            </div>
            <div style="flex: 1;">
                <span style="font-size: 0.6rem; display: block; opacity: 0.6;">DESCRIÇÃO: ${isActive ? '<strong style="color: #4ade80; margin-left: 10px;">[ ATIVA ]</strong>' : ''}</span>
                <span style="color: var(--text-value); font-size: 1.1rem;">${linha.desc}</span>
            </div>
        `;
        container.appendChild(lineEl);
        if (isActive) { displayNum.value = linha.num; displayDesc.value = linha.desc; }
    });
    updateActiveRowData();
    renderTables();
}

function updateActiveRowData() {
    const activeCar = document.getElementById('header-carro')?.value || "";
    const activeLinha = document.getElementById('header-linha-num')?.value || "";
    
    const rows = document.querySelectorAll('#trip-table-body tr');
    rows.forEach(row => {
        const idx = row.dataset.index;
        const carInput = document.getElementById(`car-${idx}`);
        const linInput = document.getElementById(`lin-${idx}`);
        
        if (carInput && carInput.value === "") carInput.value = activeCar;
        if (linInput && linInput.value === "") linInput.value = activeLinha;
    });
    calculateTotals();
    saveToLocal();
}

function renderTables() {
    const valContainer = document.getElementById('validator-table-container');
    const filContainer = document.getElementById('filipeta-table-container');
    if (!valContainer || !filContainer) return;

    if (sessionsHistory.length === 0) {
        valContainer.innerHTML = "<div style='padding: 1rem; text-align: center; color: var(--text-label);'>Insira um carro e uma linha para iniciar.</div>";
        filContainer.innerHTML = "<div style='padding: 1rem; text-align: center; color: var(--text-label);'>Insira um carro e uma linha para iniciar.</div>";
        return;
    }

    // 1. Render Validador Table HTML
    let valHtml = `
        <table class="info-table">
            <tbody>
                <tr>
                    <td class="label-col">Carro</td>
    `;
    sessionsHistory.forEach((session) => {
        valHtml += `<td class="val-col"><span class="info-table-carro-val">${session.carNum || '--'}</span></td>`;
    });
    valHtml += `
                </tr>
                <tr>
                    <td class="label-col">Linha</td>
    `;
    sessionsHistory.forEach((session) => {
        valHtml += `<td class="val-col"><span class="info-table-linha-val">${session.lineNum || '--'}</span></td>`;
    });
    valHtml += `
                </tr>
                <tr>
                    <td class="label-col">Gratuidades</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.val) session.val = { gratuidades: "", vt: "", qr: "" };
        valHtml += `<td class="val-col"><input type="number" class="info-table-input val-input-field" data-session-idx="${index}" data-field="gratuidades" placeholder="0" value="${session.val.gratuidades !== undefined && session.val.gratuidades !== 0 ? session.val.gratuidades : ''}"></td>`;
    });
    valHtml += `
                </tr>
                <tr>
                    <td class="label-col">Vales Transportes</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.val) session.val = { gratuidades: "", vt: "", qr: "" };
        valHtml += `<td class="val-col"><input type="number" class="info-table-input val-input-field" data-session-idx="${index}" data-field="vt" placeholder="0" value="${session.val.vt !== undefined && session.val.vt !== 0 ? session.val.vt : ''}"></td>`;
    });
    valHtml += `
                </tr>
                <tr>
                    <td class="label-col">QR Code</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.val) session.val = { gratuidades: "", vt: "", qr: "" };
        valHtml += `<td class="val-col"><input type="number" class="info-table-input val-input-field" data-session-idx="${index}" data-field="qr" placeholder="0" value="${session.val.qr !== undefined && session.val.qr !== 0 ? session.val.qr : ''}"></td>`;
    });
    valHtml += `
                </tr>
                <tr class="total-row-style">
                    <td class="label-col">Total Pagantes</td>
    `;
    sessionsHistory.forEach((session, index) => {
        valHtml += `<td class="val-col"><span id="val-total-pagantes-${index}">00</span></td>`;
    });
    valHtml += `
                </tr>
                <tr class="total-row-style">
                    <td class="label-col">Total Passageiros</td>
    `;
    sessionsHistory.forEach((session, index) => {
        valHtml += `<td class="val-col"><span id="val-total-pax-${index}">00</span></td>`;
    });
    valHtml += `
                </tr>
            </tbody>
        </table>
    `;
    valContainer.innerHTML = valHtml;

    // 2. Render Filipeta Table HTML
    let filHtml = `
        <table class="info-table">
            <tbody>
                <tr>
                    <td class="label-col">Carro</td>
    `;
    sessionsHistory.forEach((session) => {
        filHtml += `<td class="val-col"><span class="info-table-carro-val">${session.carNum || '--'}</span></td>`;
    });
    filHtml += `
                </tr>
                <tr>
                    <td class="label-col">Linha</td>
    `;
    sessionsHistory.forEach((session) => {
        filHtml += `<td class="val-col"><span class="info-table-linha-val">${session.lineNum || '--'}</span></td>`;
    });
    filHtml += `
                </tr>
                <tr>
                    <td class="label-col">N. Coleta</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.fil) session.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
        filHtml += `<td class="val-col"><input type="text" class="info-table-input fil-input-field" data-session-idx="${index}" data-field="coleta" placeholder="000000" value="${session.fil.coleta || ''}"></td>`;
    });
    filHtml += `
                </tr>
                <tr>
                    <td class="label-col">Pagantes</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.fil) session.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
        filHtml += `<td class="val-col"><input type="number" class="info-table-input fil-input-field" data-session-idx="${index}" data-field="pagantes" placeholder="0" value="${session.fil.pagantes !== undefined && session.fil.pagantes !== 0 ? session.fil.pagantes : ''}"></td>`;
    });
    filHtml += `
                </tr>
                <tr>
                    <td class="label-col">Gratuidades</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.fil) session.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
        filHtml += `<td class="val-col"><input type="number" class="info-table-input fil-input-field" data-session-idx="${index}" data-field="gratuidades" placeholder="0" value="${session.fil.gratuidades !== undefined && session.fil.gratuidades !== 0 ? session.fil.gratuidades : ''}"></td>`;
    });
    filHtml += `
                </tr>
                <tr>
                    <td class="label-col">Vales Transporte</td>
    `;
    sessionsHistory.forEach((session, index) => {
        if (!session.fil) session.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
        filHtml += `<td class="val-col"><input type="number" class="info-table-input fil-input-field" data-session-idx="${index}" data-field="vt" placeholder="0" value="${session.fil.vt !== undefined && session.fil.vt !== 0 ? session.fil.vt : ''}"></td>`;
    });
    filHtml += `
                </tr>
                <tr class="total-row-style">
                    <td class="label-col">Total Pagantes</td>
    `;
    sessionsHistory.forEach((session, index) => {
        filHtml += `<td class="val-col"><span id="fil-total-pagantes-${index}">00</span></td>`;
    });
    filHtml += `
                </tr>
                <tr class="total-row-style" style="color: var(--text-value);">
                    <td class="label-col">Total Passageiros</td>
    `;
    sessionsHistory.forEach((session, index) => {
        filHtml += `<td class="val-col"><span id="fil-total-pax-${index}">00</span></td>`;
    });
    filHtml += `
                </tr>
            </tbody>
        </table>
    `;
    filContainer.innerHTML = filHtml;

    // Attach event listeners
    document.querySelectorAll('.val-input-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.sessionIdx);
            const field = e.target.dataset.field;
            const value = parseInt(e.target.value) || 0;
            if (sessionsHistory[idx]) {
                if (!sessionsHistory[idx].val) sessionsHistory[idx].val = { gratuidades: "", vt: "", qr: "" };
                sessionsHistory[idx].val[field] = value;
                calculateTotals();
                saveToLocal();
            }
        });
    });

    document.querySelectorAll('.fil-input-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.sessionIdx);
            const field = e.target.dataset.field;
            const value = e.target.type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value;
            if (sessionsHistory[idx]) {
                if (!sessionsHistory[idx].fil) sessionsHistory[idx].fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
                sessionsHistory[idx].fil[field] = value;
                calculateTotals();
                saveToLocal();
            }
        });
    });
    calculateTotals();
}

function renderCarsHistory() {
    const container = document.getElementById('cars-history-container');
    const displayNum = document.getElementById('header-carro');
    const displayAvarias = document.getElementById('avarias-input');
    if (!container) return;
    container.innerHTML = "";
    carsHistory.forEach((carro, index) => {
        const isActive = index === carsHistory.length - 1;
        const carEl = document.createElement('div');
        carEl.style = `display: flex; gap: 1.5rem; padding: 0.5rem; border-left: ${isActive ? '4px solid #f39c12' : '2px solid var(--border-color)'}; background: ${isActive ? 'rgba(247, 147, 47, 0.05)' : 'transparent'}; border-radius: 0 8px 8px 0;`;
        carEl.innerHTML = `
            <div style="flex: 0 0 80px;">
                <span style="font-size: 0.6rem; display: block; opacity: 0.6;">Nº CARRO:</span>
                <span style="color: #f39c12; font-weight: bold; font-size: 1.1rem;">${carro.num}</span>
            </div>
            <div style="flex: 1;">
                <span style="font-size: 0.6rem; display: block; opacity: 0.6;">AVARIAS: ${isActive ? '<strong style="color: #4ade80; margin-left: 10px;">[ ATIVO ]</strong>' : ''}</span>
                <span style="color: var(--text-value); font-size: 1.1rem;">${carro.avarias}</span>
            </div>
        `;
        container.appendChild(carEl);
        if (isActive) { 
            displayNum.value = carro.num; 
            displayAvarias.value = carro.avarias;
            const vTitle = document.querySelector('.info-card:nth-child(1) h3');
            const fTitle = document.querySelector('.info-card:nth-child(2) h3');
            if (vTitle) vTitle.innerHTML = `INFORMAÇÕES VALIDADOR`;
            if (fTitle) fTitle.innerHTML = `INFORMAÇÕES FILIPETA`;
        }
    });
    updateActiveRowData();
    renderTables();
}

function cleanSessionsHistory() {
    // 1. Deduplicar exatos (mesmo carro e linha)
    for (let i = sessionsHistory.length - 1; i >= 0; i--) {
        const s = sessionsHistory[i];
        const firstIdx = sessionsHistory.findIndex(o => o.carNum === s.carNum && o.lineNum === s.lineNum);
        if (firstIdx !== i) {
            const mainSession = sessionsHistory[firstIdx];
            if (s.val) {
                if (!mainSession.val) mainSession.val = { gratuidades: "", vt: "", qr: "" };
                mainSession.val.gratuidades = mainSession.val.gratuidades || s.val.gratuidades;
                mainSession.val.vt = mainSession.val.vt || s.val.vt;
                mainSession.val.qr = mainSession.val.qr || s.val.qr;
            }
            if (s.fil) {
                if (!mainSession.fil) mainSession.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
                mainSession.fil.coleta = mainSession.fil.coleta || s.fil.coleta;
                mainSession.fil.pagantes = mainSession.fil.pagantes || s.fil.pagantes;
                mainSession.fil.gratuidades = mainSession.fil.gratuidades || s.fil.gratuidades;
                mainSession.fil.vt = mainSession.fil.vt || s.fil.vt;
            }
            sessionsHistory.splice(i, 1);
        }
    }

    // 2. Mesclar sessões incompletas (ex: carro com linha vazia quando já existe o mesmo carro com linha preenchida)
    for (let i = sessionsHistory.length - 1; i >= 0; i--) {
        const s = sessionsHistory[i];
        if (s.lineNum === "" && s.carNum !== "") {
            const mainSession = sessionsHistory.find(o => o.carNum === s.carNum && o.lineNum !== "");
            if (mainSession) {
                if (s.val) {
                    if (!mainSession.val) mainSession.val = { gratuidades: "", vt: "", qr: "" };
                    mainSession.val.gratuidades = mainSession.val.gratuidades || s.val.gratuidades;
                    mainSession.val.vt = mainSession.val.vt || s.val.vt;
                    mainSession.val.qr = mainSession.val.qr || s.val.qr;
                }
                if (s.fil) {
                    if (!mainSession.fil) mainSession.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
                    mainSession.fil.coleta = mainSession.fil.coleta || s.fil.coleta;
                    mainSession.fil.pagantes = mainSession.fil.pagantes || s.fil.pagantes;
                    mainSession.fil.gratuidades = mainSession.fil.gratuidades || s.fil.gratuidades;
                    mainSession.fil.vt = mainSession.fil.vt || s.fil.vt;
                }
                sessionsHistory.splice(i, 1);
            }
        } else if (s.carNum === "" && s.lineNum !== "") {
            const mainSession = sessionsHistory.find(o => o.lineNum === s.lineNum && o.carNum !== "");
            if (mainSession) {
                if (s.val) {
                    if (!mainSession.val) mainSession.val = { gratuidades: "", vt: "", qr: "" };
                    mainSession.val.gratuidades = mainSession.val.gratuidades || s.val.gratuidades;
                    mainSession.val.vt = mainSession.val.vt || s.val.vt;
                    mainSession.val.qr = mainSession.val.qr || s.val.qr;
                }
                if (s.fil) {
                    if (!mainSession.fil) mainSession.fil = { coleta: "", pagantes: "", gratuidades: "", vt: "" };
                    mainSession.fil.coleta = mainSession.fil.coleta || s.fil.coleta;
                    mainSession.fil.pagantes = mainSession.fil.pagantes || s.fil.pagantes;
                    mainSession.fil.gratuidades = mainSession.fil.gratuidades || s.fil.gratuidades;
                    mainSession.fil.vt = mainSession.fil.vt || s.fil.vt;
                }
                sessionsHistory.splice(i, 1);
            }
        }
    }
}

function loadData(data) {
    if (data.header) {
        Object.keys(data.header).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.value = data.header[id];
                else el.textContent = data.header[id];
            }
        });
        if (data.header['header-data-raw']) {
            const dataInput = document.getElementById('header-data');
            if (dataInput) dataInput.dataset.rawDate = data.header['header-data-raw'];
        }
    }
    const motInput = document.getElementById('header-motorista');
    const matInput = document.getElementById('header-matricula');
    if (motInput && !motInput.value) motInput.value = localStorage.getItem('saved_motorista') || "";
    if (matInput && !matInput.value) matInput.value = localStorage.getItem('saved_matricula') || "";

    linesHistory = data.linesHistory || [];
    carsHistory = data.carsHistory || [];
    sessionsHistory = data.sessionsHistory || [];
    cleanSessionsHistory();

    // Migração: se não há sessionsHistory mas há carsHistory antigo, inicializa a partir dele
    if (sessionsHistory.length === 0 && carsHistory.length > 0) {
        carsHistory.forEach(car => {
            sessionsHistory.push({
                carNum: car.num,
                lineNum: car.linha || "",
                val: car.val || { gratuidades: "", vt: "", qr: "" },
                fil: car.fil || { coleta: "", pagantes: "", gratuidades: "", vt: "" }
            });
        });
    }

    renderLinesHistory();
    renderCarsHistory();

    // Restaurar cabeçalhos dinâmicos
    if (data.dynamicHeaders) {
        const headerRow = document.getElementById('dynamic-table-headers');
        if (headerRow) {
            const ths = headerRow.querySelectorAll('th');
            data.dynamicHeaders.forEach((name, i) => {
                if (ths[i] && i < 4) ths[i].textContent = name;
            });
        }
    }

    const tableBody = document.getElementById('trip-table-body');
    tableBody.innerHTML = "";
    rowCount = 0;
    if (data.trips && data.trips.length > 0) {
        data.trips.forEach(trip => addRow(trip));
    } else addRow();

    updateDynamicHeaders();
    calculateTotals();
}

async function syncClock() {
    const savedOffset = localStorage.getItem('clock_offset');
    if (savedOffset) timeOffset = parseFloat(savedOffset);
    try {
        const response = await fetch('https://worldtimeapi.org/api/ip');
        if (response.ok) {
            const data = await response.json();
            timeOffset = new Date(data.datetime).getTime() - Date.now();
            localStorage.setItem('clock_offset', timeOffset);
        }
    } catch (error) {}
}

function updateClock() {
    const clockEl = document.getElementById('real-time-clock');
    if (clockEl) {
        const now = new Date(Date.now() + timeOffset);
        clockEl.textContent = `${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(now.getSeconds())}`;
    }
}

function addRow(trip = { carro: "", linha: "", roleta: "", h1: "", h2: "", h3: "", h4: "" }) {
    const tableBody = document.getElementById('trip-table-body');
    const headerCarroValue = document.getElementById('header-carro')?.value || "";
    const headerLinhaValue = document.getElementById('header-linha-num')?.value || "";
    const i = rowCount++;
    const row = document.createElement('tr');
    row.dataset.index = i;
    
    row.innerHTML = `
        <td><input type="text" id="h1-${i}" class="trip-input time-mask" value="${trip.h1}"></td>
        <td><input type="text" id="h2-${i}" class="trip-input time-mask" value="${trip.h2}"></td>
        <td><input type="text" id="h3-${i}" class="trip-input time-mask" value="${trip.h3}"></td>
        <td><input type="text" id="h4-${i}" class="trip-input time-mask" value="${trip.h4}"></td>
        <td><input type="text" id="car-${i}" class="trip-input" value="${trip.carro || headerCarroValue}" readonly tabindex="-1" style="color: #f39c12; font-weight: bold; cursor: default;"></td>
        <td><input type="text" id="lin-${i}" class="trip-input" value="${trip.linha || headerLinhaValue}" readonly tabindex="-1" style="color: var(--accent-blue); font-weight: bold; cursor: default;"></td>
        <td><input type="number" id="rol-${i}" class="trip-input roleta-column" value="${trip.roleta}"></td>
        <td><input type="text" id="pax-${i}" class="trip-input pax-column" readonly tabindex="-1" style="opacity: 0.7; font-weight: bold;"></td>
    `;
    tableBody.appendChild(row);

    const rolInput = row.querySelector('.roleta-column');
    rolInput.addEventListener('input', calculateTotals);
    rolInput.addEventListener('blur', () => {
        if (rolInput.value === "" && document.querySelectorAll('#trip-table-body tr').length > 1) {
            row.remove();
            calculateTotals();
            saveToLocal();
        }
    });

    row.querySelectorAll('.time-mask').forEach(input => {
        input.addEventListener('input', (e) => {
            formatTime(e.target);
            if (e.target.value.trim() === "") {
                updateDynamicHeaders();
            }
        });
        input.placeholder = "00:00"; input.maxLength = 5;
    });
    
    calculateTotals();
}

function saveToLocal() {
    const data = {
        header: {
            'header-data': document.getElementById('header-data')?.value,
            'header-data-raw': document.getElementById('header-data')?.dataset.rawDate || "",
            'header-pegada': document.getElementById('header-pegada')?.value,
            'header-motorista': document.getElementById('header-motorista')?.value,
            'header-matricula': document.getElementById('header-matricula')?.value,
            'header-venda': document.getElementById('header-venda')?.value,
        },
        linesHistory: linesHistory,
        carsHistory: carsHistory,
        sessionsHistory: sessionsHistory,
        dynamicHeaders: [],
        trips: [],
        footer: {}
    };

    // Salvar nomes dos cabeçalhos dinâmicos
    const headerRow = document.getElementById('dynamic-table-headers');
    if (headerRow) {
        const ths = headerRow.querySelectorAll('th');
        for (let i = 0; i < 4; i++) {
            data.dynamicHeaders.push(ths[i].textContent);
        }
    }

    document.querySelectorAll('#trip-table-body tr').forEach(row => {
        const idx = row.dataset.index;
        data.trips.push({
            carro: document.getElementById(`car-${idx}`)?.value || "",
            linha: document.getElementById(`lin-${idx}`)?.value || "",
            roleta: document.getElementById(`rol-${idx}`)?.value || "",
            h1: document.getElementById(`h1-${idx}`)?.value || "",
            h2: document.getElementById(`h2-${idx}`)?.value || "",
            h3: document.getElementById(`h3-${idx}`)?.value || "",
            h4: document.getElementById(`h4-${idx}`)?.value || ""
        });
    });
    localStorage.setItem('driver_control_data', JSON.stringify(data));
}

function padZero(num) {
    const n = parseInt(num);
    return isNaN(n) ? "00" : (n < 10 && n >= 0 ? "0" + n : n.toString());
}

function formatDateLong(input) {
    let val = input.value.replace(/\D/g, "");
    if (val.length === 6 || val.length === 8) {
        let dia = val.substring(0, 2), mes = val.substring(2, 4), ano = val.length === 6 ? "20" + val.substring(4, 6) : val.substring(4, 8);
        const d = new Date(ano, mes - 1, dia);
        if (!isNaN(d) && d.getDate() == dia) {
            const f = d.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            input.value = f.charAt(0).toUpperCase() + f.slice(1);
        }
    }
}

function formatTime(input) {
    let val = input.value.replace(/\D/g, "");
    if (val.length > 2) val = val.substring(0, 2) + ":" + val.substring(2, 4);
    input.value = val;
}

function formatCurrency(input) {
    let val = input.value.replace(/\D/g, "");
    if (!val) {
        input.value = "";
        return;
    }
    let number = parseFloat(val) / 100;
    input.value = number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function resetForm() {
    if (confirm("Deseja limpar todos os campos para um novo lançamento?")) {
        const savedMotorista = localStorage.getItem('saved_motorista');
        const savedMatricula = localStorage.getItem('saved_matricula');

        lastDeletedData = localStorage.getItem('driver_control_data');
        localStorage.removeItem('driver_control_data');
        
        linesHistory = [];
        carsHistory = [];
        
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type !== 'button' && input.type !== 'submit') {
                input.value = "";
            }
        });

        // Preserva o motorista e matrícula do perfil
        if (savedMotorista) {
            localStorage.setItem('saved_motorista', savedMotorista);
            const motInput = document.getElementById('header-motorista');
            if (motInput) motInput.value = savedMotorista;
        }
        if (savedMatricula) {
            localStorage.setItem('saved_matricula', savedMatricula);
            const matInput = document.getElementById('header-matricula');
            if (matInput) matInput.value = savedMatricula;
        }

        const btnUndo = document.getElementById('btn-undo');
        if (btnUndo) { btnUndo.style.display = 'inline-flex'; setTimeout(() => btnUndo.style.display = 'none', 10000); }
        
        location.reload();
    }
}

function undoReset() {
    if (lastDeletedData) { localStorage.setItem('driver_control_data', lastDeletedData); lastDeletedData = null; location.reload(); }
}

function stampTime(buttonElement, buttonName) {
    const tableBody = document.getElementById('trip-table-body');
    let rows = tableBody.querySelectorAll('tr');
    if (rows.length === 0) {
        addRow();
        rows = tableBody.querySelectorAll('tr');
    }
    
    let lastRow = rows[rows.length - 1];
    let idx = lastRow.dataset.index;
    
    // Se o argumento for apenas uma string (retrocompatibilidade)
    let colIndex = -1;
    if (typeof buttonElement === 'string') {
        buttonName = buttonElement;
        const map = {
            'Garagem': 1,
            'Fiscal': 2,
            'Ponto': 3,
            'Placa': 4
        };
        colIndex = map[buttonName] || 1;
    } else {
        const th = buttonElement.closest('th');
        const ths = Array.from(th.parentNode.children);
        colIndex = ths.indexOf(th) + 1; // 1-based index (1, 2, 3, 4)
    }
    
    const inputId = `h${colIndex}-${idx}`;
    let input = document.getElementById(inputId);
    
    // Se a coluna correspondente na última linha já tiver valor, adiciona uma nova linha primeiro
    if (input && input.value !== "") {
        addRow();
        rows = tableBody.querySelectorAll('tr');
        lastRow = rows[rows.length - 1];
        idx = lastRow.dataset.index;
        input = document.getElementById(`h${colIndex}-${idx}`);
    }
    
    if (input) {
        const now = new Date(Date.now() + timeOffset);
        input.value = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
        
        // Atualizar o nome do cabeçalho para este slot
        const headerRow = document.getElementById('dynamic-table-headers');
        if (headerRow) {
            const ths = headerRow.querySelectorAll('th');
            if (ths[colIndex - 1]) {
                ths[colIndex - 1].textContent = buttonName;
            }
        }
        
        // Efeito visual
        input.style.backgroundColor = 'rgba(47, 129, 247, 0.2)';
        setTimeout(() => input.style.backgroundColor = 'transparent', 500);
        
        // Adiciona nova linha automaticamente se for Placa (última coluna) ou se o botão é "Placa"
        if (colIndex === 4 || buttonName.toLowerCase() === 'placa') {
            addRow();
        }
        
        saveToLocal();
    }
}

function updateDynamicHeaders() {
    const headerRow = document.getElementById('dynamic-table-headers');
    if (!headerRow) return;
    const ths = headerRow.querySelectorAll('th');
    
    const colNames = ["Garagem", "Fiscal", "Ponto", "Placa"];
    
    for (let col = 1; col <= 4; col++) {
        let hasValue = false;
        document.querySelectorAll(`#trip-table-body tr`).forEach(row => {
            const idx = row.dataset.index;
            const input = document.getElementById(`h${col}-${idx}`);
            if (input && input.value.trim() !== "") {
                hasValue = true;
            }
        });
        
        if (!hasValue) {
            ths[col - 1].textContent = "";
        } else {
            ths[col - 1].textContent = colNames[col - 1];
        }
    }
    saveToLocal();
}

function calculateTotals() {
    const rows = Array.from(document.querySelectorAll('#trip-table-body tr'));
    const carStats = {};
    const sessionStats = {};
    let totalPassageiros = 0;
    let globalInicial = null;
    let globalFinal = 0;
    let globalCount = 0;

    rows.forEach((row, index) => {
        const idx = row.dataset.index;
        const carNum = document.getElementById(`car-${idx}`)?.value || "";
        const linNum = document.getElementById(`lin-${idx}`)?.value || "";
        const rolInput = document.getElementById(`rol-${idx}`);
        const paxOutput = document.getElementById(`pax-${idx}`);
        if (!rolInput || !paxOutput) return;

        if (carNum && !carStats[carNum]) carStats[carNum] = { inicial: null, final: 0, count: 0, paxSum: 0 };
        const sessionKey = `${carNum}_${linNum}`;
        if (carNum && linNum && !sessionStats[sessionKey]) sessionStats[sessionKey] = { paxSum: 0 };

        const roletaAtual = parseFloat(rolInput.value);
        if (!isNaN(roletaAtual)) {
            // Controle global
            globalCount++;
            if (globalInicial === null) globalInicial = roletaAtual;
            if (globalCount >= 2) globalFinal = roletaAtual;

            if (carNum) {
                carStats[carNum].count++;
                if (carStats[carNum].inicial === null) carStats[carNum].inicial = roletaAtual;
                if (carStats[carNum].count >= 2) carStats[carNum].final = roletaAtual;
            }
            
            // Busca a roleta anterior DO MESMO CARRO para calcular passageiros
            let prevRol = NaN;
            for (let j = index - 1; j >= 0; j--) {
                const prevIdx = rows[j].dataset.index;
                const prevCar = document.getElementById(`car-${prevIdx}`)?.value;
                const pRolVal = parseFloat(document.getElementById(`rol-${prevIdx}`)?.value);
                if (prevCar === carNum && !isNaN(pRolVal)) {
                    prevRol = pRolVal;
                    break;
                }
            }

            if (!isNaN(prevRol)) {
                if (roletaAtual < prevRol && roletaAtual !== 0) {
                    rolInput.classList.add('input-error');
                } else {
                    rolInput.classList.remove('input-error');
                }
                const diff = roletaAtual - prevRol;
                const res = diff >= 0 ? diff : 0;
                paxOutput.value = padZero(res);
                totalPassageiros += res;
                if (carNum) {
                    carStats[carNum].paxSum += res;
                }
                if (carNum && linNum) {
                    sessionStats[sessionKey].paxSum += res;
                }
            } else {
                paxOutput.value = "00";
                rolInput.classList.remove('input-error');
            }
        } else {
            paxOutput.value = "";
            rolInput.classList.remove('input-error');
        }
    });

    // Atualizar displays globais (Roleta Inicial e Final do Lançamento)
    const initDisp = document.getElementById('roleta-inicial-display');
    const initInp = document.getElementById('roleta-inicial');
    const finDisp = document.getElementById('roleta-final-display');
    const finInp = document.getElementById('roleta-final');
    const initItem = document.getElementById('initial-roleta-item');

    if (globalInicial !== null) {
        if (initDisp) initDisp.textContent = padZero(globalInicial);
        if (initInp) initInp.value = globalInicial;
        if (initItem) initItem.style.display = 'flex';
    } else {
        if (initItem) initItem.style.display = 'none';
    }

    if (globalFinal !== null || globalCount > 0) {
        if (finDisp) finDisp.textContent = padZero(globalFinal);
        if (finInp) finInp.value = globalFinal;
    }

    const summaryContainer = document.getElementById('roleta-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = "";
        const carsWithData = Object.keys(carStats).filter(car => car !== "");
        
        if (carsWithData.length > 0) {
            carsWithData.forEach(car => {
                const stats = carStats[car];
                const item = document.createElement('div');
                item.className = "stat-item";
                item.style = "border-right: 1px solid rgba(255,255,255,0.1); padding-right: 1.5rem;";
                item.innerHTML = `
                    <div style="font-size: 0.6rem; color: #f39c12; font-weight: bold;">CARRO ${car}</div>
                    <div style="display: flex; gap: 1rem;">
                        <div><span class="stat-label">INICIAL:</span> <span class="stat-value" style="font-size: 1rem;">${stats.inicial || '0'}</span></div>
                        <div><span class="stat-label">FINAL:</span> <span class="stat-value" style="font-size: 1rem;">${stats.final || '0'}</span></div>
                    </div>
                `;
                summaryContainer.appendChild(item);
            });
        }
    }

    const statTotalPax = document.getElementById('stat-total-pax');
    if (statTotalPax) statTotalPax.textContent = padZero(totalPassageiros);

    // Atualizar os cálculos de totais nas tabelas dinâmicas por sessão (carro+linha)
    sessionsHistory.forEach((session, index) => {
        const key = `${session.carNum}_${session.lineNum}`;
        const stats = sessionStats[key] || { paxSum: 0 };

        // --- VALIDADOR ---
        // Total Pagantes = paxSum da roleta - Gratuidades - VT - QR (do Validador)
        const g = parseInt(session.val?.gratuidades) || 0;
        const vt = parseInt(session.val?.vt) || 0;
        const qr = parseInt(session.val?.qr) || 0;
        const pagantes = stats.paxSum - g - vt - qr;

        const pagantesSpan = document.getElementById(`val-total-pagantes-${index}`);
        if (pagantesSpan) pagantesSpan.textContent = padZero(pagantes >= 0 ? pagantes : 0);

        // Total Passageiros = paxSum bruto da roleta
        const valPaxSpan = document.getElementById(`val-total-pax-${index}`);
        if (valPaxSpan) valPaxSpan.textContent = padZero(stats.paxSum);

        // --- FILIPETA ---
        // Total Passageiros = Pagantes + Gratuidades + Vales Transporte (campos manuais da Filipeta)
        const filPagantes = parseInt(session.fil?.pagantes) || 0;
        const filGratuidades = parseInt(session.fil?.gratuidades) || 0;
        const filVt = parseInt(session.fil?.vt) || 0;
        const filTotal = filPagantes + filGratuidades + filVt;

        const paxSpan = document.getElementById(`fil-total-pax-${index}`);
        if (paxSpan) paxSpan.textContent = padZero(filTotal);

        // Total Pagantes (Filipeta) = mesma fórmula do Validador: paxSum - gratuidades - VT - QR
        const filPagantesSpan = document.getElementById(`fil-total-pagantes-${index}`);
        if (filPagantesSpan) filPagantesSpan.textContent = padZero(pagantes >= 0 ? pagantes : 0);
    });
}

function getFormattedDateForMsg() {
    const dataInput = document.getElementById('header-data');
    if (!dataInput) return "";
    let raw = dataInput.dataset.rawDate || dataInput.value.replace(/\D/g, "");
    if (raw.length === 6 || raw.length === 8) {
        let dia = raw.substring(0, 2);
        let mes = raw.substring(2, 4);
        let ano = raw.length === 6 ? "20" + raw.substring(4, 6) : raw.substring(4, 8);
        return `${dia}/${mes}/${ano}`;
    }
    const match = dataInput.value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        return `${padZero(match[1])}/${padZero(match[2])}/${match[3]}`;
    }
    const hoje = new Date();
    return `${padZero(hoje.getDate())}/${padZero(hoje.getMonth() + 1)}/${hoje.getFullYear()}`;
}

function gerarMensagemWhatsApp() {
    const dataFormatada = getFormattedDateForMsg();
    
    const motorista = document.getElementById('header-motorista')?.value?.trim() || localStorage.getItem('saved_motorista') || "";
    const matricula = document.getElementById('header-matricula')?.value?.trim() || localStorage.getItem('saved_matricula') || "";
    let nomeMatricula = "";
    if (motorista && matricula) {
        nomeMatricula = `${motorista} - ${matricula}`;
    } else if (motorista) {
        nomeMatricula = motorista;
    } else if (matricula) {
        nomeMatricula = matricula;
    } else {
        nomeMatricula = "Não informado";
    }

    // Carro ativo: último carro inserido em carsHistory ou preenchido no cabeçalho
    let carroAtivo = "";
    let avariasAtivo = "";
    if (carsHistory && carsHistory.length > 0) {
        const activeCarObj = carsHistory[carsHistory.length - 1];
        carroAtivo = activeCarObj.num || "";
        avariasAtivo = activeCarObj.avarias || "Nenhuma avaria relatada";
    } else {
        carroAtivo = document.getElementById('header-carro')?.value || document.getElementById('input-novo-carro')?.value || "";
        avariasAtivo = document.getElementById('avarias-input')?.value || document.getElementById('input-novas-avarias')?.value || "Nenhuma avaria relatada";
    }
    if (!carroAtivo) carroAtivo = "Não informado";
    if (!avariasAtivo || avariasAtivo.trim() === "") avariasAtivo = "Nenhuma avaria relatada";

    // Primeira roleta do carro ativo
    let primeiraRoleta = "";
    const rows = document.querySelectorAll('#trip-table-body tr');
    for (let row of rows) {
        const idx = row.dataset.index;
        const carVal = document.getElementById(`car-${idx}`)?.value?.trim() || "";
        const rolVal = document.getElementById(`rol-${idx}`)?.value?.trim() || "";
        if (carVal === carroAtivo && rolVal !== "") {
            primeiraRoleta = rolVal;
            break;
        }
    }
    if (!primeiraRoleta && rows.length > 0) {
        for (let row of rows) {
            const idx = row.dataset.index;
            const rolVal = document.getElementById(`rol-${idx}`)?.value?.trim() || "";
            if (rolVal !== "") {
                primeiraRoleta = rolVal;
                break;
            }
        }
    }
    if (!primeiraRoleta) {
        const initInput = document.getElementById('roleta-inicial');
        if (initInput && initInput.value && initInput.value !== "0") {
            primeiraRoleta = initInput.value;
        }
    }
    if (!primeiraRoleta) primeiraRoleta = "Não informada";

    return `*Data:* ${dataFormatada}\n\n*Nome / Matricula:* ${nomeMatricula}\n\n*Carro:* ${carroAtivo}\n\n*Roleta:* ${primeiraRoleta}\n\n*Avarias:* ${avariasAtivo}`;
}

async function enviarWhatsApp() {
    const mensagem = gerarMensagemWhatsApp();

    // Se suportar a Web Share API (celulares modernos Android / iOS):
    // Abre a folha de compartilhamento nativa (Share Sheet), permitindo selecionar
    // qualquer WhatsApp instalado (WhatsApp Padrão, WhatsApp Business, Dual App / Clone, etc.)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Controle do Motorista',
                text: mensagem
            });
            return;
        } catch (err) {
            if (err.name === 'AbortError') {
                return; // Usuário fechou ou cancelou o compartilhamento
            }
        }
    }

    // Fallback para computadores ou navegadores que não suportam navigator.share
    abrirModalWhatsApp(mensagem);
}

function abrirModalWhatsApp(mensagem) {
    const modal = document.getElementById('whatsapp-modal');
    const preview = document.getElementById('whatsapp-preview-text');
    if (!modal || !preview) return;

    preview.value = mensagem;
    modal.style.display = 'flex';

    const encoded = encodeURIComponent(mensagem);

    // WhatsApp Padrão / Intent móvel
    const btnPadrao = document.getElementById('btn-wa-padrao');
    if (btnPadrao) {
        btnPadrao.onclick = () => {
            window.location.href = `whatsapp://send?text=${encoded}`;
        };
    }

    // WhatsApp Business
    const btnBusiness = document.getElementById('btn-wa-business');
    if (btnBusiness) {
        btnBusiness.onclick = () => {
            const isAndroid = /android/i.test(navigator.userAgent);
            if (isAndroid) {
                window.location.href = `intent://send?text=${encoded}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
            } else {
                window.location.href = `whatsapp://send?text=${encoded}`;
            }
        };
    }

    // WhatsApp Web
    const btnWeb = document.getElementById('btn-wa-web');
    if (btnWeb) {
        btnWeb.onclick = () => {
            window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
        };
    }

    // Copiar Mensagem
    const btnCopy = document.getElementById('btn-wa-copy');
    const copyLabel = document.getElementById('btn-copy-label');
    if (btnCopy && copyLabel) {
        btnCopy.onclick = async () => {
            try {
                await navigator.clipboard.writeText(mensagem);
                copyLabel.textContent = "Copiado com sucesso! ✓";
                btnCopy.style.borderColor = "#25D366";
                btnCopy.style.background = "rgba(37, 211, 102, 0.15)";
                setTimeout(() => {
                    copyLabel.textContent = "Copiar Mensagem";
                    btnCopy.style.borderColor = "var(--border-color)";
                    btnCopy.style.background = "rgba(255, 255, 255, 0.03)";
                }, 2500);
            } catch (e) {
                preview.select();
                document.execCommand('copy');
                copyLabel.textContent = "Copiado! ✓";
                setTimeout(() => copyLabel.textContent = "Copiar Mensagem", 2000);
            }
        };
    }
}

function fecharModalWhatsApp() {
    const modal = document.getElementById('whatsapp-modal');
    if (modal) modal.style.display = 'none';
}

window.onload = initDashboard;
