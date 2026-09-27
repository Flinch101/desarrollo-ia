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
};

const fmtMoneda = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

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

let movimientos = leer(STORAGE.movimientos) || [];
let documentos = leer(STORAGE.documentos) || [];

/* ---------------- LOGIN ---------------- */

const loginScreen = document.getElementById('login-screen');
const appEl = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

function mostrarApp() {
  loginScreen.hidden = true;
  appEl.hidden = false;
  inicializarVistaHoy();
  renderTodo();
}

function mostrarLogin() {
  appEl.hidden = true;
  loginScreen.hidden = false;
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
  label.textContent = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
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

/* ---------------- MOVIMIENTOS ---------------- */

const movForm = document.getElementById('movimiento-form');
document.getElementById('mov-fecha').value = hoy();

movForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const tipo = document.getElementById('mov-tipo').value;
  const concepto = document.getElementById('mov-concepto').value.trim();
  const categoria = document.getElementById('mov-categoria').value;
  const importe = parseFloat(document.getElementById('mov-importe').value);
  const fecha = document.getElementById('mov-fecha').value;

  if (!concepto || isNaN(importe) || importe <= 0 || !fecha) return;

  movimientos.push({
    id: Date.now().toString(36),
    tipo, concepto, categoria, importe, fecha,
  });

  guardar(STORAGE.movimientos, movimientos);
  movForm.reset();
  document.getElementById('mov-fecha').value = hoy();
  renderTodo();
});

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
      <td><span class="tag tag-${m.tipo}">${m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td>
      <td class="col-right">${m.tipo === 'gasto' ? '−' : ''}${fmtMoneda(m.importe)}</td>
      <td><button class="row-delete" data-id="${m.id}" title="Eliminar">✕</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('.row-delete').forEach((b) =>
    b.addEventListener('click', () => eliminarMovimiento(b.dataset.id))
  );
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

  documentos.push({
    id: Date.now().toString(36),
    nombre, estado, importe, fecha,
  });

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
      <td><button class="row-delete" data-id="${d.id}" title="Eliminar">✕</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('.row-delete').forEach((b) =>
    b.addEventListener('click', () => eliminarDocumento(b.dataset.id))
  );
}

/* ---------------- RESUMEN / ESTADÍSTICAS ---------------- */

function mesActualStr() {
  return hoy().slice(0, 7); // YYYY-MM
}

function renderResumen() {
  const balanceTotal = movimientos.reduce(
    (acc, m) => acc + (m.tipo === 'ingreso' ? m.importe : -m.importe), 0
  );

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

/* ---------------- GRÁFICOS ---------------- */

let chartEvolucion = null;
let chartCategorias = null;

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
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'short' });
}

function renderChartEvolucion() {
  const meses = ultimosNMeses(6);
  const ingresosPorMes = meses.map((ym) =>
    movimientos.filter((m) => m.tipo === 'ingreso' && m.fecha.slice(0, 7) === ym)
      .reduce((a, m) => a + m.importe, 0)
  );
  const gastosPorMes = meses.map((ym) =>
    movimientos.filter((m) => m.tipo === 'gasto' && m.fecha.slice(0, 7) === ym)
      .reduce((a, m) => a + m.importe, 0)
  );

  const ctx = document.getElementById('chart-evolucion');
  if (chartEvolucion) chartEvolucion.destroy();

  chartEvolucion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses.map(nombreMes),
      datasets: [
        { label: 'Ingresos', data: ingresosPorMes, backgroundColor: '#86BF93', borderRadius: 4, maxBarThickness: 26 },
        { label: 'Gastos', data: gastosPorMes, backgroundColor: '#E08770', borderRadius: 4, maxBarThickness: 26 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#93A296', font: { family: 'IBM Plex Sans', size: 12 } } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#93A296' } },
        y: { grid: { color: '#223026' }, ticks: { color: '#93A296' } },
      },
    },
  });
}

const COLORES_CATEGORIA = ['#D2A857', '#86BF93', '#E08770', '#7FA6BF', '#B08FD0', '#C9C0A8', '#6E8E7C'];

function renderChartCategorias() {
  const gastos = movimientos.filter((m) => m.tipo === 'gasto');
  const porCategoria = {};
  gastos.forEach((m) => {
    porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.importe;
  });

  const ctx = document.getElementById('chart-categorias');
  const sinGastos = document.getElementById('sin-gastos');

  if (chartCategorias) chartCategorias.destroy();

  if (Object.keys(porCategoria).length === 0) {
    sinGastos.hidden = false;
    ctx.style.display = 'none';
    return;
  }
  sinGastos.hidden = true;
  ctx.style.display = 'block';

  chartCategorias = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(porCategoria),
      datasets: [{
        data: Object.values(porCategoria),
        backgroundColor: Object.keys(porCategoria).map((_, i) => COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]),
        borderColor: '#16221B',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#93A296', boxWidth: 11, font: { family: 'IBM Plex Sans', size: 11.5 } } },
      },
    },
  });
}

/* ---------------- PROYECCIÓN ---------------- */

function renderProyeccion() {
  const grid = document.getElementById('proy-grid');
  const sinDatos = document.getElementById('proy-sin-datos');

  const meses = ultimosNMeses(3);
  const netoPorMes = meses.map((ym) => {
    const del = movimientos.filter((m) => m.fecha.slice(0, 7) === ym);
    const ing = del.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.importe, 0);
    const gas = del.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.importe, 0);
    return { ing, gas, neto: ing - gas };
  });

  const mesesConDatos = netoPorMes.filter((m) => m.ing > 0 || m.gas > 0);
  if (mesesConDatos.length === 0) {
    sinDatos.hidden = false;
    grid.innerHTML = '';
    return;
  }
  sinDatos.hidden = true;

  const promIng = mesesConDatos.reduce((a, m) => a + m.ing, 0) / mesesConDatos.length;
  const promGas = mesesConDatos.reduce((a, m) => a + m.gas, 0) / mesesConDatos.length;
  const promNeto = promIng - promGas;

  let balanceActual = movimientos.reduce(
    (acc, m) => acc + (m.tipo === 'ingreso' ? m.importe : -m.importe), 0
  );

  const hoyD = new Date();
  const tarjetas = [];
  for (let i = 1; i <= 3; i++) {
    const fecha = new Date(hoyD.getFullYear(), hoyD.getMonth() + i, 1);
    balanceActual += promNeto;
    tarjetas.push({
      mes: fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
      balance: balanceActual,
      ing: promIng,
      gas: promGas,
    });
  }

  grid.innerHTML = tarjetas.map((t) => `
    <div class="proy-card">
      <span class="proy-mes">${t.mes[0].toUpperCase() + t.mes.slice(1)}</span>
      <span class="proy-balance ${t.balance >= 0 ? 'stat-positive' : 'stat-negative'}">${fmtMoneda(t.balance)}</span>
      <div class="proy-detail"><span>Ingresos prom.</span><span>${fmtMoneda(t.ing)}</span></div>
      <div class="proy-detail"><span>Gastos prom.</span><span>${fmtMoneda(t.gas)}</span></div>
    </div>
  `).join('');
}

/* ---------------- UTIL ---------------- */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTodo() {
  renderResumen();
  renderMovimientos();
  renderDocumentos();
  renderChartEvolucion();
  renderChartCategorias();
  renderProyeccion();
}

/* ---------------- INICIO ---------------- */
/* Se comprueba acá, al final, para que todas las funciones y
   variables usadas por mostrarApp() ya estén declaradas. */

if (leer(STORAGE.sesion) === true) {
  mostrarApp();
}
