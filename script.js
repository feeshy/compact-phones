// script.js
let phonesData = [];
let currentSortField = "width";
let currentSortOrder = "asc";

const widthInput = document.getElementById('widthMax');
const thickInput = document.getElementById('thickMax');
const weightInput = document.getElementById('weightMax');
const batteryInput = document.getElementById('batteryMin');

// 类型开关
let currentTypeFilter = "直板";

// 表格滚动激活标志（点击表格后激活）
let tableScrollActive = false;
let tableWrapper = null;

// 年份范围输入框初始化
function initYearRange() {
  const yearFrom = document.getElementById('yearFrom');
  const yearTo = document.getElementById('yearTo');
  if (!yearFrom || !yearTo) return;

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  // 设置默认值（去年 ~ 今年）
  yearFrom.value = lastYear;
  yearTo.value = currentYear;

  // 监听输入变化
  yearFrom.addEventListener('input', () => refresh());
  yearTo.addEventListener('input', () => refresh());
}

// 获取年份范围
function getYearRange() {
  const fromVal = document.getElementById('yearFrom').value;
  const toVal = document.getElementById('yearTo').value;
  let from = fromVal === '' ? -Infinity : parseInt(fromVal);
  let to = toVal === '' ? Infinity : parseInt(toVal);
  if (from > to) { [from, to] = [to, from]; }
  return { from, to };
}

async function loadCSVAndMetadata() {
  try {
    const response = await fetch('data.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法加载 data.csv');
    const lastModified = response.headers.get('Last-Modified');
    if (lastModified) {
      const date = new Date(lastModified);
      document.getElementById('updateDateBadge').innerText = `更新：${date.toLocaleDateString()}`;
    } else {
      document.getElementById('updateDateBadge').innerText = `更新：2026-05-17 (静态)`;
    }
    const csvText = await response.text();
    parseCSV(csvText);
  } catch (error) {
    console.error(error);
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="11">数据加载失败，请确保 data.csv 文件存在</td></tr>';
    document.getElementById('statsInfo').innerText = '加载失败';
  }
}

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return;
  const headers = lines[0].split(',').map(h => h.trim());
  const idxModel = headers.indexOf('型号');
  const idxBrand = headers.indexOf('品牌');
  const idxRatio = headers.indexOf('屏幕比例');
  const idxSize = headers.indexOf('屏幕尺寸');
  const idxWidth = headers.indexOf('宽度');
  const idxThick = headers.indexOf('厚度');
  const idxWeight = headers.indexOf('重量');
  const idxBattery = headers.indexOf('电池');
  const idxYear = headers.indexOf('发布年份');
  const idxSoc = headers.indexOf('SoC');
  const idxType = headers.indexOf('类型');

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length < 11) continue;
    const model = row[idxModel]?.trim() || '';
    const brand = row[idxBrand]?.trim() || '';
    const screenRatio = row[idxRatio]?.trim() || '';
    let screenSize = parseFloat(row[idxSize]?.trim());
    let width = parseFloat(row[idxWidth]?.trim());
    let thickness = parseFloat(row[idxThick]?.trim());
    let weight = parseFloat(row[idxWeight]?.trim());
    let battery = parseFloat(row[idxBattery]?.trim());
    let year = parseInt(row[idxYear]?.trim());
    const soc = row[idxSoc]?.trim() || '';
    const type = row[idxType]?.trim() || '';

    if (isNaN(screenSize)) screenSize = null;
    if (isNaN(width)) width = null;
    if (isNaN(thickness)) thickness = null;
    if (isNaN(weight)) weight = null;
    if (isNaN(battery)) battery = null;
    if (isNaN(year)) year = null;

    data.push({ model, brand, screenRatio, screenSize, width, thickness, weight, battery, year, soc, type });
  }
  phonesData = data;
  initYearRange();
  setDefaultFilters();
  refresh();
}

function setDefaultFilters() {
  widthInput.value = 72;
  weightInput.value = 200;
  thickInput.value = '';
  batteryInput.value = '';
}

function resetAllFilters() {
  document.getElementById('yearFrom').value = '';
  document.getElementById('yearTo').value = '';

  currentTypeFilter = 'all';
  const btns = document.querySelectorAll('#typeSwitchGroup .type-option');
  btns.forEach(btn => {
    if (btn.getAttribute('data-type') === 'all') btn.classList.add('active');
    else btn.classList.remove('active');
  });
  widthInput.value = '';
  thickInput.value = '';
  weightInput.value = '';
  batteryInput.value = '';
  currentSortField = 'width';
  currentSortOrder = 'asc';
  document.getElementById('sortField').value = 'width';
  updateSortButtonText();
  refresh();
}

function filterData() {
  const { from, to } = getYearRange();
  const widthMax = widthInput.value === '' ? Infinity : parseFloat(widthInput.value);
  const thickMax = thickInput.value === '' ? Infinity : parseFloat(thickInput.value);
  const weightMax = weightInput.value === '' ? Infinity : parseFloat(weightInput.value);
  const batteryMin = batteryInput.value === '' ? -Infinity : parseFloat(batteryInput.value);

  return phonesData.filter(p => {
    if (p.year !== null && (p.year < from || p.year > to)) return false;
    if (currentTypeFilter !== 'all' && p.type !== currentTypeFilter) return false;
    if (p.width !== null && p.width > widthMax) return false;
    if (p.thickness !== null && p.thickness > thickMax) return false;
    if (p.weight !== null && p.weight > weightMax) return false;
    if (p.battery !== null && p.battery < batteryMin) return false;
    if (widthMax !== Infinity && p.width === null) return false;
    if (thickMax !== Infinity && p.thickness === null) return false;
    if (weightMax !== Infinity && p.weight === null) return false;
    if (batteryMin !== -Infinity && p.battery === null) return false;
    return true;
  });
}

function getSortValue(item, field) {
  switch (field) {
    case 'model': return item.model;
    case 'brand': return item.brand;
    case 'screenRatio': return item.screenRatio;
    case 'screenSize': return item.screenSize ?? -1;
    case 'width': return item.width ?? Infinity;
    case 'thickness': return item.thickness ?? Infinity;
    case 'weight': return item.weight ?? Infinity;
    case 'battery': return item.battery ?? -1;
    case 'year': return item.year ?? -1;
    case 'type': return item.type;
    case 'soc': return item.soc;
    default: return item.model;
  }
}

function sortData(data) {
  return [...data].sort((a, b) => {
    let aVal = getSortValue(a, currentSortField);
    let bVal = getSortValue(b, currentSortField);
    const isNum = typeof aVal === 'number' && typeof bVal === 'number';
    if (aVal === null) aVal = '';
    if (bVal === null) bVal = '';
    if (isNum) {
      return currentSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();
    if (currentSortOrder === 'asc') return strA.localeCompare(strB);
    else return strB.localeCompare(strA);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// 修复表格渲染：确保没有多余的文本节点
function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11">没有符合筛选条件的手机</td></tr>';
    return;
  }
  let html = '';
  for (const p of data) {
    html += `
            <tr>
                <td>${escapeHtml(p.model)}</td>
                <td>${escapeHtml(p.brand)}</td>
                <td>${escapeHtml(p.screenRatio || '-')}</td>
                <td>${p.screenSize !== null ? p.screenSize : '-'}</td>
                <td>${p.width !== null ? p.width : '-'}</td>
                <td>${p.thickness !== null ? p.thickness : '-'}</td>
                <td>${p.weight !== null ? p.weight : '-'}</td>
                <td>${p.battery !== null ? p.battery : '-'}</td>
                <td>${p.year ?? '-'}</td>
                <td>${escapeHtml(p.soc || '-')}</td>
                <td>${p.type}</td>
            </tr>
        `;
  }
  tbody.innerHTML = html;
  document.getElementById('statsInfo').innerHTML = `显示 ${data.length} / ${phonesData.length} 款`;
}

function renderCards(data) {
  const container = document.getElementById('cardsContainer');
  if (data.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem;">没有符合条件的手机</div>';
    return;
  }
  let html = '';
  for (const p of data) {
    html += `
            <div class="phone-card">
                <div class="card-header">
                    <span class="model-name">${escapeHtml(p.model)}</span>
                    <span class="brand-name">${escapeHtml(p.brand)}</span>
                </div>
                <div class="card-detail">
                    <div class="detail-item"><span class="detail-label">比例</span><span>${escapeHtml(p.screenRatio || '-')}</span></div>
                    <div class="detail-item"><span class="detail-label">屏幕</span><span>${p.screenSize ?? '-'}"</span></div>
                    <div class="detail-item"><span class="detail-label">宽度</span><span>${p.width !== null ? p.width + 'mm' : '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">厚度</span><span>${p.thickness !== null ? p.thickness + 'mm' : '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">重量</span><span>${p.weight !== null ? p.weight + 'g' : '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">电池</span><span>${p.battery !== null ? p.battery + 'mAh' : '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">发布年份</span><span>${p.year ?? '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">SoC</span><span>${escapeHtml(p.soc || '-')}</span></div>
                    <div class="detail-item"><span class="detail-label">类型</span><span>${p.type}</span></div>
                </div>
            </div>
        `;
  }
  container.innerHTML = html;
}

function updateSortButtonText() {
  const btn = document.getElementById('sortOrderBtn');
  btn.innerText = currentSortOrder === 'asc' ? '升序' : '降序';
}

function refresh() {
  let filtered = filterData();
  filtered = sortData(filtered);
  renderTable(filtered);
  renderCards(filtered);
}

function bindEvents() {
  widthInput.addEventListener('input', refresh);
  thickInput.addEventListener('input', refresh);
  weightInput.addEventListener('input', refresh);
  batteryInput.addEventListener('input', refresh);
  document.getElementById('sortField').addEventListener('change', (e) => {
    currentSortField = e.target.value;
    refresh();
  });
  document.getElementById('sortOrderBtn').addEventListener('click', () => {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateSortButtonText();
    refresh();
  });
  document.getElementById('resetFilters').addEventListener('click', resetAllFilters);
  const headers = document.querySelectorAll('#phoneTable th[data-field]');
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-field');
      if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortField = field;
        currentSortOrder = 'asc';
      }
      document.getElementById('sortField').value = currentSortField;
      updateSortButtonText();
      refresh();
    });
  });
}

// 优化滚动逻辑：点击表格区域激活表格滚动，点击其他区域取消激活
function initTableScrollActivation() {
  tableWrapper = document.querySelector('.table-wrapper');
  if (!tableWrapper) return;

  // 激活表格滚动（仅当点击表格内部时）
  const activateTableScroll = () => {
    tableScrollActive = true;
    tableWrapper.style.outline = '2px solid var(--accent-low-sat)';
    tableWrapper.style.outlineOffset = '-1px';
  };
  const deactivateTableScroll = () => {
    tableScrollActive = false;
    tableWrapper.style.outline = 'none';
  };

  // 点击表格内部激活
  tableWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    activateTableScroll();
  });
  // 点击文档其他位置取消激活
  document.addEventListener('click', (e) => {
    if (!tableWrapper.contains(e.target)) {
      deactivateTableScroll();
    }
  });
  // 可选：按 ESC 键取消激活
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tableScrollActive) {
      deactivateTableScroll();
    }
  });

  // 滚动事件：仅当激活时才阻止页面滚动并滚动表格
  tableWrapper.addEventListener('wheel', (e) => {
    if (tableScrollActive) {
      e.preventDefault();
      tableWrapper.scrollTop += e.deltaY;
    }
  }, { passive: false });

  let touchStartY = 0;
  tableWrapper.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  });
  tableWrapper.addEventListener('touchmove', (e) => {
    if (tableScrollActive) {
      const deltaY = e.touches[0].clientY - touchStartY;
      e.preventDefault();
      tableWrapper.scrollTop -= deltaY;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: false });
}

function initTypeSwitch() {
  const btns = document.querySelectorAll('#typeSwitchGroup .type-option');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-type');
      currentTypeFilter = val;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refresh();
    });
  });
  const defaultBtn = [...btns].find(b => b.getAttribute('data-type') === '直板');
  if (defaultBtn) defaultBtn.classList.add('active');
}

// 启动
initTypeSwitch();
bindEvents();
initTableScrollActivation();   // 新的滚动激活逻辑
loadCSVAndMetadata();