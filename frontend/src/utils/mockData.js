const DEFAULT_LINES = [
  {
    id: 1,
    name: 'line_1',
    display_name: 'Klondike 1',
    freezer_count: 4,
    asset_id: 'PLT1352-L1',
    active: true,
    freezers: [
      { freezer_number: 1, pump_count: 1, asset_id: 'PLT1352-L1-FRZ01' },
      { freezer_number: 2, pump_count: 1, asset_id: 'PLT1352-L1-FRZ02' },
      { freezer_number: 3, pump_count: 1, asset_id: 'PLT1352-L1-FRZ03' },
      { freezer_number: 4, pump_count: 1, asset_id: 'PLT1352-L1-FRZ04' },
    ],
  },
  {
    id: 2,
    name: 'line_2',
    display_name: 'Klondike 2',
    freezer_count: 2,
    asset_id: 'PLT1352-L2',
    active: true,
    freezers: [
      { freezer_number: 1, pump_count: 2, asset_id: 'PLT1352-L2-FRZ01' },
      { freezer_number: 2, pump_count: 2, asset_id: 'PLT1352-L2-FRZ02' },
    ],
  },
  {
    id: 3,
    name: 'line_3',
    display_name: 'Klondike 3',
    freezer_count: 2,
    asset_id: 'PLT1352-L3',
    active: true,
    freezers: [
      { freezer_number: 1, pump_count: 2, asset_id: 'PLT1352-L3-FRZ01' },
      { freezer_number: 2, pump_count: 2, asset_id: 'PLT1352-L3-FRZ02' },
    ],
  },
];

const DEFAULT_SKUS = [
  {
    id: 1, product_name: 'Klondike Original Bars', product_code: '69548143', cr_code: 'CR-2152_2',
    startup_cup_weight_target: 114.0, sort_order: 1, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 20.1, thickness_lcl: 19.9, thickness_lwl: 20.03, thickness_uwl: 20.17, thickness_ucl: 20.24, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.3, weight_lcl: 58.3, weight_lwl: 60.3, weight_uwl: 64.3, weight_ucl: 66.3, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 2, product_name: 'Klondike Heath Bars', product_code: '68852591', cr_code: 'CR-2148_3',
    startup_cup_weight_target: 108.6, sort_order: 2, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 17.2, thickness_lcl: 16.8, thickness_lwl: 17.0, thickness_uwl: 17.4, thickness_ucl: 17.6, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 52.1, weight_lcl: 48.1, weight_lwl: 50.1, weight_uwl: 54.1, weight_ucl: 56.1, weight_unit: 'g',
    coating_label: 'Coating Weight w/Inclusion', coating_target: 20.4, coating_lcl: 17.8, coating_lwl: 19.1, coating_uwl: 21.7, coating_ucl: 23.0, coating_unit: 'g',
  },
  {
    id: 3, product_name: 'Klondike Krunch Bars', product_code: '68710285', cr_code: 'CR-2144_4',
    startup_cup_weight_target: 113.7, sort_order: 3, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 18.1, thickness_lcl: 17.7, thickness_lwl: 17.9, thickness_uwl: 18.3, thickness_ucl: 18.5, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 57.4, weight_lcl: 53.4, weight_lwl: 55.4, weight_uwl: 59.4, weight_ucl: 61.4, weight_unit: 'g',
    coating_label: 'Coating Weight w/Crisp Rice', coating_target: 24.6, coating_lcl: 22.2, coating_lwl: 23.4, coating_uwl: 25.8, coating_ucl: 27.0, coating_unit: 'g',
  },
  {
    id: 4, product_name: "Klondike Reese's Bars", product_code: '69779478', cr_code: 'CR-2156_2',
    startup_cup_weight_target: 110.3, sort_order: 4, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 17.0, thickness_lcl: 16.6, thickness_lwl: 16.8, thickness_uwl: 17.2, thickness_ucl: 17.4, thickness_unit: 'mm',
    weight_label: 'Slice Weight w/ Variegate', weight_target: 50.4, weight_lcl: 47.4, weight_lwl: 48.9, weight_uwl: 51.9, weight_ucl: 53.4, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 17.0, coating_lcl: 15.8, coating_lwl: 16.4, coating_uwl: 17.6, coating_ucl: 18.2, coating_unit: 'g',
  },
  {
    id: 5, product_name: 'Klondike Dark Chocolate Bars', product_code: '68921994', cr_code: 'CR-2155_3',
    startup_cup_weight_target: 113.5, sort_order: 5, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.1, weight_lcl: 58.4, weight_lwl: 60.4, weight_uwl: 64.4, weight_ucl: 66.4, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 6, product_name: 'Klondike Chocolate/Chocolate Bars', product_code: '68709237', cr_code: 'CR-2147_4',
    startup_cup_weight_target: 113.7, sort_order: 6, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.1, weight_lcl: 58.1, weight_lwl: 60.1, weight_uwl: 64.1, weight_ucl: 66.1, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 7, product_name: 'Klondike SAB NSA Krunch Bars', product_code: '68710277', cr_code: 'CR-2150_4',
    startup_cup_weight_target: 113.7, sort_order: 7, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 17.9, thickness_lcl: 17.5, thickness_lwl: 17.7, thickness_uwl: 18.1, thickness_ucl: 18.3, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 57.1, weight_lcl: 53.1, weight_lwl: 55.1, weight_uwl: 59.1, weight_ucl: 61.1, weight_unit: 'g',
    coating_label: 'Coating Weight w/Crisp Rice', coating_target: 15.4, coating_lcl: 13.0, coating_lwl: 14.2, coating_uwl: 16.6, coating_ucl: 17.8, coating_unit: 'g',
  },
  {
    id: 8, product_name: 'Klondike SAB RF NSA Vanilla Bars', product_code: '68709233', cr_code: 'CR-2151_5',
    startup_cup_weight_target: 113.7, sort_order: 8, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 17.8, thickness_lcl: 17.4, thickness_lwl: 17.6, thickness_uwl: 18.0, thickness_ucl: 18.2, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 56.5, weight_lcl: 52.5, weight_lwl: 54.5, weight_uwl: 58.5, weight_ucl: 60.5, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 18.0, coating_lcl: 15.6, coating_lwl: 16.8, coating_uwl: 19.2, coating_ucl: 20.4, coating_unit: 'g',
  },
  {
    id: 9, product_name: "Klondike Reese's Peanut Butter Cup Bars", product_code: '68300738', cr_code: 'CR-2146_5',
    startup_cup_weight_target: 110.8, sort_order: 9, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 17.8, thickness_lcl: 17.43, thickness_lwl: 17.6, thickness_uwl: 18.0, thickness_ucl: 18.2, thickness_unit: 'mm',
    weight_label: 'Slice Weight w/ Variegate', weight_target: 59.5, weight_lcl: 55.5, weight_lwl: 57.5, weight_uwl: 61.5, weight_ucl: 63.5, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 18.0, coating_lcl: 15.6, coating_lwl: 16.8, coating_uwl: 19.2, coating_ucl: 20.4, coating_unit: 'g',
  },
  {
    id: 10, product_name: 'Klondike Original MTB Bars', product_code: '68689251', cr_code: 'CR-2154_4',
    startup_cup_weight_target: 114.0, sort_order: 10, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.3, weight_lcl: 58.3, weight_lwl: 60.3, weight_uwl: 64.3, weight_ucl: 66.3, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 11, product_name: 'Klondike Mint Choc. Chip Bars 12-6PK', product_code: '68746232', cr_code: 'CR-2497_1',
    startup_cup_weight_target: 113.4, sort_order: 11, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 17.7, thickness_lcl: 17.4, thickness_lwl: 17.5, thickness_uwl: 17.9, thickness_ucl: 18.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 55.7, weight_lcl: 52.9, weight_lwl: 54.3, weight_uwl: 57.1, weight_ucl: 58.5, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 21.3, coating_lcl: 18.9, coating_lwl: 20.1, coating_uwl: 22.5, coating_ucl: 23.7, coating_unit: 'g',
  },
  {
    id: 12, product_name: 'Klondike Cookies and Creme Bars 12-6PK', product_code: '68852583', cr_code: 'CR-2495_2',
    startup_cup_weight_target: 113.4, sort_order: 12, active: true, pack_size: '6pk',
    thickness_label: 'Slice Thickness', thickness_target: 16.8, thickness_lcl: 16.77, thickness_lwl: 16.78, thickness_uwl: 16.82, thickness_ucl: 16.83, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 52.9, weight_lcl: 50.1, weight_lwl: 51.5, weight_uwl: 54.3, weight_ucl: 55.7, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 22.1, coating_lcl: 19.7, coating_lwl: 20.9, coating_uwl: 23.3, coating_ucl: 24.5, coating_unit: 'g',
  },
];

const STORAGE_KEY = 'spc_demo_state_v4';

export const MOCK_LINES = DEFAULT_LINES;
export const MOCK_SKUS = DEFAULT_SKUS;

function makeError(message, status, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getNowIso() {
  return new Date().toISOString();
}

function getShiftDateForNow() {
  const now = new Date();
  if (now.getHours() < 6) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
}

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function buildDefaultState() {
  return {
    lines: clone(DEFAULT_LINES),
    skus: clone(DEFAULT_SKUS),
    productionOrders: [],
    measurements: [],
    reports: [],
    auditLog: [],
    masterAccounts: [
      {
        id: 1,
        username: 'demo-master',
        password: 'demo-master',
        created_at: getNowIso(),
      },
    ],
    adminPassword: 'demo-admin',
    session: {
      authenticated: true,
      role: 'master',
      username: 'demo-master',
    },
    nextIds: {
      order: 1,
      measurement: 1,
      report: 1,
      audit: 1,
      line: DEFAULT_LINES.length + 1,
      sku: DEFAULT_SKUS.length + 1,
      masterAccount: 2,
    },
  };
}

function loadState() {
  const storage = getStorage();
  if (!storage) {
    return buildDefaultState();
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const nextState = buildDefaultState();
      storage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    }
    const parsed = JSON.parse(raw);
    const defaults = buildDefaultState();
    return {
      ...defaults,
      ...parsed,
      lines: parsed.lines || defaults.lines,
      skus: parsed.skus || defaults.skus,
      productionOrders: parsed.productionOrders || [],
      measurements: parsed.measurements || [],
      reports: parsed.reports || [],
      auditLog: parsed.auditLog || [],
      masterAccounts: parsed.masterAccounts || defaults.masterAccounts,
      nextIds: { ...defaults.nextIds, ...(parsed.nextIds || {}) },
      session: parsed.session || defaults.session,
    };
  } catch {
    const resetState = buildDefaultState();
    storage.setItem(STORAGE_KEY, JSON.stringify(resetState));
    return resetState;
  }
}

let demoState = loadState();

function persistState() {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(demoState));
}

function updateState(mutator) {
  const draft = clone(demoState);
  const result = mutator(draft) || draft;
  demoState = result;
  persistState();
  return clone(demoState);
}

function nextId(key, state = demoState) {
  const value = state.nextIds[key];
  state.nextIds[key] += 1;
  return value;
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function safeText(value) {
  return value === null || value === undefined ? '' : String(value);
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeCsv(value) {
  const stringValue = safeText(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function getLineById(lineId) {
  return demoState.lines.find((line) => String(line.id) === String(lineId)) || null;
}

function getSkuById(skuId) {
  return demoState.skus.find((sku) => String(sku.id) === String(skuId)) || null;
}

function computeStatus(measurement, sku) {
  const checks = [
    { value: measurement.thickness_value, lcl: sku.thickness_lcl, lwl: sku.thickness_lwl, uwl: sku.thickness_uwl, ucl: sku.thickness_ucl },
    { value: measurement.weight_value, lcl: sku.weight_lcl, lwl: sku.weight_lwl, uwl: sku.weight_uwl, ucl: sku.weight_ucl },
    { value: measurement.coating_value, lcl: sku.coating_lcl, lwl: sku.coating_lwl, uwl: sku.coating_uwl, ucl: sku.coating_ucl },
  ];

  let status = 'in_control';
  for (const check of checks) {
    if (check.value === null || check.value === undefined || check.value === '') continue;
    const number = Number(check.value);
    if (number < Number(check.lcl) || number > Number(check.ucl)) return 'ooc';
    if (number < Number(check.lwl) || number > Number(check.uwl)) status = 'warning';
  }
  return status;
}

function getJoinedOrder(order) {
  const line = getLineById(order.line_id);
  const sku = getSkuById(order.sku_id);
  return {
    ...order,
    line_name: line?.display_name || 'Unknown Line',
    product_name: sku?.product_name || 'Unknown SKU',
    product_code: sku?.product_code || '',
    cr_code: sku?.cr_code || '',
    startup_cup_weight_target: sku?.startup_cup_weight_target ?? null,
  };
}

function appendAudit(state, tableName, recordId, action, changedBy, reason = null, oldValues = null, newValues = null) {
  state.auditLog.unshift({
    id: nextId('audit', state),
    table_name: tableName,
    record_id: Number(recordId),
    action,
    changed_by: changedBy,
    reason,
    old_values: oldValues,
    new_values: newValues,
    created_at: getNowIso(),
  });
}

function filterMeasurements(params = {}) {
  return demoState.measurements.filter((measurement) => {
    if (params.sku_id && String(measurement.sku_id) !== String(params.sku_id)) return false;
    if (params.line_id && String(measurement.line_id) !== String(params.line_id)) return false;
    if (params.shift && measurement.shift !== params.shift) return false;
    if (params.shift_date && measurement.shift_date !== params.shift_date) return false;
    if (params.freezer_number && String(measurement.freezer_number) !== String(params.freezer_number)) return false;
    if (params.pump_number && String(measurement.pump_number) !== String(params.pump_number)) return false;
    if (params.production_order_id && String(measurement.production_order_id) !== String(params.production_order_id)) return false;
    return true;
  });
}

function getMeasurementStatusLabel(measurement) {
  if (measurement.status_overall === 'ooc') {
    return measurement.alert_acknowledged_at ? 'OOC ACK' : 'OOC';
  }
  if (measurement.status_overall === 'warning') {
    return measurement.alert_acknowledged_at ? 'WARN ACK' : 'WARNING';
  }
  return 'OK';
}

function buildBatchCsvFromMeasurements(order, measurements) {
  const headerLines = [
    `PO Number,${escapeCsv(order.po_number)}`,
    `Line,${escapeCsv(order.line_name)}`,
    `Product,${escapeCsv(`${order.product_name} (${order.product_code})`)}`,
    `Best Buy Code,${escapeCsv(order.best_buy_code)}`,
    `Shift,${escapeCsv(order.shift)}`,
    `Date,${escapeCsv(order.shift_date)}`,
    `Status,${escapeCsv(order.status)}`,
    '',
    'Time,Freezer,Pump,Operator,Lead,Thickness,Weight,Coating,Status,Adjustments',
  ];

  const rows = measurements
    .slice()
    .sort((left, right) => (
      Number(left.freezer_number) - Number(right.freezer_number)
      || Number(left.pump_number) - Number(right.pump_number)
      || new Date(left.recorded_at) - new Date(right.recorded_at)
    ))
    .map((measurement) => [
      escapeCsv(formatTime(measurement.recorded_at)),
      escapeCsv(measurement.freezer_number),
      escapeCsv(measurement.pump_number),
      escapeCsv(measurement.operator_initials),
      escapeCsv(measurement.lead_initials || ''),
      escapeCsv(measurement.thickness_value ?? ''),
      escapeCsv(measurement.weight_value ?? ''),
      escapeCsv(measurement.coating_value ?? ''),
      escapeCsv(getMeasurementStatusLabel(measurement)),
      escapeCsv(measurement.adjustments || ''),
    ].join(','));

  return headerLines.concat(rows).join('\n');
}

function buildReportCsv(report) {
  const measurements = filterMeasurements({ production_order_id: report.production_order_id });
  const order = getJoinedOrder(demoState.productionOrders.find((entry) => entry.id === report.production_order_id) || {
    id: report.production_order_id || report.id,
    line_id: report.line_id,
    sku_id: report.sku_id,
    po_number: report.po_number,
    best_buy_code: report.best_buy_code,
    shift: report.shift,
    shift_date: report.shift_date,
    status: 'completed',
  });
  return buildBatchCsvFromMeasurements(order, measurements);
}

function paginate(rows, page = 1, perPage = 50) {
  const currentPage = Number(page) || 1;
  const size = Number(perPage) || 50;
  const offset = (currentPage - 1) * size;
  return {
    data: rows.slice(offset, offset + size),
    pagination: {
      page: currentPage,
      per_page: size,
      total: rows.length,
      total_pages: Math.max(1, Math.ceil(rows.length / size)),
    },
  };
}

function getDashboardData(filters = {}) {
  const filteredMeasurements = filterMeasurements(filters);
  const recentReports = demoState.reports
    .slice()
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
    .slice(0, 50)
    .map((report) => {
      const line = getLineById(report.line_id);
      const sku = getSkuById(report.sku_id);
      return {
        ...report,
        line_name: line?.display_name || '',
        product_name: sku?.product_name || '',
      };
    });

  const lineStats = demoState.lines.map((line) => {
    const lineMeasurements = demoState.measurements.filter((measurement) => String(measurement.line_id) === String(line.id));
    return {
      line_id: line.id,
      display_name: line.display_name,
      total_measurements: lineMeasurements.length,
      last_measurement: lineMeasurements.length ? lineMeasurements[lineMeasurements.length - 1].recorded_at : null,
    };
  });

  const skuUsage = demoState.skus.map((sku) => ({
    product_name: sku.product_name,
    product_code: sku.product_code,
    usage_count: demoState.measurements.filter((measurement) => String(measurement.sku_id) === String(sku.id)).length,
  })).sort((left, right) => right.usage_count - left.usage_count);

  return {
    total_measurements: filteredMeasurements.length,
    line_stats: lineStats,
    recent_reports: recentReports,
    sku_usage: skuUsage,
    order_stats: {
      total: demoState.productionOrders.length,
      active: demoState.productionOrders.filter((order) => order.status === 'active').length,
      completed: demoState.productionOrders.filter((order) => order.status === 'completed').length,
      reviewed: demoState.productionOrders.filter((order) => order.status === 'reviewed').length,
    },
  };
}

export const demoApi = {
  async getLines() {
    return clone(demoState.lines.filter((line) => line.active !== false));
  },

  async getSkus() {
    return clone(demoState.skus.filter((sku) => sku.active !== false).sort((left, right) => left.sort_order - right.sort_order));
  },

  async createProductionOrder(data) {
    return clone(updateState((state) => {
      const line = state.lines.find((entry) => String(entry.id) === String(data.line_id) && entry.active !== false);
      const sku = state.skus.find((entry) => String(entry.id) === String(data.sku_id) && entry.active !== false);
      if (!line || !sku) {
        throw makeError('Invalid line or SKU', 400);
      }
      const now = getNowIso();
      const order = {
        id: state.nextIds.order,
        line_id: Number(data.line_id),
        sku_id: Number(data.sku_id),
        best_buy_code: data.best_buy_code,
        po_number: data.po_number,
        shift: data.shift,
        shift_date: data.shift_date || getShiftDateForNow(),
        status: 'active',
        created_at: now,
        started_at: now,
        completed_at: null,
        reviewed_at: null,
        reviewed_by: null,
      };
      state.nextIds.order += 1;
      state.productionOrders.unshift(order);
      state.session = {
        authenticated: true,
        role: 'master',
        username: state.session?.username || 'demo-master',
      };
      state.auditLog.unshift({
        id: state.nextIds.audit++,
        table_name: 'production_orders',
        record_id: order.id,
        action: 'INSERT',
        changed_by: 'demo-operator',
        reason: null,
        old_values: null,
        new_values: { po_number: order.po_number, status: order.status },
        created_at: now,
      });
      return state;
    }).productionOrders[0]);
  },

  async getActiveOrders() {
    return clone(
      demoState.productionOrders
        .filter((order) => order.status === 'active')
        .map(getJoinedOrder)
        .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
    );
  },

  async completeProductionOrder(id) {
    return clone(updateState((state) => {
      const order = state.productionOrders.find((entry) => String(entry.id) === String(id));
      if (!order) {
        throw makeError('Production order not found', 404);
      }
      if (order.status === 'reviewed') {
        throw makeError('Order is reviewed and locked.', 409);
      }
      if (order.status === 'active') {
        order.status = 'completed';
        order.completed_at = getNowIso();
        state.auditLog.unshift({
          id: state.nextIds.audit++,
          table_name: 'production_orders',
          record_id: order.id,
          action: 'UPDATE',
          changed_by: 'demo-operator',
          reason: null,
          old_values: { status: 'active' },
          new_values: { status: 'completed' },
          created_at: getNowIso(),
        });
      }
      return state;
    }).productionOrders.find((entry) => String(entry.id) === String(id)));
  },

  async getFreezerConfig(orderId) {
    const order = demoState.productionOrders.find((entry) => String(entry.id) === String(orderId));
    if (!order) {
      throw makeError('Production order not found', 404);
    }
    const line = getLineById(order.line_id);
    return clone((line?.freezers || []).map((freezer) => ({
      freezer_number: freezer.freezer_number,
      pump_count: freezer.pump_count,
      asset_id: freezer.asset_id || null,
    })));
  },

  async getChartData(params) {
    return clone(
      filterMeasurements(params)
        .slice()
        .sort((left, right) => new Date(left.recorded_at) - new Date(right.recorded_at))
    );
  },

  async getMeasurements(params) {
    const limit = params?.limit ? Number(params.limit) : 50;
    return clone(
      filterMeasurements(params)
        .slice()
        .sort((left, right) => new Date(right.recorded_at) - new Date(left.recorded_at))
        .slice(0, limit)
    );
  },

  async createMeasurement(data) {
    const existing = demoState.measurements.find((measurement) => measurement.client_id === data.client_id);
    if (existing) {
      return clone({
        ...existing,
        requires_ack: existing.status_overall === 'ooc' || existing.status_overall === 'warning',
      });
    }

    const nextState = updateState((state) => {
      const order = state.productionOrders.find((entry) => String(entry.id) === String(data.production_order_id));
      if (order?.status === 'reviewed') {
        throw makeError('Order is reviewed and locked. No new measurements allowed.', 409);
      }

      const sku = state.skus.find((entry) => String(entry.id) === String(data.sku_id));
      if (!sku) {
        throw makeError('Invalid sku_id', 400);
      }

      const now = getNowIso();
      const measurement = {
        id: state.nextIds.measurement++,
        sku_id: Number(data.sku_id),
        line_id: Number(data.line_id),
        freezer_number: Number(data.freezer_number),
        pump_number: Number(data.pump_number || 1),
        shift: data.shift,
        shift_date: data.shift_date || getShiftDateForNow(),
        operator_initials: safeText(data.operator_initials).trim(),
        lead_initials: data.lead_initials || null,
        thickness_value: toNumber(data.thickness_value),
        weight_value: toNumber(data.weight_value),
        coating_value: toNumber(data.coating_value),
        adjustments: data.adjustments || null,
        best_buy_code: data.best_buy_code || null,
        production_order_id: data.production_order_id ? Number(data.production_order_id) : null,
        client_id: data.client_id,
        version: 1,
        status_overall: computeStatus(data, sku),
        alert_acknowledged_at: null,
        alert_acknowledged_by: null,
        recorded_at: now,
        created_at: now,
      };
      state.measurements.push(measurement);
      state.auditLog.unshift({
        id: state.nextIds.audit++,
        table_name: 'measurements',
        record_id: measurement.id,
        action: 'INSERT',
        changed_by: measurement.operator_initials,
        reason: null,
        old_values: null,
        new_values: {
          production_order_id: measurement.production_order_id,
          freezer_number: measurement.freezer_number,
          pump_number: measurement.pump_number,
          status_overall: measurement.status_overall,
        },
        created_at: now,
      });
      return state;
    });

    const measurement = nextState.measurements.find((entry) => entry.client_id === data.client_id);
    return clone({
      ...measurement,
      requires_ack: measurement.status_overall === 'ooc' || measurement.status_overall === 'warning',
    });
  },

  async acknowledgeMeasurement(id, acknowledged_by) {
    return clone(updateState((state) => {
      const measurement = state.measurements.find((entry) => String(entry.id) === String(id));
      if (!measurement) {
        throw makeError('Measurement not found', 404);
      }
      if (!measurement.alert_acknowledged_at) {
        measurement.alert_acknowledged_at = getNowIso();
        measurement.alert_acknowledged_by = acknowledged_by;
        state.auditLog.unshift({
          id: state.nextIds.audit++,
          table_name: 'measurements',
          record_id: measurement.id,
          action: 'UPDATE',
          changed_by: acknowledged_by,
          reason: 'acknowledge alert',
          old_values: null,
          new_values: { alert_acknowledged_at: measurement.alert_acknowledged_at },
          created_at: measurement.alert_acknowledged_at,
        });
      }
      return state;
    }).measurements.find((entry) => String(entry.id) === String(id)));
  },

  async createReport(data) {
    return clone(updateState((state) => {
      const measurements = state.measurements
        .filter((measurement) => (
          data.production_order_id
            ? String(measurement.production_order_id) === String(data.production_order_id)
            : String(measurement.line_id) === String(data.line_id)
              && String(measurement.sku_id) === String(data.sku_id)
              && measurement.shift === data.shift
              && measurement.shift_date === data.shift_date
        ));

      const numericStats = (key) => {
        const values = measurements
          .map((measurement) => measurement[key])
          .filter((value) => value !== null && value !== undefined);
        if (!values.length) {
          return { avg: 0, min: 0, max: 0 };
        }
        const numbers = values.map(Number);
        return {
          avg: Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(3)),
          min: Math.min(...numbers),
          max: Math.max(...numbers),
        };
      };

      const countAlerts = (key, sku) => {
        let outOfControl = 0;
        let warnings = 0;
        for (const measurement of measurements) {
          const value = measurement[key];
          if (value === null || value === undefined) continue;
          const number = Number(value);
          const limits = key === 'thickness_value'
            ? { lcl: sku.thickness_lcl, lwl: sku.thickness_lwl, uwl: sku.thickness_uwl, ucl: sku.thickness_ucl }
            : key === 'weight_value'
              ? { lcl: sku.weight_lcl, lwl: sku.weight_lwl, uwl: sku.weight_uwl, ucl: sku.weight_ucl }
              : { lcl: sku.coating_lcl, lwl: sku.coating_lwl, uwl: sku.coating_uwl, ucl: sku.coating_ucl };
          if (number < Number(limits.lcl) || number > Number(limits.ucl)) {
            outOfControl += 1;
          } else if (number < Number(limits.lwl) || number > Number(limits.uwl)) {
            warnings += 1;
          }
        }
        return { outOfControl, warnings };
      };

      const sku = state.skus.find((entry) => String(entry.id) === String(data.sku_id));
      const thickness = numericStats('thickness_value');
      const weight = numericStats('weight_value');
      const coating = numericStats('coating_value');
      const thicknessAlerts = countAlerts('thickness_value', sku);
      const weightAlerts = countAlerts('weight_value', sku);
      const coatingAlerts = countAlerts('coating_value', sku);
      const report = {
        id: state.nextIds.report++,
        line_id: Number(data.line_id),
        sku_id: Number(data.sku_id),
        shift: data.shift,
        shift_date: data.shift_date,
        operator_name: data.operator_name,
        supervisor_name: data.supervisor_name || null,
        notes: data.notes || null,
        best_buy_code: data.best_buy_code || null,
        po_number: data.po_number || null,
        production_order_id: data.production_order_id ? Number(data.production_order_id) : null,
        total_measurements: measurements.length,
        thickness_avg: thickness.avg,
        thickness_min: thickness.min,
        thickness_max: thickness.max,
        thickness_out_of_control: thicknessAlerts.outOfControl,
        thickness_warnings: thicknessAlerts.warnings,
        weight_avg: weight.avg,
        weight_min: weight.min,
        weight_max: weight.max,
        weight_out_of_control: weightAlerts.outOfControl,
        weight_warnings: weightAlerts.warnings,
        coating_avg: coating.avg,
        coating_min: coating.min,
        coating_max: coating.max,
        coating_out_of_control: coatingAlerts.outOfControl,
        coating_warnings: coatingAlerts.warnings,
        report_data: {
          groups: (function groupByFreezerPump() {
            const map = new Map();
            for (const measurement of measurements) {
              const key = `${measurement.freezer_number}:${measurement.pump_number}`;
              if (!map.has(key)) {
                map.set(key, {
                  freezer: measurement.freezer_number,
                  pump: measurement.pump_number,
                  measurements: [],
                });
              }
              map.get(key).measurements.push(measurement);
            }
            return Array.from(map.values()).sort((left, right) => left.freezer - right.freezer || left.pump - right.pump);
          }()),
        },
        created_at: getNowIso(),
        signed_at: data.supervisor_name ? getNowIso() : null,
      };

      state.reports.unshift(report);
      appendAudit(state, 'shift_reports', report.id, 'INSERT', data.operator_name, null, null, {
        production_order_id: report.production_order_id,
        po_number: report.po_number,
      });
      return state;
    }).reports[0]);
  },

  async getReports(params = {}) {
    return clone(
      demoState.reports
        .filter((report) => (!params.line_id || String(report.line_id) === String(params.line_id))
          && (!params.sku_id || String(report.sku_id) === String(params.sku_id))
          && (!params.shift_date || report.shift_date === params.shift_date))
        .map((report) => ({
          ...report,
          ...getJoinedOrder({
            line_id: report.line_id,
            sku_id: report.sku_id,
            po_number: report.po_number,
            best_buy_code: report.best_buy_code,
            shift: report.shift,
            shift_date: report.shift_date,
            status: 'completed',
          }),
        }))
    );
  },

  async getReportPdf(id) {
    const report = demoState.reports.find((entry) => String(entry.id) === String(id));
    if (!report) {
      throw makeError('Report not found', 404);
    }
    return new Blob(
      [
        `SPC Demo PDF\nPO: ${report.po_number || '-'}\nShift: ${report.shift}\nDate: ${report.shift_date}\nMeasurements: ${report.total_measurements}`,
      ],
      { type: 'application/pdf' }
    );
  },

  async getReportCsv(id) {
    const report = demoState.reports.find((entry) => String(entry.id) === String(id));
    if (!report) {
      throw makeError('Report not found', 404);
    }
    return buildReportCsv(report);
  },

  async adminLogin(password) {
    if (!password) {
      throw makeError('Password is required', 400);
    }
    updateState((state) => {
      state.session = { authenticated: true, role: 'admin', username: 'demo-admin' };
      return state;
    });
    return { success: true, role: 'admin' };
  },

  async masterLogin(username) {
    if (!username) {
      throw makeError('Username is required', 400);
    }
    const account = demoState.masterAccounts.find((entry) => entry.username === username.toLowerCase()) || demoState.masterAccounts[0];
    updateState((state) => {
      state.session = { authenticated: true, role: 'master', username: account.username };
      return state;
    });
    return { success: true, role: 'master', username: account.username };
  },

  async adminLogout() {
    updateState((state) => {
      state.session = { authenticated: false };
      return state;
    });
    return { success: true };
  },

  async getAdminSession() {
    if (demoState.session?.authenticated === false) {
      return { authenticated: false };
    }
    return clone(demoState.session || { authenticated: true, role: 'master', username: 'demo-master' });
  },

  async getDashboard(params) {
    return clone(getDashboardData(params));
  },

  async getHistory(params = {}) {
    const rows = filterMeasurements(params)
      .slice()
      .sort((left, right) => new Date(right.recorded_at) - new Date(left.recorded_at))
      .map((measurement) => {
        const order = measurement.production_order_id
          ? demoState.productionOrders.find((entry) => entry.id === measurement.production_order_id)
          : null;
        const line = getLineById(measurement.line_id);
        const sku = getSkuById(measurement.sku_id);
        return {
          ...measurement,
          line_name: line?.display_name || '',
          product_name: sku?.product_name || '',
          product_code: sku?.product_code || '',
          po_number: order?.po_number || '',
        };
      });
    return clone(paginate(rows, params.page, params.per_page));
  },

  async exportCsv(params = {}) {
    const rows = filterMeasurements(params)
      .slice()
      .sort((left, right) => new Date(right.recorded_at) - new Date(left.recorded_at));
    const lines = [
      'Date,Shift,Time,Line,Freezer,Pump,PO Number,Product,Product Code,Best Buy Code,Operator,Lead,Slice Thickness,Slice Weight,Coating Weight,Status,Adjustments',
    ];
    for (const row of rows) {
      const line = getLineById(row.line_id);
      const sku = getSkuById(row.sku_id);
      const order = row.production_order_id
        ? demoState.productionOrders.find((entry) => entry.id === row.production_order_id)
        : null;
      lines.push([
        escapeCsv(row.shift_date),
        escapeCsv(row.shift),
        escapeCsv(formatTime(row.recorded_at)),
        escapeCsv(line?.display_name || ''),
        escapeCsv(row.freezer_number),
        escapeCsv(row.pump_number),
        escapeCsv(order?.po_number || ''),
        escapeCsv(sku?.product_name || ''),
        escapeCsv(sku?.product_code || ''),
        escapeCsv(row.best_buy_code || ''),
        escapeCsv(row.operator_initials),
        escapeCsv(row.lead_initials || ''),
        escapeCsv(row.thickness_value ?? ''),
        escapeCsv(row.weight_value ?? ''),
        escapeCsv(row.coating_value ?? ''),
        escapeCsv(row.status_overall || ''),
        escapeCsv(row.adjustments || ''),
      ].join(','));
    }
    return lines.join('\n');
  },

  async exportExcel(params = {}) {
    const csv = await this.exportCsv(params);
    return new Blob([csv], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  },

  async getAdminReports(params = {}) {
    const rows = demoState.reports
      .filter((report) => (!params.line_id || String(report.line_id) === String(params.line_id))
        && (!params.sku_id || String(report.sku_id) === String(params.sku_id))
        && (!params.shift || report.shift === params.shift)
        && (!params.date_from || report.shift_date >= params.date_from)
        && (!params.date_to || report.shift_date <= params.date_to))
      .map((report) => ({
        ...report,
        line_name: getLineById(report.line_id)?.display_name || '',
        product_name: getSkuById(report.sku_id)?.product_name || '',
        product_code: getSkuById(report.sku_id)?.product_code || '',
      }))
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    return clone(paginate(rows, params.page, params.per_page));
  },

  async getProductionOrdersAdmin(params = {}) {
    const rows = demoState.productionOrders
      .filter((order) => (!params.line_id || String(order.line_id) === String(params.line_id))
        && (!params.sku_id || String(order.sku_id) === String(params.sku_id))
        && (!params.status || order.status === params.status)
        && (!params.date_from || order.shift_date >= params.date_from)
        && (!params.date_to || order.shift_date <= params.date_to))
      .map((order) => ({
        ...getJoinedOrder(order),
        measurement_count: demoState.measurements.filter((measurement) => String(measurement.production_order_id) === String(order.id)).length,
      }))
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    return clone(paginate(rows, params.page, params.per_page));
  },

  async getProductionOrderDetail(id) {
    const order = demoState.productionOrders.find((entry) => String(entry.id) === String(id));
    if (!order) {
      throw makeError('Production order not found', 404);
    }
    const report = demoState.reports
      .filter((entry) => String(entry.production_order_id) === String(id))
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0] || null;
    const measurements = demoState.measurements
      .filter((measurement) => String(measurement.production_order_id) === String(id))
      .slice()
      .sort((left, right) => (
        Number(left.freezer_number) - Number(right.freezer_number)
        || Number(left.pump_number) - Number(right.pump_number)
        || new Date(left.recorded_at) - new Date(right.recorded_at)
      ))
      .map((measurement) => ({
        ...measurement,
        line_name: getLineById(measurement.line_id)?.display_name || '',
        product_name: getSkuById(measurement.sku_id)?.product_name || '',
        product_code: getSkuById(measurement.sku_id)?.product_code || '',
      }));
    const measurementIds = new Set(measurements.map((measurement) => measurement.id));
    const audit = demoState.auditLog.filter((entry) => (
      (entry.table_name === 'production_orders' && String(entry.record_id) === String(id))
      || (report && entry.table_name === 'shift_reports' && String(entry.record_id) === String(report.id))
      || (entry.table_name === 'measurements' && measurementIds.has(entry.record_id))
    ));

    return clone({
      order: getJoinedOrder(order),
      report,
      measurements,
      audit,
    });
  },

  async reviewProductionOrder(id, reviewed_by) {
    if (!reviewed_by) {
      throw makeError('Reviewer name is required', 400);
    }
    return clone(updateState((state) => {
      const order = state.productionOrders.find((entry) => String(entry.id) === String(id));
      if (!order) {
        throw makeError('Production order not found', 404);
      }
      if (order.status !== 'completed') {
        throw makeError('Order must be in completed status to review', 400);
      }
      order.status = 'reviewed';
      order.reviewed_at = getNowIso();
      order.reviewed_by = reviewed_by;
      state.auditLog.unshift({
        id: state.nextIds.audit++,
        table_name: 'production_orders',
        record_id: order.id,
        action: 'UPDATE',
        changed_by: state.session?.username || 'demo-admin',
        reason: null,
        old_values: { status: 'completed' },
        new_values: { status: 'reviewed', reviewed_by },
        created_at: order.reviewed_at,
      });
      return state;
    }).productionOrders.find((entry) => String(entry.id) === String(id)));
  },

  async correctMeasurement(id, data) {
    return clone(updateState((state) => {
      const measurement = state.measurements.find((entry) => String(entry.id) === String(id));
      if (!measurement) {
        throw makeError('Measurement not found', 404);
      }
      if (!data.reason_code || !data.reason_comment) {
        throw makeError('reason_code and reason_comment are required for corrections', 400);
      }
      if (Number(data.version) !== Number(measurement.version)) {
        throw makeError('Version conflict — measurement was modified by another user', 409);
      }

      const oldValues = {
        thickness_value: measurement.thickness_value,
        weight_value: measurement.weight_value,
        coating_value: measurement.coating_value,
      };

      if (data.thickness_value !== undefined) measurement.thickness_value = toNumber(data.thickness_value);
      if (data.weight_value !== undefined) measurement.weight_value = toNumber(data.weight_value);
      if (data.coating_value !== undefined) measurement.coating_value = toNumber(data.coating_value);
      measurement.version += 1;

      const sku = state.skus.find((entry) => String(entry.id) === String(measurement.sku_id));
      measurement.status_overall = computeStatus(measurement, sku);

      state.auditLog.unshift({
        id: state.nextIds.audit++,
        table_name: 'measurements',
        record_id: measurement.id,
        action: 'CORRECTION',
        changed_by: state.session?.username || 'demo-admin',
        reason: `${data.reason_code}: ${data.reason_comment}`,
        old_values: oldValues,
        new_values: {
          thickness_value: measurement.thickness_value,
          weight_value: measurement.weight_value,
          coating_value: measurement.coating_value,
          reason_code: data.reason_code,
          reason_comment: data.reason_comment,
        },
        created_at: getNowIso(),
      });
      return state;
    }).measurements.find((entry) => String(entry.id) === String(id)));
  },

  async getBatchCsv(id) {
    const order = demoState.productionOrders.find((entry) => String(entry.id) === String(id));
    if (!order) {
      throw makeError('Production order not found', 404);
    }
    const joinedOrder = getJoinedOrder(order);
    const measurements = demoState.measurements.filter((measurement) => String(measurement.production_order_id) === String(id));
    return buildBatchCsvFromMeasurements(joinedOrder, measurements);
  },

  async getAuditLog(params = {}) {
    const rows = demoState.auditLog.filter((entry) => (
      (!params.table_name || entry.table_name === params.table_name)
      && (!params.record_id || String(entry.record_id) === String(params.record_id))
    ));
    return clone(paginate(rows, params.page, params.per_page));
  },

  async getMasterSkus() {
    return clone(demoState.skus.slice().sort((left, right) => left.sort_order - right.sort_order));
  },

  async createMasterSku(data) {
    return clone(updateState((state) => {
      const sku = { ...data, id: state.nextIds.sku++, active: data.active !== false };
      state.skus.push(sku);
      appendAudit(state, 'skus', sku.id, 'INSERT', state.session?.username || 'demo-master', null, null, sku);
      return state;
    }).skus.slice(-1)[0]);
  },

  async updateMasterSku(id, data) {
    return clone(updateState((state) => {
      const sku = state.skus.find((entry) => String(entry.id) === String(id));
      if (!sku) {
        throw makeError('SKU not found', 404);
      }
      const oldValues = clone(sku);
      Object.assign(sku, data);
      appendAudit(state, 'skus', sku.id, 'UPDATE', state.session?.username || 'demo-master', null, oldValues, sku);
      return state;
    }).skus.find((entry) => String(entry.id) === String(id)));
  },

  async deactivateMasterSku(id, confirm_active_orders = false) {
    return clone(updateState((state) => {
      const sku = state.skus.find((entry) => String(entry.id) === String(id));
      if (!sku) {
        throw makeError('SKU not found', 404);
      }
      const activeOrderCount = state.productionOrders.filter((order) => String(order.sku_id) === String(id) && order.status === 'active').length;
      if (activeOrderCount > 0 && !confirm_active_orders) {
        throw makeError('Active production orders exist for this SKU', 409, { active_order_count: activeOrderCount });
      }
      const oldValues = clone(sku);
      sku.active = false;
      appendAudit(state, 'skus', sku.id, 'UPDATE', state.session?.username || 'demo-master', 'deactivate', oldValues, sku);
      return state;
    }).skus.find((entry) => String(entry.id) === String(id)));
  },

  async reactivateMasterSku(id) {
    return clone(updateState((state) => {
      const sku = state.skus.find((entry) => String(entry.id) === String(id));
      if (!sku) {
        throw makeError('SKU not found', 404);
      }
      const oldValues = clone(sku);
      sku.active = true;
      appendAudit(state, 'skus', sku.id, 'UPDATE', state.session?.username || 'demo-master', 'reactivate', oldValues, sku);
      return state;
    }).skus.find((entry) => String(entry.id) === String(id)));
  },

  async getMasterLines() {
    return clone(demoState.lines);
  },

  async createMasterLine(data) {
    return clone(updateState((state) => {
      const line = {
        id: state.nextIds.line++,
        name: `line_${state.nextIds.line}`,
        display_name: data.display_name,
        freezer_count: data.freezers.length,
        asset_id: data.asset_id || null,
        active: data.active !== false,
        freezers: data.freezers.map((freezer, index) => ({
          freezer_number: Number(freezer.freezer_number || index + 1),
          pump_count: Number(freezer.pump_count || 1),
          asset_id: freezer.asset_id || null,
        })),
      };
      state.lines.push(line);
      appendAudit(state, 'lines', line.id, 'INSERT', state.session?.username || 'demo-master', null, null, line);
      return state;
    }).lines.slice(-1)[0]);
  },

  async updateMasterLine(id, data) {
    return clone(updateState((state) => {
      const line = state.lines.find((entry) => String(entry.id) === String(id));
      if (!line) {
        throw makeError('Line not found', 404);
      }
      const oldValues = clone(line);
      line.display_name = data.display_name;
      line.asset_id = data.asset_id || null;
      line.active = data.active !== false;
      appendAudit(state, 'lines', line.id, 'UPDATE', state.session?.username || 'demo-master', null, oldValues, line);
      return state;
    }).lines.find((entry) => String(entry.id) === String(id)));
  },

  async updateMasterLineFreezers(id, freezers) {
    return clone(updateState((state) => {
      const line = state.lines.find((entry) => String(entry.id) === String(id));
      if (!line) {
        throw makeError('Line not found', 404);
      }
      const oldValues = clone(line.freezers);
      const incomingNumbers = new Set(freezers.map((freezer) => Number(freezer.freezer_number)));
      for (const freezer of line.freezers) {
        if (!incomingNumbers.has(Number(freezer.freezer_number))) {
          const hasMeasurements = state.measurements.some((measurement) => (
            String(measurement.line_id) === String(id)
            && Number(measurement.freezer_number) === Number(freezer.freezer_number)
          ));
          if (hasMeasurements) {
            throw makeError(`Freezer ${freezer.freezer_number} has historical measurements and cannot be removed`, 409);
          }
        }
      }
      line.freezers = freezers.map((freezer, index) => ({
        freezer_number: Number(freezer.freezer_number || index + 1),
        pump_count: Number(freezer.pump_count || 1),
        asset_id: freezer.asset_id || null,
      })).sort((left, right) => left.freezer_number - right.freezer_number);
      line.freezer_count = line.freezers.length;
      appendAudit(state, 'line_freezers', line.id, 'UPDATE', state.session?.username || 'demo-master', null, oldValues, line.freezers);
      return state;
    }).lines.find((entry) => String(entry.id) === String(id)));
  },

  async updateAdminPassword(new_password) {
    if (!new_password) {
      throw makeError('new_password must be provided', 400);
    }
    updateState((state) => {
      state.adminPassword = new_password;
      appendAudit(state, 'master_config', 0, 'UPDATE', state.session?.username || 'demo-master', 'admin password changed', null, { key: 'admin_password_hash' });
      return state;
    });
    return { success: true };
  },

  async updateMyPassword(current_password, new_password) {
    if (!current_password || !new_password) {
      throw makeError('current_password and new_password are required', 400);
    }
    updateState((state) => {
      const account = state.masterAccounts.find((entry) => entry.username === state.session?.username) || state.masterAccounts[0];
      account.password = new_password;
      appendAudit(state, 'master_accounts', account.id, 'UPDATE', state.session?.username || 'demo-master', 'master password changed', null, { username: account.username });
      return state;
    });
    return { success: true };
  },

  async getMasterAccounts() {
    return clone(demoState.masterAccounts.map(({ password, ...account }) => account));
  },

  async createMasterAccount(username, password) {
    if (!username || !password) {
      throw makeError('username and password are required', 400);
    }
    const nextState = updateState((state) => {
      const account = {
        id: state.nextIds.masterAccount++,
        username: username.trim().toLowerCase(),
        password,
        created_at: getNowIso(),
      };
      state.masterAccounts.push(account);
      appendAudit(state, 'master_accounts', account.id, 'INSERT', state.session?.username || 'demo-master', null, null, { username: account.username });
      return state;
    });
    const account = nextState.masterAccounts[nextState.masterAccounts.length - 1];
    const { password: _password, ...accountWithoutPassword } = account;
    return clone(accountWithoutPassword);
  },

  async deleteMasterAccount(id) {
    updateState((state) => {
      if (state.masterAccounts.length <= 1) {
        throw makeError('Cannot delete the last remaining master account', 409);
      }
      const index = state.masterAccounts.findIndex((entry) => String(entry.id) === String(id));
      if (index === -1) {
        throw makeError('Master account not found', 404);
      }
      const [removed] = state.masterAccounts.splice(index, 1);
      appendAudit(state, 'master_accounts', removed.id, 'UPDATE', state.session?.username || 'demo-master', 'master account removed', { username: removed.username }, null);
      return state;
    });
    return { success: true };
  },

  async getMasterHealth() {
    const rowCounts = {
      measurements: demoState.measurements.length,
      shift_reports: demoState.reports.length,
      production_orders: demoState.productionOrders.length,
      audit_log: demoState.auditLog.length,
      measurement_images: 0,
      skus: demoState.skus.length,
      lines: demoState.lines.length,
      line_freezers: demoState.lines.reduce((sum, line) => sum + line.freezers.length, 0),
      master_accounts: demoState.masterAccounts.length,
      master_config: 1,
    };
    return {
      status: 'ok',
      timestamp: getNowIso(),
      db: { status: 'ok', latency_ms: 1 },
      disk: {
        data: { free_bytes: 'demo', total_bytes: 'demo' },
        backups: { free_bytes: 'demo', total_bytes: 'demo' },
      },
      counts: rowCounts,
      row_counts: rowCounts,
      last_backup: null,
      app_version: 'demo',
    };
  },
};

export function resetDemoState() {
  demoState = buildDefaultState();
  persistState();
}
