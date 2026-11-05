// Kuzigama Data: igihe cari ku "on", app yirinda gufata amakuru menshi
// (nko gufata videwo ya mbere itarakenewe). Ibikoresho bishobora kureba
// iri hitamo bakoresheje getDataSaver() aho bishobora gufata amakuru menshi.
const KEY = 'bw_data_saver_v1'

export function getDataSaver() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function setDataSaver(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
}
