// script.js
let phonesData = [];
let currentSortField = "width";
let currentSortOrder = "asc";

const widthInput = document.getElementById('widthMax');
const thickInput = document.getElementById('thickMax');
const weightInput = document.getElementById('weightMax');
const batteryInput = document.getElementById('batteryMin');

// 类型开关
let currentTypeFilter = "all";

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

async function loadCSVData() {
  try {
    const response = await fetch('data.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法加载 data.csv');
    const csvText = await response.text();
    parseCSV(csvText);
  } catch (error) {
    console.error(error);
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="11">加载失败，请访问 <a href="https://docs.google.com/spreadsheets/d/e/2PACX-1vTxyzFWZtixYEqZMLHM_hwnSeSmFjIxIm27YWVMIMZjbfkbsfG6aPLR1fqAFuiyyW6K8znFPuAqVrOj/pubhtml?gid=134994152&single=true" target="_blank">Google Sheet</a> 查看源数据</td></tr>';
    document.getElementById('statsInfo').innerText = '0/0';
  }
}

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return;
  const headers = lines[0].split(',').map(h => h.trim());

  // 动态查找列索引
  const idxModel = headers.findIndex(h => h.includes('机型'));
  const idxBrand = headers.findIndex(h => h.includes('品牌'));
  const idxRatio = headers.findIndex(h => h.includes('比例'));
  const idxSize = headers.findIndex(h => h.includes('尺寸'));
  const idxWidth = headers.findIndex(h => h.includes('宽度'));
  const idxThick = headers.findIndex(h => h.includes('厚度'));
  const idxWeight = headers.findIndex(h => h.includes('重量'));
  const idxBattery = headers.findIndex(h => h.includes('电池'));
  const idxSoc = headers.findIndex(h => h.toLowerCase().includes('soc'));
  const idxYear = headers.findIndex(h => h.includes('年份'));
  const idxType = headers.findIndex(h => h.includes('类型'));
  const idxUrl = headers.findIndex(h => h.includes('官网'));
  const idxRemark = headers.findIndex(h => h.includes('备注'));

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
    const url = row[idxUrl]?.trim() || '';
    const remark = row[idxRemark]?.trim() || '';

    if (isNaN(screenSize)) screenSize = null;
    if (isNaN(width)) width = null;
    if (isNaN(thickness)) thickness = null;
    if (isNaN(weight)) weight = null;
    if (isNaN(battery)) battery = null;
    if (isNaN(year)) year = null;

    data.push({ model, brand, screenRatio, screenSize, width, thickness, weight, battery, year, soc, type, url, remark });
  }
  phonesData = data;
  initYearRange();
  getMaxValue();
  setDefaultFilters();
  refresh();
}

// 计算直板/折叠机的最大宽度和最大重量
function getMaxValue() {
  if (phonesData.length === 0) return;

  const slabWidths = [];
  const slabWeights = [];
  const foldWidths = [];
  const foldWeights = [];

  for (const p of phonesData) {
    if (p.type === '直板') {
      if (p.width !== null) slabWidths.push(p.width);
      if (p.weight !== null) slabWeights.push(p.weight);
    } else if (p.type === '折叠') {
      if (p.width !== null) foldWidths.push(p.width);
      if (p.weight !== null) foldWeights.push(p.weight);
    }
  }

  const ceilNum = (num) => Math.ceil(num);

  const slabEl = document.getElementById('maxValueSlab');
  const foldEl = document.getElementById('maxValueFoldable');

  if (slabEl && slabWidths.length > 0 && slabWeights.length > 0) {
    const maxW = Math.max(...slabWidths);
    const maxG = Math.max(...slabWeights);
    slabEl.innerHTML = '<br>直板 ≤' + ceilNum(maxW) + 'mm, ' + ceilNum(maxG) + 'g';
  }

  if (foldEl && foldWidths.length > 0 && foldWeights.length > 0) {
    const maxW = Math.max(...foldWidths);
    const maxG = Math.max(...foldWeights);
    foldEl.innerHTML = '<br>折叠 ≤' + ceilNum(maxW) + 'mm, ' + ceilNum(maxG) + 'g';
  }
}

// 数据筛选
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
    case 'remark': return item.remark;
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

// 辅助：生成带链接的机型 HTML
function formatModelLink(model, url) {
  const escapedModel = escapeHtml(model);
  if (url && url.trim() !== '') {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapedModel}</a>`;
  }
  return escapedModel;
}

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
        <td>${formatModelLink(p.model, p.url)}</td>
        <td>${escapeHtml(p.brand || '')}</td>
        <td>${escapeHtml(p.screenRatio || '')}</td>
        <td>${p.screenSize !== null ? p.screenSize + '"' : ''}</td>
        <td>${p.width !== null ? p.width + 'mm' : ''}</td>
        <td>${p.thickness !== null ? p.thickness + 'mm' : ''}</td>
        <td>${p.weight !== null ? p.weight + 'g' : ''}</td>
        <td>${p.battery !== null ? p.battery + 'mAh' : ''}</td>
        <td>${escapeHtml(p.soc || '')}</td>
        <td>${p.year ?? ''}</td>
        <td>${escapeHtml(p.remark || '')}</td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
  document.getElementById('statsInfo').innerHTML = `${data.length} / ${phonesData.length}`;
}

function renderCards(data) {
  const container = document.getElementById('cardsContainer');
  if (data.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem;">没有符合条件的手机</div>';
    return;
  }
  let html = '';
  for (const p of data) {
    const formatValue = (val, unit) => (val !== null && val !== undefined && val !== '') ? val + unit : '';

    html += `
      <div class="phone-card">
        <div class="card-header">
          <span class="model-name">${formatModelLink(p.model, p.url)}</span>
          <span class="brand-name">${escapeHtml(p.brand)}</span>
        </div>
        <div class="card-detail">
          <div class="detail-item"><span class="detail-label">主屏比例</span><span>${escapeHtml(p.screenRatio || '')}</span></div>
          <div class="detail-item"><span class="detail-label">主屏尺寸</span><span>${formatValue(p.screenSize, '"')}</span></div>
          <div class="detail-item"><span class="detail-label">宽度</span><span>${formatValue(p.width, 'mm')}</span></div>
          <div class="detail-item"><span class="detail-label">厚度</span><span>${formatValue(p.thickness, 'mm')}</span></div>
          <div class="detail-item"><span class="detail-label">重量</span><span>${formatValue(p.weight, 'g')}</span></div>
          <div class="detail-item"><span class="detail-label">电池</span><span>${formatValue(p.battery, 'mAh')}</span></div>
          <div class="detail-item"><span class="detail-label">SoC</span><span>${escapeHtml(p.soc || '')}</span></div>
          <div class="detail-item"><span class="detail-label">发布年份</span><span>${p.year ?? ''}</span></div>
        </div>
        ${p.remark ? `<div class="card-remark"><span class="detail-label">备注</span><span>${escapeHtml(p.remark)}</span></div>` : ''}
      </div>
    `;
  }
  container.innerHTML = html;
}

function updateSortButtonText() {
  const btn = document.getElementById('sortOrderBtn');
  btn.innerText = currentSortOrder === 'asc' ? '⬆️' : '⬇️';
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
  const defaultBtn = [...btns].find(b => b.getAttribute('data-type') === 'all');
  if (defaultBtn) defaultBtn.classList.add('active');
}

// 启动
initTypeSwitch();
bindEvents();
loadCSVData();