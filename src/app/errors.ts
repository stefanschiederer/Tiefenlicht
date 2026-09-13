/** Surfaces uncaught errors in an on-screen box (useful on iOS where no console is available). */
function show(msg: string): void {
  let box = document.getElementById('errorBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'errorBox';
    box.setAttribute('role', 'alert');
    const close = document.createElement('button');
    close.textContent = 'Schließen';
    close.style.cssText = 'float:right;margin-left:8px';
    close.addEventListener('click', () => box?.remove());
    box.appendChild(close);
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.textContent = msg;
  box.appendChild(line);
}

window.addEventListener('error', (e) => {
  show(`Fehler: ${e.message} (${e.filename?.split('/').pop() ?? '?'}:${e.lineno})`);
});
window.addEventListener('unhandledrejection', (e) => {
  const r: unknown = e.reason;
  show(`Unbehandelt: ${r instanceof Error ? r.message : String(r)}`);
});
