// Mock data for demo/prototype mode (no backend required)
// Mirrors the seed data from backend/src/seeds/seedData.js

export const MOCK_LINES = [
  { id: 1, name: 'line_1', display_name: 'Klondike 1', freezer_count: 4 },
  { id: 2, name: 'line_2', display_name: 'Klondike 2', freezer_count: 2 },
  { id: 3, name: 'line_3', display_name: 'Klondike 3', freezer_count: 2 },
];

export const MOCK_SKUS = [
  {
    id: 1, product_name: 'Klondike Original Bars', product_code: '69548143', cr_code: 'CR-2152_2',
    startup_cup_weight_target: 114.0, sort_order: 1, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 20.1, thickness_lcl: 19.9, thickness_lwl: 20.03, thickness_uwl: 20.17, thickness_ucl: 20.24, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.3, weight_lcl: 58.3, weight_lwl: 60.3, weight_uwl: 64.3, weight_ucl: 66.3, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 2, product_name: 'Klondike Heath Bars', product_code: '68852591', cr_code: 'CR-2148_3',
    startup_cup_weight_target: 108.6, sort_order: 2, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 17.2, thickness_lcl: 16.8, thickness_lwl: 17.0, thickness_uwl: 17.4, thickness_ucl: 17.6, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 52.1, weight_lcl: 48.1, weight_lwl: 50.1, weight_uwl: 54.1, weight_ucl: 56.1, weight_unit: 'g',
    coating_label: 'Coating Weight w/Inclusion', coating_target: 20.4, coating_lcl: 17.8, coating_lwl: 19.1, coating_uwl: 21.7, coating_ucl: 23.0, coating_unit: 'g',
  },
  {
    id: 3, product_name: 'Klondike Krunch Bars', product_code: '68710285', cr_code: 'CR-2144_4',
    startup_cup_weight_target: 113.7, sort_order: 3, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 18.1, thickness_lcl: 17.7, thickness_lwl: 17.9, thickness_uwl: 18.3, thickness_ucl: 18.5, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 57.4, weight_lcl: 53.4, weight_lwl: 55.4, weight_uwl: 59.4, weight_ucl: 61.4, weight_unit: 'g',
    coating_label: 'Coating Weight w/Crisp Rice', coating_target: 24.6, coating_lcl: 22.2, coating_lwl: 23.4, coating_uwl: 25.8, coating_ucl: 27.0, coating_unit: 'g',
  },
  {
    id: 4, product_name: "Klondike Reese's Bars", product_code: '69779478', cr_code: 'CR-2156_2',
    startup_cup_weight_target: 110.3, sort_order: 4, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 17.0, thickness_lcl: 16.6, thickness_lwl: 16.8, thickness_uwl: 17.2, thickness_ucl: 17.4, thickness_unit: 'mm',
    weight_label: 'Slice Weight w/ Variegate', weight_target: 50.4, weight_lcl: 47.4, weight_lwl: 48.9, weight_uwl: 51.9, weight_ucl: 53.4, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 17.0, coating_lcl: 15.8, coating_lwl: 16.4, coating_uwl: 17.6, coating_ucl: 18.2, coating_unit: 'g',
  },
  {
    id: 5, product_name: 'Klondike Dark Chocolate Bars', product_code: '68921994', cr_code: 'CR-2155_3',
    startup_cup_weight_target: 113.5, sort_order: 5, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.1, weight_lcl: 58.4, weight_lwl: 60.4, weight_uwl: 64.4, weight_ucl: 66.4, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 6, product_name: 'Klondike Chocolate/Chocolate Bars', product_code: '68709237', cr_code: 'CR-2147_4',
    startup_cup_weight_target: 113.7, sort_order: 6, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.1, weight_lcl: 58.1, weight_lwl: 60.1, weight_uwl: 64.1, weight_ucl: 66.1, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 7, product_name: 'Klondike SAB NSA Krunch Bars', product_code: '68710277', cr_code: 'CR-2150_4',
    startup_cup_weight_target: 113.7, sort_order: 7, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 17.9, thickness_lcl: 17.5, thickness_lwl: 17.7, thickness_uwl: 18.1, thickness_ucl: 18.3, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 57.1, weight_lcl: 53.1, weight_lwl: 55.1, weight_uwl: 59.1, weight_ucl: 61.1, weight_unit: 'g',
    coating_label: 'Coating Weight w/Crisp Rice', coating_target: 15.4, coating_lcl: 13.0, coating_lwl: 14.2, coating_uwl: 16.6, coating_ucl: 17.8, coating_unit: 'g',
  },
  {
    id: 8, product_name: 'Klondike SAB RF NSA Vanilla Bars', product_code: '68709233', cr_code: 'CR-2151_5',
    startup_cup_weight_target: 113.7, sort_order: 8, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 17.8, thickness_lcl: 17.4, thickness_lwl: 17.6, thickness_uwl: 18.0, thickness_ucl: 18.2, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 56.5, weight_lcl: 52.5, weight_lwl: 54.5, weight_uwl: 58.5, weight_ucl: 60.5, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 18.0, coating_lcl: 15.6, coating_lwl: 16.8, coating_uwl: 19.2, coating_ucl: 20.4, coating_unit: 'g',
  },
  {
    id: 9, product_name: "Klondike Reese's Peanut Butter Cup Bars", product_code: '68300738', cr_code: 'CR-2146_5',
    startup_cup_weight_target: 110.8, sort_order: 9, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 17.8, thickness_lcl: 17.43, thickness_lwl: 17.6, thickness_uwl: 18.0, thickness_ucl: 18.2, thickness_unit: 'mm',
    weight_label: 'Slice Weight w/ Variegate', weight_target: 59.5, weight_lcl: 55.5, weight_lwl: 57.5, weight_uwl: 61.5, weight_ucl: 63.5, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 18.0, coating_lcl: 15.6, coating_lwl: 16.8, coating_uwl: 19.2, coating_ucl: 20.4, coating_unit: 'g',
  },
  {
    id: 10, product_name: 'Klondike Original MTB Bars', product_code: '68689251', cr_code: 'CR-2154_4',
    startup_cup_weight_target: 114.0, sort_order: 10, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 62.3, weight_lcl: 58.3, weight_lwl: 60.3, weight_uwl: 64.3, weight_ucl: 66.3, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4, coating_unit: 'g',
  },
  {
    id: 11, product_name: 'Klondike Mint Choc. Chip Bars 12-6PK', product_code: '68746232', cr_code: 'CR-2497_1',
    startup_cup_weight_target: 113.4, sort_order: 11, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 17.7, thickness_lcl: 17.4, thickness_lwl: 17.5, thickness_uwl: 17.9, thickness_ucl: 18.0, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 55.7, weight_lcl: 52.9, weight_lwl: 54.3, weight_uwl: 57.1, weight_ucl: 58.5, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 21.3, coating_lcl: 18.9, coating_lwl: 20.1, coating_uwl: 22.5, coating_ucl: 23.7, coating_unit: 'g',
  },
  {
    id: 12, product_name: 'Klondike Cookies and Creme Bars 12-6PK', product_code: '68852583', cr_code: 'CR-2495_2',
    startup_cup_weight_target: 113.4, sort_order: 12, active: true,
    thickness_label: 'Slice Thickness', thickness_target: 16.8, thickness_lcl: 16.77, thickness_lwl: 16.78, thickness_uwl: 16.82, thickness_ucl: 16.83, thickness_unit: 'mm',
    weight_label: 'Slice Weight', weight_target: 52.9, weight_lcl: 50.1, weight_lwl: 51.5, weight_uwl: 54.3, weight_ucl: 55.7, weight_unit: 'g',
    coating_label: 'Coating Weight', coating_target: 22.1, coating_lcl: 19.7, coating_lwl: 20.9, coating_uwl: 23.3, coating_ucl: 24.5, coating_unit: 'g',
  },
];

// In-memory storage for demo mode measurements
let demoMeasurements = [];
let demoMeasurementId = 1;
let demoReports = [];
let demoReportId = 1;
let demoOrderId = 1;

function randomNear(target, spread) {
  return +(target + (Math.random() - 0.5) * spread * 2).toFixed(3);
}

export function generateDemoChartData(skuId, count = 8) {
  const sku = MOCK_SKUS.find(s => s.id === Number(skuId));
  if (!sku) return [];
  const data = [];
  for (let i = 0; i < count; i++) {
    const t = new Date();
    t.setMinutes(t.getMinutes() - (count - i) * 30);
    data.push({
      id: i + 1,
      thickness_value: randomNear(sku.thickness_target, (sku.thickness_ucl - sku.thickness_lcl) / 2),
      weight_value: randomNear(sku.weight_target, (sku.weight_ucl - sku.weight_lcl) / 2),
      coating_value: randomNear(sku.coating_target, (sku.coating_ucl - sku.coating_lcl) / 2),
      recorded_at: t.toISOString(),
      freezer_number: 1,
      operator_initials: 'KR',
    });
  }
  return data;
}

export const demoApi = {
  getLines: async () => MOCK_LINES,
  getSkus: async () => MOCK_SKUS,
  createProductionOrder: async (data) => ({
    id: demoOrderId++,
    ...data,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'active',
    created_at: new Date().toISOString(),
  }),
  completeProductionOrder: async () => ({ status: 'completed' }),
  getChartData: async (params) => {
    const skuEntries = demoMeasurements.filter(m =>
      String(m.sku_id) === String(params.sku_id) &&
      String(m.line_id) === String(params.line_id) &&
      String(m.freezer_number) === String(params.freezer_number)
    );
    if (skuEntries.length > 0) return skuEntries;
    return generateDemoChartData(params.sku_id, 0);
  },
  getMeasurements: async (params) => {
    return demoMeasurements.filter(m =>
      String(m.sku_id) === String(params.sku_id) &&
      String(m.line_id) === String(params.line_id) &&
      String(m.freezer_number) === String(params.freezer_number)
    ).reverse();
  },
  createMeasurement: async (data) => {
    const entry = {
      id: demoMeasurementId++,
      ...data,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    demoMeasurements.push(entry);
    return entry;
  },
  updateMeasurement: async (id, data) => {
    const idx = demoMeasurements.findIndex(m => m.id === Number(id));
    if (idx >= 0) {
      demoMeasurements[idx] = { ...demoMeasurements[idx], ...data };
      return demoMeasurements[idx];
    }
    return data;
  },
  createReport: async (data) => {
    const measurements = demoMeasurements.filter(m =>
      String(m.sku_id) === String(data.sku_id) &&
      String(m.line_id) === String(data.line_id)
    );
    const thicknesses = measurements.map(m => parseFloat(m.thickness_value)).filter(v => !isNaN(v));
    const weights = measurements.map(m => parseFloat(m.weight_value)).filter(v => !isNaN(v));
    const coatings = measurements.map(m => parseFloat(m.coating_value)).filter(v => !isNaN(v));
    const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;

    const report = {
      id: demoReportId++,
      ...data,
      total_measurements: measurements.length,
      thickness_avg: avg(thicknesses), thickness_out_of_control: 0, thickness_warnings: 0,
      weight_avg: avg(weights), weight_out_of_control: 0, weight_warnings: 0,
      coating_avg: avg(coatings), coating_out_of_control: 0, coating_warnings: 0,
      created_at: new Date().toISOString(),
    };
    demoReports.push(report);
    return report;
  },
  getReportPdf: async () => {
    alert('PDF download is not available in demo mode. This works in the full deployment with backend.');
    return new Blob(['Demo PDF'], { type: 'text/plain' });
  },
};
