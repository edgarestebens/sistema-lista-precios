const fs = require('fs');
const files = [
  'src/app/pages/gastos/gastos.component.spec.ts',
  'src/app/pages/graficos-gastos/graficos-gastos.component.spec.ts',
  'src/app/services/gastos.service.spec.ts',
];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/\n\s*updated_at:\s*'[^']*',?/g, (match, offset, full) => {
    // Only strip updated_at inside Gasto-like fixtures: keep if near saldo_gasto (Parametro)
    const before = full.slice(Math.max(0, offset - 200), offset);
    if (before.includes('saldo_gasto')) return match;
    return '';
  });
  fs.writeFileSync(f, s);
  console.log('cleaned', f);
}
