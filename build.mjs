// Ihuza template + css + js ikaba dosiye imwe: dist/index.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const tpl = readFileSync(new URL('./src/template.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./src/style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('./src/app.js', import.meta.url), 'utf8');
if (js.includes('</script')) throw new Error('app.js must not contain </script');

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
const out = tpl.replace('/*STYLE*/', () => css).replace('/*APP*/', () => js);
writeFileSync(new URL('./dist/index.html', import.meta.url), out);
writeFileSync(new URL('./dist/_app_check.mjs', import.meta.url), js);
console.log('built dist/index.html', out.length, 'bytes');
