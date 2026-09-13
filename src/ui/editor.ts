import { EDITOR_TOOLS, type Editor } from '@/app/editor';
import { $ } from './dom';
import { ICONS } from './icons';

export interface EditorActions {
  play(): void;
  close(): void;
}

/** Toolbar and side panel for the map editor (DOM overlay over the game canvas). */
export function renderEditorUi(editor: Editor, act: EditorActions): void {
  const root = $('#editorUi');
  root.hidden = false;
  root.innerHTML = `<div class="edbar">
      <b>Editor</b>
      ${EDITOR_TOOLS.map((t) => `<button data-tool="${t.id}" aria-pressed="${editor.tool === t.id}" title="${t.hint}">${t.label}</button>`).join('')}
      <span class="spacer"></span>
      <button id="edPlay" class="primary" title="Karte probespielen">${ICONS.play} Testen</button>
      <button id="edExport" title="JSON anzeigen">Export</button>
      <button id="edImport" title="JSON laden">Import</button>
      <button id="edClear" title="Karte leeren">Leeren</button>
      <button id="edClose" title="Zurück zum Menü">${ICONS.back} Menü</button>
    </div>
    <div class="edhint" id="edHint"></div>
    <div class="edjson" id="edJson" hidden><textarea id="edText" spellcheck="false"></textarea><div class="actions"><button id="edApply" class="primary">Übernehmen</button><button id="edCopy">Kopieren</button><button id="edJsonClose">Schließen</button></div></div>`;
  const hint = () => {
    const problems = editor.validate();
    const t = EDITOR_TOOLS.find((x) => x.id === editor.tool);
    $('#edHint').innerHTML =
      `${t?.hint ?? ''}${problems.length ? ` · <span class="bad">${problems.join(' ')}</span>` : ` · ${editor.map.nodes.length} Knoten, ${editor.map.edges.length} Kanten`}`;
    $<HTMLButtonElement>('#edPlay').disabled = problems.length > 0;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) =>
    b.addEventListener('click', () => {
      editor.tool = b.dataset.tool as Editor['tool'];
      root
        .querySelectorAll<HTMLButtonElement>('[data-tool]')
        .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      hint();
    }),
  );
  editor.onChange = hint;
  hint();
  $('#edPlay').addEventListener('click', () => act.play());
  $('#edClose').addEventListener('click', () => act.close());
  $('#edClear').addEventListener('click', () => {
    if (confirm('Karte wirklich leeren?')) editor.clear();
  });
  const json = $('#edJson'),
    text = $<HTMLTextAreaElement>('#edText');
  $('#edExport').addEventListener('click', () => {
    text.value = editor.export();
    json.hidden = false;
    text.select();
  });
  $('#edImport').addEventListener('click', () => {
    text.value = '';
    json.hidden = false;
    text.focus();
  });
  $('#edApply').addEventListener('click', () => {
    if (editor.import(text.value)) json.hidden = true;
    else text.value = 'Ungültiges JSON.';
  });
  $('#edCopy').addEventListener('click', () => void navigator.clipboard?.writeText(text.value));
  $('#edJsonClose').addEventListener('click', () => (json.hidden = true));
}

export function hideEditorUi(): void {
  const root = $('#editorUi');
  root.hidden = true;
  root.innerHTML = '';
}
