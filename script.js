/* ============================================================
   PANEL CASH — lógica de la aplicación
   Los datos se guardan en localStorage: quedan disponibles en
   este mismo navegador la próxima vez que se ingrese.
   ============================================================ */

const USUARIO_VALIDO = '1111';
const CLAVE_VALIDA = '1111';

const STORAGE = {
  sesion: 'panelcash_sesion',
  movimientos: 'panelcash_movimientos',
  documentos: 'panelcash_documentos',
  presupuestos: 'panelcash_presupuestos',
};

const fmtMoneda = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const fmtFecha = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const hoy = () => new Date().toISOString().slice(0, 10);

function leer(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento no disponible: la app sigue funcionando en memoria */
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

let movimientos = leer(STORAGE.movimientos) || [];
let documentos = leer(STORAGE.documentos) || [];
let presupuestos = leer(STORAGE.presupuestos) || [];

/* ---------------- TRANSICIÓN DE PANTALLAS ---------------- */

const DURACION_TRANSICION = 280;

function cambiarPantalla(deElemento, aElemento) {
  deElemento.classList.add('hidden');
  aElemento.classList.remove('hidden');
}

/* ---------------- LOGIN ---------------- */

const loginScreen = document.getElementById('login-screen');
const appEl = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

function mostrarApp() {
  cambiarPantalla(loginScreen, appEl);
  inicializarVistaHoy();
  renderTodo();
}

function mostrarLogin() {
  cambiarPantalla(appEl, loginScreen);
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const usuario = document.getElementById('username').value.trim();
  const clave = document.getElementById('password').value.trim();

  if (usuario === USUARIO_VALIDO && clave === CLAVE_VALIDA) {
    loginError.hidden = true;
    guardar(STORAGE.sesion, true);
    mostrarApp();
    loginForm.reset();
  } else {
    loginError.hidden = false;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  guardar(STORAGE.sesion, false);
  mostrarLogin();
});

function inicializarVistaHoy() {
  const label = document.getElementById('today-label');
  label.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ---------------- NAVEGACIÓN ---------------- */

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('is-active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById('view-' + btn.dataset.view).classList.add('is-active');
  });
});

/* ---------------- MOVIMIENTOS (alta, edición, baja) ---------------- */

const movForm = document.getElementById('movimiento-form');
const movSubmitBtn = document.getElementById('mov-submit-btn');
const movCancelarBtn = document.getElementById('mov-cancelar-btn');
document.getElementById('mov-fecha').value = hoy();

function limpiarFormMovimiento() {
  movForm.reset();
  document.getElementById('mov-fecha').value = hoy();
  document.getElementById('mov-editando-id').value = '';
  movSubmitBtn.textContent = 'Agregar';
  movCancelarBtn.hidden = true;
}

movForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const editandoId = document.getElementById('mov-editando-id').value;
  const tipo = document.getElementById('mov-tipo').value;
  const concepto = document.getElementById('mov-concepto').value.trim();
  const categoria = document.getElementById('mov-categoria').value;
  const importe = parseFloat(document.getElementById('mov-importe').value);
  const fecha = document.getElementById('mov-fecha').value;
  const nota = document.getElementById('mov-nota').value.trim();

  if (!concepto || isNaN(importe) || importe <= 0 || !fecha) return;

  if (editandoId) {
    const idx = movimientos.findIndex((m) => m.id === editandoId);
    if (idx !== -1) {
      movimientos[idx] = { ...movimientos[idx], tipo, concepto, categoria, importe, fecha, nota };
    }
  } else {
    movimientos.push({ id: Date.now().toString(36), tipo, concepto, categoria, importe, fecha, nota });
  }

  guardar(STORAGE.movimientos, movimientos);
  limpiarFormMovimiento();
  renderTodo();
});

movCancelarBtn.addEventListener('click', limpiarFormMovimiento);

function editarMovimiento(id) {
  const m = movimientos.find((mv) => mv.id === id);
  if (!m) return;
  document.getElementById('mov-editando-id').value = m.id;
  document.getElementById('mov-tipo').value = m.tipo;
  document.getElementById('mov-concepto').value = m.concepto;
  document.getElementById('mov-categoria').value = m.categoria;
  document.getElementById('mov-importe').value = m.importe;
  document.getElementById('mov-fecha').value = m.fecha;
  document.getElementById('mov-nota').value = m.nota || '';
  movSubmitBtn.textContent = 'Guardar cambios';
  movCancelarBtn.hidden = false;
  document.querySelector('[data-view="movimientos"]').click();
  movForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function eliminarMovimiento(id) {
  movimientos = movimientos.filter((m) => m.id !== id);
  guardar(STORAGE.movimientos, movimientos);
  renderTodo();
}

function renderMovimientos() {
  const body = document.getElementById('movimientos-body');
  const empty = document.getElementById('mov-empty');
  const count = document.getElementById('mov-count');

  const ordenados = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  count.textContent = `${movimientos.length} movimiento${movimientos.length === 1 ? '' : 's'}`;

  if (ordenados.length === 0) {
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  body.innerHTML = ordenados.map((m) => `
    <tr>
      <td>${fmtFecha(m.fecha)}</td>
      <td>${escapeHtml(m.concepto)}</td>
      <td>${escapeHtml(m.categoria)}</td>
      <td class="nota-cell">${escapeHtml(m.nota) || '—'}</td>
      <td><span class="tag tag-${m.tipo}">${m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td>
      <td class="col-right">${m.tipo === 'gasto' ? '−' : ''}${fmtMoneda(m.importe)}</td>
      <td>
        <div class="row-actions">
          <button class="row-btn row-edit" data-id="${m.id}">Editar</button>
          <button class="row-btn row-delete" data-id="${m.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('.row-edit').forEach((b) => b.addEventListener('click', () => editarMovimiento(b.dataset.id)));
  body.querySelectorAll('.row-delete').forEach((b) => b.addEventListener('click', () => eliminarMovimiento(b.dataset.id)));
}

/* ---------------- DOCUMENTOS ---------------- */

const docForm = document.getElementById('documento-form');
document.getElementById('doc-fecha').value = hoy();

docForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = document.getElementById('doc-nombre').value.trim();
  const estado = document.getElementById('doc-estado').value;
  const importe = parseFloat(document.getElementById('doc-importe').value);
  const fecha = document.getElementById('doc-fecha').value;

  if (!nombre || isNaN(importe) || importe <= 0 || !fecha) return;

  documentos.push({ id: Date.now().toString(36), nombre, estado, importe, fecha });
  guardar(STORAGE.documentos, documentos);
  docForm.reset();
  document.getElementById('doc-fecha').value = hoy();
  renderTodo();
});

function eliminarDocumento(id) {
  documentos = documentos.filter((d) => d.id !== id);
  guardar(STORAGE.documentos, documentos);
  renderTodo();
}

function renderDocumentos() {
  const body = document.getElementById('documentos-body');
  const empty = document.getElementById('doc-empty');
  const count = document.getElementById('doc-count');

  const ordenados = [...documentos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  count.textContent = `${documentos.length} documento${documentos.length === 1 ? '' : 's'}`;

  if (ordenados.length === 0) {
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  body.innerHTML = ordenados.map((d) => `
    <tr>
      <td>${fmtFecha(d.fecha)}</td>
      <td>${escapeHtml(d.nombre)}</td>
      <td><span class="tag tag-${d.estado}">${d.estado === 'pendiente' ? 'Pendiente' : 'Pagado'}</span></td>
      <td class="col-right">${fmtMoneda(d.importe)}</td>
      <td><button class="row-btn row-delete" data-id="${d.id}">Eliminar</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('.row-delete').forEach((b) => b.addEventListener('click', () => eliminarDocumento(b.dataset.id)));
}

/* ---------------- PRESUPUESTO (idea: presupuesto bajo presión) ---------------- */

const presForm = document.getElementById('presupuesto-form');
const presImprevistoBtn = document.getElementById('pres-imprevisto-btn');
const presImprevistoMsg = document.getElementById('pres-imprevisto-msg');

const IMPREVISTOS = [
  { texto: 'Se rompió un equipo y hubo que repararlo', min: 8000, max: 35000 },
  { texto: 'Un proveedor subió sus precios de un mes a otro', min: 5000, max: 20000 },
  { texto: 'Llegó una multa o gasto administrativo inesperado', min: 3000, max: 15000 },
  { texto: 'Hubo que reponer mercadería dañada', min: 6000, max: 25000 },
];

presForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const categoria = document.getElementById('pres-categoria').value;
  const monto = parseFloat(document.getElementById('pres-monto').value);
  if (isNaN(monto) || monto <= 0) return;

  const idx = presupuestos.findIndex((p) => p.categoria === categoria);
  if (idx !== -1) presupuestos[idx].monto = monto;
  else presupuestos.push({ id: Date.now().toString(36), categoria, monto });

  guardar(STORAGE.presupuestos, presupuestos);
  presForm.reset();
  renderPresupuesto();
});

presImprevistoBtn.addEventListener('click', () => {
  const evento = IMPREVISTOS[Math.floor(Math.random() * IMPREVISTOS.length)];
  const importe = Math.round((evento.min + Math.random() * (evento.max - evento.min)) / 100) * 100;
  movimientos.push({
    id: Date.now().toString(36),
    tipo: 'gasto',
    concepto: evento.texto,
    categoria: 'Otro',
    importe,
    fecha: hoy(),
    nota: 'Imprevisto generado automáticamente',
  });
  guardar(STORAGE.movimientos, movimientos);
  presImprevistoMsg.hidden = false;
  presImprevistoMsg.textContent = `Imprevisto: "${evento.texto}" por ${fmtMoneda(importe)}. Se sumó como gasto del día.`;
  renderTodo();
});

function eliminarPresupuesto(id) {
  presupuestos = presupuestos.filter((p) => p.id !== id);
  guardar(STORAGE.presupuestos, presupuestos);
  renderPresupuesto();
}

function renderPresupuesto() {
  const cont = document.getElementById('presupuesto-lista');
  const empty = document.getElementById('pres-empty');

  if (presupuestos.length === 0) {
    cont.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const mesActual = hoy().slice(0, 7);

  cont.innerHTML = presupuestos.map((p) => {
    const gastado = movimientos
      .filter((m) => m.tipo === 'gasto' && m.categoria === p.categoria && m.fecha.slice(0, 7) === mesActual)
      .reduce((a, m) => a + m.importe, 0);
    const porcentaje = Math.min(100, (gastado / p.monto) * 100);
    const excedido = gastado > p.monto;
    return `
      <div class="presupuesto-item">
        <div class="presupuesto-cabecera">
          <span>${escapeHtml(p.categoria)}</span>
          <strong class="${excedido ? 'stat-negative' : ''}">${fmtMoneda(gastado)} / ${fmtMoneda(p.monto)}</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${excedido ? 'over' : ''}" style="width:${porcentaje}%"></div>
        </div>
        <div class="presupuesto-meta">
          <span>${excedido ? 'Superaste el límite este mes' : `${Math.round(porcentaje)}% del límite usado`}</span>
          <button class="row-btn row-delete" data-id="${p.id}">Quitar</button>
        </div>
      </div>
    `;
  }).join('');

  cont.querySelectorAll('.row-delete').forEach((b) => b.addEventListener('click', () => eliminarPresupuesto(b.dataset.id)));
}

/* ---------------- RESUMEN / ESTADÍSTICAS ---------------- */

function mesActualStr() { return hoy().slice(0, 7); }

function renderResumen() {
  const balanceTotal = movimientos.reduce((acc, m) => acc + (m.tipo === 'ingreso' ? m.importe : -m.importe), 0);
  const mesActual = mesActualStr();
  const delMes = movimientos.filter((m) => m.fecha.slice(0, 7) === mesActual);
  const ingresosMes = delMes.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.importe, 0);
  const gastosMes = delMes.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.importe, 0);
  const docsPendientes = documentos.filter((d) => d.estado === 'pendiente').reduce((a, d) => a + d.importe, 0);

  document.getElementById('stat-balance').textContent = fmtMoneda(balanceTotal);
  document.getElementById('stat-ingresos').textContent = fmtMoneda(ingresosMes);
  document.getElementById('stat-gastos').textContent = fmtMoneda(gastosMes);
  document.getElementById('stat-docs').textContent = fmtMoneda(docsPendientes);

  const ultimos = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  const lista = document.getElementById('ultimos-movimientos');

  if (ultimos.length === 0) {
    lista.innerHTML = '<p class="empty-note">Todavía no hay movimientos cargados.</p>';
  } else {
    lista.innerHTML = ultimos.map((m) => `
      <div class="mini-row">
        <span>${escapeHtml(m.concepto)}<br><span class="mini-meta">${fmtFecha(m.fecha)} · ${escapeHtml(m.categoria)}</span></span>
        <span class="mini-amount ${m.tipo === 'ingreso' ? 'stat-positive' : 'stat-negative'}">
          ${m.tipo === 'gasto' ? '−' : '+'}${fmtMoneda(m.importe)}
        </span>
      </div>
    `).join('');
  }
}

/* ---------------- GRÁFICOS PROPIOS (CSS/HTML, sin conexión) ---------------- */

const COLORES_CATEGORIA = ['#D2A857', '#86BF93', '#E08770', '#7FA6BF', '#B08FD0', '#C9C0A8', '#6E8E7C'];

function ultimosNMeses(n) {
  const meses = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    meses.push(dd.toISOString().slice(0, 7));
  }
  return meses;
}

function nombreMes(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'short' });
}

function renderChartEvolucion() {
  const cont = document.getElementById('chart-evolucion');
  const meses = ultimosNMeses(6);
  const datos = meses.map((ym) => ({
    mes: nombreMes(ym),
    ing: movimientos.filter((m) => m.tipo === 'ingreso' && m.fecha.slice(0, 7) === ym).reduce((a, m) => a + m.importe, 0),
    gas: movimientos.filter((m) => m.tipo === 'gasto' && m.fecha.slice(0, 7) === ym).reduce((a, m) => a + m.importe, 0),
  }));
  const max = Math.max(...datos.map((d) => Math.max(d.ing, d.gas)), 1);

  cont.innerHTML = `
    <div class="bars-chart-inner">
      ${datos.map((d) => `
        <div class="bar-group">
          <div class="bar-pair">
            <div class="bar-col bar-ingreso" style="height:${Math.max(2, d.ing / max * 100)}%" title="Ingresos: ${fmtMoneda(d.ing)}"></div>
            <div class="bar-col bar-gasto" style="height:${Math.max(2, d.gas / max * 100)}%" title="Gastos: ${fmtMoneda(d.gas)}"></div>
          </div>
          <span class="bar-label">${d.mes}</span>
        </div>
      `).join('')}
    </div>
    <div class="chart-legend">
      <span><i class="dot dot-ingreso"></i>Ingresos</span>
      <span><i class="dot dot-gasto"></i>Gastos</span>
    </div>
  `;
}

function renderChartCategorias() {
  const cont = document.getElementById('chart-categorias');
  const gastos = movimientos.filter((m) => m.tipo === 'gasto');
  const porCategoria = {};
  gastos.forEach((m) => { porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.importe; });
  const entradas = Object.entries(porCategoria);

  if (entradas.length === 0) {
    cont.innerHTML = '<p class="empty-note">Todavía no cargaste gastos.</p>';
    return;
  }

  const total = entradas.reduce((a, [, v]) => a + v, 0);
  let acumulado = 0;
  const segmentos = entradas.map(([, val], i) => {
    const inicio = acumulado / total * 360;
    acumulado += val;
    const fin = acumulado / total * 360;
    return `${COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]} ${inicio}deg ${fin}deg`;
  }).join(', ');

  cont.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${segmentos});"></div>
      <div class="donut-hole"><span>${fmtMoneda(total)}</span><small>Total gastos</small></div>
    </div>
    <ul class="chart-legend-list">
      ${entradas.map(([cat, val], i) => `
        <li><i class="dot" style="background:${COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]}"></i>${escapeHtml(cat)} — ${fmtMoneda(val)}</li>
      `).join('')}
    </ul>
  `;
}

/* ---------------- PROYECCIÓN (con inflación) ---------------- */

function renderProyeccion() {
  const grid = document.getElementById('proy-grid');
  const sinDatos = document.getElementById('proy-sin-datos');
  const inflacion = parseFloat(document.getElementById('proy-inflacion').value) || 0;

  const meses = ultimosNMeses(3);
  const porMes = meses.map((ym) => {
    const del = movimientos.filter((m) => m.fecha.slice(0, 7) === ym);
    return {
      ing: del.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.importe, 0),
      gas: del.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.importe, 0),
    };
  });

  const conDatos = porMes.filter((m) => m.ing > 0 || m.gas > 0);
  if (conDatos.length === 0) {
    sinDatos.hidden = false;
    grid.innerHTML = '';
    return;
  }
  sinDatos.hidden = true;

  const promIng = conDatos.reduce((a, m) => a + m.ing, 0) / conDatos.length;
  const promGas = conDatos.reduce((a, m) => a + m.gas, 0) / conDatos.length;

  let balance = movimientos.reduce((acc, m) => acc + (m.tipo === 'ingreso' ? m.importe : -m.importe), 0);
  const hoyD = new Date();
  const tarjetas = [];

  for (let i = 1; i <= 3; i++) {
    const fecha = new Date(hoyD.getFullYear(), hoyD.getMonth() + i, 1);
    const gastoAjustado = promGas * Math.pow(1 + inflacion / 100, i);
    balance += promIng - gastoAjustado;
    tarjetas.push({
      mes: fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
      balance,
      ing: promIng,
      gas: gastoAjustado,
    });
  }

  grid.innerHTML = tarjetas.map((t) => `
    <div class="proy-card">
      <span class="proy-mes">${t.mes[0].toUpperCase() + t.mes.slice(1)}</span>
      <span class="proy-balance ${t.balance >= 0 ? 'stat-positive' : 'stat-negative'}">${fmtMoneda(t.balance)}</span>
      <div class="proy-detail"><span>Ingresos prom.</span><span>${fmtMoneda(t.ing)}</span></div>
      <div class="proy-detail"><span>Gastos ${inflacion > 0 ? 'ajustados' : 'prom.'}</span><span>${fmtMoneda(t.gas)}</span></div>
    </div>
  `).join('');
}

document.getElementById('proy-inflacion').addEventListener('input', renderProyeccion);

/* ---------------- SIMULADORES ---------------- */

const simuladores = [
  {
    id: 'be', titulo: 'Punto de equilibrio', subtitulo: '¿Cuánto cuesta emprender? · ¿Conviene producir?',
    descripcion: 'Definí costos y precio para saber cuántas unidades necesitás vender para no perder plata.',
    campos: [
      { id: 'costoFijo', type: 'number', label: 'Costos fijos por mes', placeholder: '150000' },
      { id: 'costoVariable', type: 'number', label: 'Costo variable por unidad', placeholder: '800' },
      { id: 'precio', type: 'number', label: 'Precio de venta por unidad', placeholder: '1500' },
      { id: 'unidades', type: 'number', label: 'Unidades que esperás vender (opcional)', placeholder: '200' },
    ],
    calcular(v) {
      if (!v.costoFijo || !v.precio || isNaN(v.costoVariable)) return null;
      const margen = v.precio - v.costoVariable;
      if (margen <= 0) return '<p class="res-mal">El precio debe superar el costo variable para que el negocio sea viable.</p>';
      const unidadesEq = v.costoFijo / margen;
      let extra = '';
      if (v.unidades > 0) {
        const resultado = margen * v.unidades - v.costoFijo;
        extra = resultado >= 0
          ? `<p class="res-bien">Vendiendo ${v.unidades} unidades, tu ganancia sería de ${fmtMoneda(resultado)}.</p>`
          : `<p class="res-mal">Vendiendo ${v.unidades} unidades, perderías ${fmtMoneda(Math.abs(resultado))}. Faltan ${Math.ceil(unidadesEq - v.unidades)} unidades para cubrir costos.</p>`;
      }
      return `<p>Necesitás vender <strong>${Math.ceil(unidadesEq)} unidades por mes</strong> para cubrir tus costos.</p>${extra}`;
    },
  },
  {
    id: 'pd', titulo: 'Precio o descuento', subtitulo: 'Contado, cuotas o promoción',
    descripcion: 'Compará el costo final entre pagar de contado con descuento o financiar en cuotas.',
    campos: [
      { id: 'precio', type: 'number', label: 'Precio de contado', placeholder: '100000' },
      { id: 'descuento', type: 'range', label: 'Descuento por pago contado (%)', min: 0, max: 30, step: 1, valorInicial: 10 },
      { id: 'cuotas', type: 'number', label: 'Cantidad de cuotas', placeholder: '6' },
      { id: 'interes', type: 'range', label: 'Interés total del financiamiento (%)', min: 0, max: 60, step: 1, valorInicial: 20 },
    ],
    calcular(v) {
      if (!v.precio || !v.cuotas) return null;
      const totalContado = v.precio * (1 - v.descuento / 100);
      const totalCuotas = v.precio * (1 + v.interes / 100);
      const valorCuota = totalCuotas / v.cuotas;
      const diferencia = totalCuotas - totalContado;
      const conviene = diferencia >= 0 ? 'pagar de contado' : 'financiar en cuotas';
      return `
        <div class="res-grid">
          <div><span>Contado (con descuento)</span><strong>${fmtMoneda(totalContado)}</strong></div>
          <div><span>${v.cuotas} cuotas de ${fmtMoneda(valorCuota)}</span><strong>${fmtMoneda(totalCuotas)}</strong></div>
        </div>
        <p>Conviene <strong>${conviene}</strong>: la diferencia es de ${fmtMoneda(Math.abs(diferencia))}.</p>
      `;
    },
  },
  {
    id: 'cr', titulo: 'Crédito', subtitulo: '¿Solución o trampa?',
    descripcion: 'Simulá el costo total de un préstamo y lo que suma atrasarse en el pago.',
    campos: [
      { id: 'monto', type: 'number', label: 'Monto del préstamo', placeholder: '200000' },
      { id: 'tasa', type: 'range', label: 'Tasa de interés mensual (%)', min: 0, max: 15, step: 0.5, valorInicial: 8 },
      { id: 'meses', type: 'number', label: 'Cantidad de cuotas', placeholder: '12' },
      { id: 'atraso', type: 'number', label: 'Días de atraso (opcional)', placeholder: '0' },
      { id: 'mora', type: 'range', label: 'Mora diaria (%)', min: 0, max: 2, step: 0.1, valorInicial: 0.5 },
    ],
    calcular(v) {
      if (!v.monto || !v.meses) return null;
      const totalSinMora = v.monto * (1 + (v.tasa / 100) * v.meses);
      const cuotaMensual = totalSinMora / v.meses;
      let mora = '';
      if (v.atraso > 0) {
        const montoMora = v.monto * (v.mora / 100) * v.atraso;
        mora = `<p class="res-mal">Con ${v.atraso} días de atraso, se suman ${fmtMoneda(montoMora)} de mora. Total: ${fmtMoneda(totalSinMora + montoMora)}.</p>`;
      }
      return `
        <div class="res-grid">
          <div><span>Cuota mensual</span><strong>${fmtMoneda(cuotaMensual)}</strong></div>
          <div><span>Costo total del crédito</span><strong>${fmtMoneda(totalSinMora)}</strong></div>
        </div>
        <p>Terminás pagando ${fmtMoneda(totalSinMora - v.monto)} de más sobre lo pedido.</p>${mora}
      `;
    },
  },
  {
    id: 'od', titulo: 'Oferta y demanda', subtitulo: 'Con eventos de mercado en shock',
    descripcion: 'Modificá el precio y aplicá un evento para ver cómo reacciona un mercado simulado.',
    campos: [
      { id: 'precio', type: 'range', label: 'Precio del producto', min: 50, max: 300, step: 5, valorInicial: 150 },
      { id: 'shock', type: 'select', label: 'Evento del mercado', opciones: [
        { value: 'ninguno', label: 'Ninguno' },
        { value: 'sequia', label: 'Sequía (baja la oferta)' },
        { value: 'rumor', label: 'Rumor viral (sube la demanda)' },
        { value: 'importacion', label: 'Importación barata (sube la oferta)' },
      ] },
    ],
    calcular(v) {
      const shocks = {
        ninguno: { oferta: 0, demanda: 0, texto: '' },
        sequia: { oferta: -40, demanda: 0, texto: 'Una sequía redujo la oferta disponible.' },
        rumor: { oferta: 0, demanda: 50, texto: 'Un rumor viral disparó la demanda.' },
        importacion: { oferta: 60, demanda: 0, texto: 'Llegó importación barata y subió la oferta.' },
      };
      const s = shocks[v.shock] || shocks.ninguno;
      const demanda = Math.max(0, 240 - v.precio * 0.9 + s.demanda);
      const oferta = Math.max(0, v.precio * 0.8 - 20 + s.oferta);
      const max = Math.max(demanda, oferta, 1);
      let estado, clase;
      if (Math.abs(demanda - oferta) < max * 0.08) { estado = 'El mercado está cerca del equilibrio.'; clase = 'res-bien'; }
      else if (demanda > oferta) { estado = 'Hay escasez: la demanda supera a la oferta.'; clase = 'res-mal'; }
      else { estado = 'Hay excedente: sobra oferta respecto a la demanda.'; clase = 'res-mal'; }
      return `
        ${s.texto ? `<p class="res-alerta">${s.texto}</p>` : ''}
        <div class="bars-compare">
          <div class="bar-row"><span>Demanda</span><div class="bar-track"><div class="bar-fill bar-demanda" style="width:${Math.min(100, demanda / max * 100)}%"></div></div><strong>${Math.round(demanda)}</strong></div>
          <div class="bar-row"><span>Oferta</span><div class="bar-track"><div class="bar-fill bar-oferta" style="width:${Math.min(100, oferta / max * 100)}%"></div></div><strong>${Math.round(oferta)}</strong></div>
        </div>
        <p class="${clase}">${estado}</p>
      `;
    },
  },
  {
    id: 'ec', titulo: 'Empresa en crisis', subtitulo: 'Costos, empleo, inversión y producción',
    descripcion: 'Tomá decisiones difíciles y mirá su impacto estimado en el balance mensual.',
    campos: [
      { id: 'recorte', type: 'range', label: 'Recorte de costos (%)', min: 0, max: 50, step: 5, valorInicial: 0 },
      { id: 'empleo', type: 'range', label: 'Reducción de personal (%)', min: 0, max: 50, step: 5, valorInicial: 0 },
      { id: 'inversion', type: 'number', label: 'Inversión en mejoras', placeholder: '0', valorInicial: 0 },
      { id: 'produccion', type: 'range', label: 'Nivel de producción (%)', min: 50, max: 150, step: 5, valorInicial: 100 },
    ],
    calcular(v) {
      const impactoCostos = v.recorte * 1500;
      const impactoEmpleo = v.empleo * 1200;
      const riesgo = v.empleo > 25 ? 'Alto riesgo de perder calidad o clientes.' : v.empleo > 10 ? 'Riesgo moderado en la calidad del servicio.' : 'Bajo riesgo operativo.';
      const efectoProduccion = (v.produccion - 100) * 900;
      const balance = impactoCostos + impactoEmpleo + efectoProduccion - (v.inversion || 0);
      return `
        <p class="${balance >= 0 ? 'res-bien' : 'res-mal'}">Impacto estimado en el balance mensual: ${balance >= 0 ? '+' : ''}${fmtMoneda(balance)}</p>
        <p>${riesgo}</p>
        <p class="res-nota">Recortar costos y empleo mejora el número a corto plazo, pero afecta la calidad y la capacidad futura.</p>
      `;
    },
  },
  {
    id: 'inv', titulo: 'Mi primera inversión', subtitulo: 'Riesgo, liquidez y plazo',
    descripcion: 'Comparación educativa entre tres perfiles de inversión típicos.',
    campos: [
      { id: 'opcion', type: 'select', label: 'Tipo de inversión', opciones: [
        { value: 'plazo_fijo', label: 'Plazo fijo' },
        { value: 'fondo', label: 'Fondo común de inversión' },
        { value: 'acciones', label: 'Acciones' },
      ] },
      { id: 'monto', type: 'number', label: 'Monto a invertir', placeholder: '100000' },
      { id: 'plazo', type: 'number', label: 'Plazo en meses', placeholder: '12' },
    ],
    calcular(v) {
      if (!v.monto || !v.plazo) return null;
      const perfiles = {
        plazo_fijo: { tasa: 4, riesgo: 'Bajo', liquidez: 'Baja (hasta el vencimiento)' },
        fondo: { tasa: 7, riesgo: 'Medio', liquidez: 'Media (unos días)' },
        acciones: { tasa: 12, riesgo: 'Alto', liquidez: 'Alta, pero con precio variable' },
      };
      const p = perfiles[v.opcion];
      const ganancia = v.monto * (p.tasa / 100) * (v.plazo / 12);
      return `
        <div class="res-grid">
          <div><span>Riesgo</span><strong>${p.riesgo}</strong></div>
          <div><span>Liquidez</span><strong>${p.liquidez}</strong></div>
          <div><span>Ganancia estimada</span><strong>${fmtMoneda(ganancia)}</strong></div>
        </div>
        <p class="res-nota">Estimación educativa con una tasa de referencia del ${p.tasa}% anual. No es asesoramiento financiero.</p>
      `;
    },
  },
  {
    id: 'ah', titulo: 'Meta de ahorro', subtitulo: 'Ajustala si aparece un imprevisto',
    descripcion: 'Calculá cuánto tardás en llegar a tu meta, y qué pasa si aparece un gasto inesperado.',
    campos: [
      { id: 'meta', type: 'number', label: 'Meta de ahorro', placeholder: '500000' },
      { id: 'mensual', type: 'number', label: 'Ahorro mensual', placeholder: '40000' },
      { id: 'imprevisto', type: 'checkbox', label: 'Simular un imprevisto que consume parte de lo ahorrado' },
    ],
    calcular(v) {
      if (!v.meta || !v.mensual) return null;
      const mesesBase = Math.ceil(v.meta / v.mensual);
      let resultado = `<p>Necesitás <strong>${mesesBase} meses</strong> para llegar a tu meta de ${fmtMoneda(v.meta)}.</p>`;
      if (v.imprevisto) {
        const ahorroPerdido = v.mensual * 2;
        const mesesConImprevisto = Math.ceil((v.meta + ahorroPerdido) / v.mensual);
        resultado += `<p class="res-alerta">Apareció un imprevisto que te costó ${fmtMoneda(ahorroPerdido)} de ahorro. Ahora necesitás ${mesesConImprevisto} meses.</p>`;
      }
      return resultado;
    },
  },
  {
    id: 'ci', titulo: 'El costo invisible', subtitulo: 'Lo que el precio no muestra',
    descripcion: 'Elegí un consumo cotidiano y descubrí su costo social o ambiental estimado.',
    campos: [
      { id: 'producto', type: 'select', label: 'Consumo', opciones: [
        { value: 'remera_rapida', label: 'Remera de moda rápida' },
        { value: 'vuelo_corto', label: 'Vuelo corto en avión' },
        { value: 'carne', label: 'Kilo de carne' },
        { value: 'plastico', label: 'Botella de plástico' },
      ] },
    ],
    calcular(v) {
      const datos = {
        remera_rapida: { precio: 3000, invisible: 'Uso intensivo de agua y condiciones laborales precarias en la producción.' },
        vuelo_corto: { precio: 25000, invisible: 'Alta emisión de CO₂ por pasajero en trayectos cortos.' },
        carne: { precio: 4000, invisible: 'Uso de tierra, agua y emisiones asociadas a la ganadería.' },
        plastico: { precio: 500, invisible: 'Contaminación que persiste cientos de años en los ecosistemas.' },
      };
      const d = datos[v.producto];
      return `
        <div class="res-grid"><div><span>Precio visible</span><strong>${fmtMoneda(d.precio)}</strong></div></div>
        <p class="res-nota">Costo invisible: ${d.invisible}</p>
        <p>El precio que pagamos no siempre refleja el costo real para la sociedad o el ambiente.</p>
      `;
    },
  },
  {
    id: 'circ', titulo: 'Economía circular', subtitulo: 'Producir, reparar, reutilizar o reciclar',
    descripcion: 'Elegí qué hacer con un producto usado y mirá el costo e impacto de cada opción.',
    campos: [
      { id: 'opcion', type: 'radio', label: '¿Qué hacés con el producto?', opciones: [
        { value: 'nuevo', label: 'Comprar uno nuevo' },
        { value: 'reparar', label: 'Repararlo' },
        { value: 'reutilizar', label: 'Reutilizarlo para otra cosa' },
        { value: 'reciclar', label: 'Reciclarlo' },
      ] },
    ],
    calcular(v) {
      if (!v.opcion) return null;
      const datos = {
        nuevo: { costo: 15000, impacto: 'Alto: usa materia prima nueva y genera más residuos.' },
        reparar: { costo: 4000, impacto: 'Bajo: extiende la vida útil del producto.' },
        reutilizar: { costo: 500, impacto: 'Muy bajo: le da un nuevo uso sin procesar materiales.' },
        reciclar: { costo: 2500, impacto: 'Medio: recupera materiales pero consume energía en el proceso.' },
      };
      const d = datos[v.opcion];
      return `<div class="res-grid"><div><span>Costo estimado</span><strong>${fmtMoneda(d.costo)}</strong></div></div><p>${d.impacto}</p>`;
    },
  },
  {
    id: 'imp', titulo: '¿Qué impuestos pagamos?', subtitulo: 'Impuestos en consumos cotidianos',
    descripcion: 'Calculá cuánto impuesto pagás en una compra y a dónde suele destinarse.',
    campos: [
      { id: 'importe', type: 'number', label: 'Importe de la compra', placeholder: '10000' },
      { id: 'tipo', type: 'select', label: 'Tipo de impuesto', opciones: [
        { value: 'iva21', label: 'IVA general (21%)' },
        { value: 'iva10_5', label: 'IVA reducido (10,5%)' },
        { value: 'internos', label: 'Impuestos internos (17%)' },
      ] },
    ],
    calcular(v) {
      if (!v.importe) return null;
      const tasas = {
        iva21: { tasa: 21, destino: 'Rentas generales: educación, salud, seguridad y obra pública.' },
        iva10_5: { tasa: 10.5, destino: 'Alimentos y otros bienes básicos, con alícuota reducida.' },
        internos: { tasa: 17, destino: 'Impuestos sobre bienes específicos (ej. combustibles, tabaco).' },
      };
      const t = tasas[v.tipo];
      const monto = v.importe * (t.tasa / 100);
      return `
        <div class="res-grid">
          <div><span>Impuesto pagado</span><strong>${fmtMoneda(monto)}</strong></div>
          <div><span>Alícuota</span><strong>${t.tasa}%</strong></div>
        </div>
        <p class="res-nota">Destino habitual: ${t.destino}</p>
      `;
    },
  },
  {
    id: 'pp', titulo: 'Presupuesto público', subtitulo: 'Distribuí recursos del estado',
    descripcion: 'Repartí el 100% de un presupuesto estatal entre sectores y mirá el efecto.',
    campos: [
      { id: 'educacion', type: 'range', label: 'Educación (%)', min: 0, max: 100, step: 5, valorInicial: 20 },
      { id: 'salud', type: 'range', label: 'Salud (%)', min: 0, max: 100, step: 5, valorInicial: 20 },
      { id: 'seguridad', type: 'range', label: 'Seguridad (%)', min: 0, max: 100, step: 5, valorInicial: 20 },
      { id: 'infraestructura', type: 'range', label: 'Infraestructura (%)', min: 0, max: 100, step: 5, valorInicial: 20 },
      { id: 'otros', type: 'range', label: 'Otros (%)', min: 0, max: 100, step: 5, valorInicial: 20 },
    ],
    calcular(v) {
      const total = v.educacion + v.salud + v.seguridad + v.infraestructura + v.otros;
      if (Math.round(total) !== 100) return `<p class="res-alerta">La suma es ${Math.round(total)}%. Ajustá hasta llegar a 100%.</p>`;
      let alerta = '';
      if (v.educacion < 10) alerta += '<p class="res-mal">Muy poca inversión en educación puede afectar el futuro a largo plazo.</p>';
      if (v.salud < 10) alerta += '<p class="res-mal">Un presupuesto de salud bajo compromete la atención pública.</p>';
      if (v.seguridad > 40) alerta += '<p class="res-mal">Una parte muy alta en seguridad deja poco para otras áreas.</p>';
      return `<p class="res-bien">Distribuiste el 100% del presupuesto.</p>${alerta || '<p class="res-nota">Una distribución equilibrada entre sectores.</p>'}`;
    },
  },
  {
    id: 'cv', titulo: 'Cadena de valor', subtitulo: 'De la materia prima al precio final',
    descripcion: 'Sumá los costos de cada etapa y mirá cómo se forma el precio final.',
    campos: [
      { id: 'materia', type: 'number', label: 'Costo de materia prima', placeholder: '500' },
      { id: 'produccion', type: 'number', label: 'Costo de producción', placeholder: '300' },
      { id: 'distribucion', type: 'number', label: 'Costo de distribución', placeholder: '200' },
      { id: 'margen', type: 'range', label: 'Margen del vendedor (%)', min: 5, max: 100, step: 5, valorInicial: 40 },
    ],
    calcular(v) {
      if (!v.materia) return null;
      const paso1 = v.materia;
      const paso2 = paso1 + (v.produccion || 0);
      const paso3 = paso2 + (v.distribucion || 0);
      const final = paso3 * (1 + v.margen / 100);
      return `
        <div class="stepper">
          <div class="step"><span>Materia prima</span><strong>${fmtMoneda(paso1)}</strong></div>
          <div class="step"><span>+ Producción</span><strong>${fmtMoneda(paso2)}</strong></div>
          <div class="step"><span>+ Distribución</span><strong>${fmtMoneda(paso3)}</strong></div>
          <div class="step step-final"><span>Precio final</span><strong>${fmtMoneda(final)}</strong></div>
        </div>
      `;
    },
  },
  {
    id: 'est', titulo: 'Detectá la estafa', subtitulo: 'Señales de alerta financieras',
    descripcion: 'Marcá las frases que consideres señales de alerta en una propuesta de inversión.',
    campos: [
      { id: 's1', type: 'checkbox', label: 'Te garantizan una ganancia fija altísima, sin riesgo.', correcta: true },
      { id: 's2', type: 'checkbox', label: 'La empresa está registrada ante el organismo regulador.', correcta: false },
      { id: 's3', type: 'checkbox', label: 'Te piden sumar gente nueva para ganar más vos.', correcta: true },
      { id: 's4', type: 'checkbox', label: 'Podés retirar tu dinero cuando quieras, según lo firmado.', correcta: false },
      { id: 's5', type: 'checkbox', label: 'Te presionan a decidir "hoy mismo" porque se vence la oferta.', correcta: true },
      { id: 's6', type: 'checkbox', label: 'No hay información clara sobre en qué se invierte tu dinero.', correcta: true },
    ],
    calcular(v, campos) {
      const correctas = campos.filter((c) => c.correcta);
      const marcadas = campos.filter((c) => v[c.id]);
      const aciertos = correctas.filter((c) => v[c.id]).length;
      const falsos = marcadas.filter((c) => !c.correcta).length;
      let mensaje;
      if (aciertos === correctas.length && falsos === 0) mensaje = '<p class="res-bien">¡Identificaste todas las señales de alerta reales!</p>';
      else mensaje = `<p class="res-alerta">Marcaste ${aciertos} de ${correctas.length} señales reales${falsos ? `, y ${falsos} que no lo son` : ''}.</p>`;
      return mensaje + '<p class="res-nota">Señales reales: garantía sin riesgo, presión para reclutar, urgencia para decidir ya, y falta de información clara.</p>';
    },
  },
  {
    id: 'cons', titulo: 'Consumo inteligente', subtitulo: 'Necesidad, deseo y costo de oportunidad',
    descripcion: 'Distinguí necesidad de deseo y calculá qué perdés (o ganás) por gastar ahora.',
    campos: [
      { id: 'monto', type: 'number', label: 'Monto que pensás gastar', placeholder: '20000' },
      { id: 'tipo', type: 'radio', label: '¿Es necesidad o deseo?', opciones: [
        { value: 'necesidad', label: 'Necesidad' },
        { value: 'deseo', label: 'Deseo' },
      ] },
      { id: 'tasa', type: 'range', label: 'Rendimiento anual si lo invertís (%)', min: 0, max: 100, step: 5, valorInicial: 40 },
      { id: 'meses', type: 'number', label: 'Meses que podrías esperar', placeholder: '6' },
    ],
    calcular(v) {
      if (!v.monto || !v.meses) return null;
      const costoOportunidad = v.monto * (v.tasa / 100) * (v.meses / 12);
      const consejo = v.tipo === 'necesidad'
        ? 'Al ser una necesidad, priorizar el gasto ahora suele tener sentido.'
        : `Al ser un deseo, esperar ${v.meses} meses e invertir ese dinero te daría ${fmtMoneda(costoOportunidad)} extra.`;
      return `<div class="res-grid"><div><span>Costo de oportunidad</span><strong>${fmtMoneda(costoOportunidad)}</strong></div></div><p>${consejo}</p>`;
    },
  },
];

function crearCampoHTML(simId, campo) {
  const name = `${simId}-${campo.id}`;
  if (campo.type === 'select') {
    return `<label class="field"><span>${campo.label}</span><select id="${name}">${campo.opciones.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}</select></label>`;
  }
  if (campo.type === 'radio') {
    return `<fieldset class="field field-radio"><legend>${campo.label}</legend>${campo.opciones.map((o, i) => `
      <label class="radio-opt"><input type="radio" name="${name}" value="${o.value}" ${i === 0 ? 'checked' : ''}>${o.label}</label>`).join('')}</fieldset>`;
  }
  if (campo.type === 'checkbox') {
    return `<label class="field field-checkbox"><input type="checkbox" id="${name}"><span>${campo.label}</span></label>`;
  }
  if (campo.type === 'range') {
    return `<label class="field"><span>${campo.label}: <strong id="${name}-val">${campo.valorInicial}</strong></span><input type="range" id="${name}" min="${campo.min}" max="${campo.max}" step="${campo.step || 1}" value="${campo.valorInicial}"></label>`;
  }
  return `<label class="field"><span>${campo.label}</span><input type="number" id="${name}" min="0" step="any" placeholder="${campo.placeholder || ''}" value="${campo.valorInicial ?? ''}"></label>`;
}

function leerValor(simId, campo) {
  const name = `${simId}-${campo.id}`;
  if (campo.type === 'select') return document.getElementById(name).value;
  if (campo.type === 'radio') {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }
  if (campo.type === 'checkbox') return document.getElementById(name).checked;
  const el = document.getElementById(name);
  return el.value === '' ? NaN : parseFloat(el.value);
}

function renderSimuladores() {
  const cont = document.getElementById('simuladores-grid');
  cont.innerHTML = simuladores.map((sim) => `
    <details class="sim-card">
      <summary>
        <span class="sim-title">${sim.titulo}</span>
        <span class="sim-sub">${sim.subtitulo}</span>
      </summary>
      <div class="sim-body">
        <p class="sim-desc">${sim.descripcion}</p>
        <div class="sim-fields">${sim.campos.map((c) => crearCampoHTML(sim.id, c)).join('')}</div>
        <div class="result-box" id="${sim.id}-resultado"><p class="empty-note">Completá los datos para ver el resultado.</p></div>
      </div>
    </details>
  `).join('');

  simuladores.forEach((sim) => {
    const actualizar = () => {
      const valores = {};
      sim.campos.forEach((c) => { valores[c.id] = leerValor(sim.id, c); });
      sim.campos.filter((c) => c.type === 'range').forEach((c) => {
        const val = document.getElementById(`${sim.id}-${c.id}`).value;
        const disp = document.getElementById(`${sim.id}-${c.id}-val`);
        if (disp) disp.textContent = val;
      });
      const box = document.getElementById(`${sim.id}-resultado`);
      let salida = null;
      try { salida = sim.calcular(valores, sim.campos); } catch { salida = null; }
      box.innerHTML = salida || '<p class="empty-note">Completá los datos para ver el resultado.</p>';
    };

    sim.campos.forEach((c) => {
      const name = `${sim.id}-${c.id}`;
      if (c.type === 'radio') {
        document.querySelectorAll(`input[name="${name}"]`).forEach((el) => el.addEventListener('change', actualizar));
      } else {
        const el = document.getElementById(name);
        if (el) el.addEventListener('input', actualizar);
      }
    });

    actualizar();
  });
}

/* ---------------- RENDER GENERAL ---------------- */

function renderTodo() {
  renderResumen();
  renderMovimientos();
  renderDocumentos();
  renderPresupuesto();
  renderChartEvolucion();
  renderChartCategorias();
  renderProyeccion();
}

renderSimuladores();

/* ---------------- INICIO ---------------- */

if (leer(STORAGE.sesion) === true) {
  mostrarApp();
}
