const pool = require('../config/database');

const lines = [
  { name: 'line_1', display_name: 'Line 1', freezer_count: 4 },
  { name: 'line_2', display_name: 'Line 2', freezer_count: 2 },
  { name: 'line_3', display_name: 'Line 3', freezer_count: 2 },
];

const skus = [
  {
    product_name: "Klondike Reese's Peanut Butter Cup",
    product_code: '68300738',
    cr_code: 'CR-2146_5',
    startup_cup_weight_target: 110.8,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.8, thickness_lcl: 17.43, thickness_lwl: 17.6, thickness_uwl: 18.0, thickness_ucl: 18.2,
    weight_label: 'Slice Weight w/ Variegate',
    weight_target: 59.5, weight_lcl: 55.5, weight_lwl: 57.5, weight_uwl: 61.5, weight_ucl: 63.5,
    coating_label: 'Coating Weight',
    coating_target: 18.0, coating_lcl: 15.6, coating_lwl: 16.8, coating_uwl: 19.2, coating_ucl: 20.4,
  },
  {
    product_name: 'Klondike Original MTB',
    product_code: '68689251',
    cr_code: 'CR-2154_4',
    startup_cup_weight_target: 114.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0,
    weight_label: 'Slice Weight',
    weight_target: 62.3, weight_lcl: 58.3, weight_lwl: 60.3, weight_uwl: 64.3, weight_ucl: 66.3,
    coating_label: 'Coating Weight',
    coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4,
  },
  {
    product_name: 'Klondike SAB RF NSA Vanilla Bars',
    product_code: '68709233',
    cr_code: 'CR-2151_5',
    startup_cup_weight_target: 113.7,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.8, thickness_lcl: 17.4, thickness_lwl: 17.6, thickness_uwl: 18.0, thickness_ucl: 18.2,
    weight_label: 'Slice Weight',
    weight_target: 56.5, weight_lcl: 52.5, weight_lwl: 54.5, weight_uwl: 58.5, weight_ucl: 60.5,
    coating_label: 'Coating Weight',
    coating_target: 18.0, coating_lcl: 15.6, coating_lwl: 16.8, coating_uwl: 19.2, coating_ucl: 20.4,
  },
  {
    product_name: 'Klondike Chocolate/Chocolate',
    product_code: '68709237',
    cr_code: 'CR-2147_4',
    startup_cup_weight_target: 113.7,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0,
    weight_label: 'Slice Weight',
    weight_target: 62.1, weight_lcl: 58.1, weight_lwl: 60.1, weight_uwl: 64.1, weight_ucl: 66.1,
    coating_label: 'Coating Weight',
    coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4,
  },
  {
    product_name: 'Klondike SAB NSA Krunch Bars',
    product_code: '68710277',
    cr_code: 'CR-2150_4',
    startup_cup_weight_target: 113.7,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.9, thickness_lcl: 17.5, thickness_lwl: 17.7, thickness_uwl: 18.1, thickness_ucl: 18.3,
    weight_label: 'Slice Weight',
    weight_target: 57.1, weight_lcl: 53.1, weight_lwl: 55.1, weight_uwl: 59.1, weight_ucl: 61.1,
    coating_label: 'Coating Weight w/Crisp Rice',
    coating_target: 15.4, coating_lcl: 13.0, coating_lwl: 14.2, coating_uwl: 16.6, coating_ucl: 17.8,
  },
  {
    product_name: 'Klondike Krunch Bars',
    product_code: '68710285',
    cr_code: 'CR-2144_4',
    startup_cup_weight_target: 113.7,
    thickness_label: 'Slice Thickness',
    thickness_target: 18.1, thickness_lcl: 17.7, thickness_lwl: 17.9, thickness_uwl: 18.3, thickness_ucl: 18.5,
    weight_label: 'Slice Weight',
    weight_target: 57.4, weight_lcl: 53.4, weight_lwl: 55.4, weight_uwl: 59.4, weight_ucl: 61.4,
    coating_label: 'Coating Weight w/Crisp Rice',
    coating_target: 24.6, coating_lcl: 22.2, coating_lwl: 23.4, coating_uwl: 25.8, coating_ucl: 27.0,
  },
  {
    product_name: 'Klondike Mint Choc. Chip Bar 12-6PK',
    product_code: '68746232',
    cr_code: 'CR-2497_1',
    startup_cup_weight_target: 113.4,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.7, thickness_lcl: 17.4, thickness_lwl: 17.5, thickness_uwl: 17.9, thickness_ucl: 18.0,
    weight_label: 'Slice Weight',
    weight_target: 55.7, weight_lcl: 52.9, weight_lwl: 54.3, weight_uwl: 57.1, weight_ucl: 58.5,
    coating_label: 'Coating Weight',
    coating_target: 21.3, coating_lcl: 18.9, coating_lwl: 20.1, coating_uwl: 22.5, coating_ucl: 23.7,
  },
  {
    product_name: 'Klondike Cookies and Creme Bar 12-6PK',
    product_code: '68852583',
    cr_code: 'CR-2495_2',
    startup_cup_weight_target: 113.4,
    thickness_label: 'Slice Thickness',
    thickness_target: 16.8, thickness_lcl: 16.77, thickness_lwl: 16.78, thickness_uwl: 16.82, thickness_ucl: 16.83,
    weight_label: 'Slice Weight',
    weight_target: 52.9, weight_lcl: 50.1, weight_lwl: 51.5, weight_uwl: 54.3, weight_ucl: 55.7,
    coating_label: 'Coating Weight',
    coating_target: 22.1, coating_lcl: 19.7, coating_lwl: 20.9, coating_uwl: 23.3, coating_ucl: 24.5,
  },
  {
    product_name: 'Klondike Heath',
    product_code: '68852591',
    cr_code: 'CR-2148_3',
    startup_cup_weight_target: 108.6,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.2, thickness_lcl: 16.8, thickness_lwl: 17.0, thickness_uwl: 17.4, thickness_ucl: 17.6,
    weight_label: 'Slice Weight',
    weight_target: 52.1, weight_lcl: 48.1, weight_lwl: 50.1, weight_uwl: 54.1, weight_ucl: 56.1,
    coating_label: 'Coating Weight w/Inclusion',
    coating_target: 20.4, coating_lcl: 17.8, coating_lwl: 19.1, coating_uwl: 21.7, coating_ucl: 23.0,
  },
  {
    product_name: 'Klondike Dark Chocolate',
    product_code: '68921994',
    cr_code: 'CR-2155_3',
    startup_cup_weight_target: 113.5,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.6, thickness_lcl: 19.2, thickness_lwl: 19.4, thickness_uwl: 19.8, thickness_ucl: 20.0,
    weight_label: 'Slice Weight',
    weight_target: 62.1, weight_lcl: 58.4, weight_lwl: 60.4, weight_uwl: 64.4, weight_ucl: 66.4,
    coating_label: 'Coating Weight',
    coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4,
  },
  {
    product_name: 'Klondike Original (69548143)',
    product_code: '69548143',
    cr_code: 'CR-2152_2',
    startup_cup_weight_target: 114.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 20.1, thickness_lcl: 19.9, thickness_lwl: 20.03, thickness_uwl: 20.17, thickness_ucl: 20.24,
    weight_label: 'Slice Weight',
    weight_target: 62.3, weight_lcl: 58.3, weight_lwl: 60.3, weight_uwl: 64.3, weight_ucl: 66.3,
    coating_label: 'Coating Weight',
    coating_target: 23.0, coating_lcl: 20.6, coating_lwl: 21.8, coating_uwl: 24.2, coating_ucl: 25.4,
  },
  {
    product_name: "Klondike Reese's (69549032)",
    product_code: '69549032',
    cr_code: 'CR-2153_2',
    startup_cup_weight_target: 110.3,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.0, thickness_lcl: 16.7, thickness_lwl: 16.8, thickness_uwl: 17.2, thickness_ucl: 17.3,
    weight_label: 'Slice Weight w/ Variegate',
    weight_target: 50.4, weight_lcl: 47.4, weight_lwl: 48.9, weight_uwl: 51.9, weight_ucl: 53.4,
    coating_label: 'Coating Weight',
    coating_target: 17.0, coating_lcl: 15.8, coating_lwl: 16.4, coating_uwl: 17.6, coating_ucl: 18.2,
  },
  {
    product_name: "Klondike Reese's (69779478)",
    product_code: '69779478',
    cr_code: 'CR-2156_2',
    startup_cup_weight_target: 110.3,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.0, thickness_lcl: 16.6, thickness_lwl: 16.8, thickness_uwl: 17.2, thickness_ucl: 17.4,
    weight_label: 'Slice Weight w/ Variegate',
    weight_target: 50.4, weight_lcl: 47.4, weight_lwl: 48.9, weight_uwl: 51.9, weight_ucl: 53.4,
    coating_label: 'Coating Weight',
    coating_target: 17.0, coating_lcl: 15.8, coating_lwl: 16.4, coating_uwl: 17.6, coating_ucl: 18.2,
  },
];

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Seed lines
    for (const line of lines) {
      await client.query(
        `INSERT INTO lines (name, display_name, freezer_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET display_name = $2, freezer_count = $3`,
        [line.name, line.display_name, line.freezer_count]
      );
    }

    // Seed SKUs
    for (const sku of skus) {
      await client.query(
        `INSERT INTO skus (
          product_name, product_code, cr_code, startup_cup_weight_target,
          thickness_label, thickness_target, thickness_lcl, thickness_lwl, thickness_uwl, thickness_ucl,
          weight_label, weight_target, weight_lcl, weight_lwl, weight_uwl, weight_ucl,
          coating_label, coating_target, coating_lcl, coating_lwl, coating_uwl, coating_ucl
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        ON CONFLICT (product_code) DO UPDATE SET
          product_name=$1, cr_code=$3, startup_cup_weight_target=$4,
          thickness_label=$5, thickness_target=$6, thickness_lcl=$7, thickness_lwl=$8, thickness_uwl=$9, thickness_ucl=$10,
          weight_label=$11, weight_target=$12, weight_lcl=$13, weight_lwl=$14, weight_uwl=$15, weight_ucl=$16,
          coating_label=$17, coating_target=$18, coating_lcl=$19, coating_lwl=$20, coating_uwl=$21, coating_ucl=$22`,
        [
          sku.product_name, sku.product_code, sku.cr_code, sku.startup_cup_weight_target,
          sku.thickness_label, sku.thickness_target, sku.thickness_lcl, sku.thickness_lwl, sku.thickness_uwl, sku.thickness_ucl,
          sku.weight_label, sku.weight_target, sku.weight_lcl, sku.weight_lwl, sku.weight_uwl, sku.weight_ucl,
          sku.coating_label, sku.coating_target, sku.coating_lcl, sku.coating_lwl, sku.coating_uwl, sku.coating_ucl,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${lines.length} lines and ${skus.length} SKUs successfully`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seed, skus, lines };
