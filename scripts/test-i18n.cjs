const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const commandId = 'convert-clipboard-image-to-canvas';

function loadCatalog(locale, exportName) {
  const file = path.join(root, 'src/i18n/locales', locale + '.ts');
  const { code } = esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' });
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod });
  return mod.exports[exportName];
}

const en = loadCatalog('en', 'en');
const pt = loadCatalog('pt-BR', 'ptBR');
const zh = loadCatalog('zh-TW', 'zhTW');

test('every translation has the same keys and named placeholders as English', () => {
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [locale, catalog] of [['pt-BR', pt], ['zh-TW', zh]]) {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(en).sort(), locale);
    for (const [key, message] of Object.entries(catalog)) {
      assert.ok(message.trim(), locale + ' ' + key);
      assert.deepEqual(placeholders(message), placeholders(en[key]), locale + ' ' + key);
    }
  }
});

async function launch({ appLanguage, legacyLanguage, saved = null, oldApp = false, lockedStorage = false }) {
  const notices = [];
  const files = [];
  const commands = new Map();
  const rows = [];
  const ribbon = {
    setAttribute(name, value) { this[name] = value; },
    setAttr(name, value) { this[name] = value; }
  };
  class Setting {
    constructor() { rows.push(this); }
    setName(name) { this.name = name; return this; }
    setDesc() { return this; }
    setHeading() { return this; }
    addText() { return this; }
    addTextArea() { return this; }
    addToggle() { return this; }
    addDropdown(build) {
      this.options = new Map();
      this.addOption = (key, name) => { this.options.set(key, name); return this; };
      this.setValue = value => { this.value = value; return this; };
      this.onChange = handler => { this.change = handler; return this; };
      build(this);
      return this;
    }
  }
  const api = {
    Platform: { isMobile: false },
    Plugin: class {}, Setting, TFile: class {},
    PluginSettingTab: class { containerEl = { empty() { rows.length = 0; } }; },
    Notice: class { constructor(message) { notices.push(message); } },
    setTooltip(el, text) { el.setAttribute('aria-label', text); },
    requestUrl: async () => ({ status: 200, json: { choices: [{ message: {
      content: JSON.stringify({ title: 'Original', nodes: [{ id: 'n', content: 'Texto original' }] })
    } }] } })
  };
  if (oldApp) delete api.setTooltip;
  else api.getLanguage = () => appLanguage;
  const localStorage = { getItem(key) {
    if (lockedStorage) throw new Error('Storage unavailable');
    return key === 'language' ? legacyLanguage : null;
  } };
  const mod = { exports: {} };
  vm.runInNewContext(bundle, {
    module: mod, require(id) { assert.equal(id, 'obsidian'); return api; },
    localStorage, btoa, navigator: { clipboard: { read: async () => [] } }
  });
  const plugin = new mod.exports.default();
  let tab, fileMenu, spinner;
  Object.assign(plugin, {
    manifest: { id: 'vision-to-canvas', name: 'Vision2Canvas' },
    app: {
      workspace: { on(event, fn) { if (event === 'file-menu') fileMenu = fn; } },
      vault: {
        readBinary: async () => new Uint8Array([1]).buffer,
        async create(name, content) { files.push({ name, content }); return { name }; }
      }
    },
    loadData: async () => structuredClone(saved), saveData: async value => { saved = structuredClone(value); },
    addCommand(command) {
      assert.ok(!commands.has(command.id), 'duplicate command');
      commands.set(command.id, command);
      return command;
    },
    addSettingTab(value) { tab = value; }, registerEvent() {},
    addRibbonIcon(icon, title) { ribbon.setAttribute('aria-label', title); return ribbon; },
    addStatusBarItem() { return {
      addClass() {},
      createSpan({ attr }) { spinner = { ...attr, remove() { this.removed = true; } }; return spinner; }
    }; }
  });
  if (!oldApp) plugin.removeCommand = id => commands.delete(id);
  await plugin.onload();
  tab.display();
  return {
    plugin, commands, ribbon, notices, files,
    get spinner() { return spinner; },
    get language() { return rows.find(row => row.options?.has('auto')); },
    get saved() { return saved; },
    menuTitle() {
      const item = { setTitle(title) { this.title = title; return this; }, setIcon() { return this; }, onClick() {} };
      fileMenu({ addItem(fn) { fn(item); } }, Object.assign(new api.TFile(), { extension: 'png' }));
      return item.title;
    }
  };
}

test('settings, commands, ribbon, menu and conversion feedback follow the selected language', async () => {
  const app = await launch({ appLanguage: 'pt_BR', legacyLanguage: 'en' });
  assert.equal(app.language.value, 'auto');
  assert.deepEqual([...app.language.options.keys()].sort(), ['auto', 'en', 'pt-BR', 'zh-TW']);
  assert.equal(app.language.name, pt['settings.language.name']);
  assert.equal(app.commands.get(commandId).name, pt['commands.convertClipboard']);
  assert.equal(app.menuTitle(), pt['menu.convertImage']);
  await app.language.change('zh-TW');
  assert.equal(app.language.name, zh['settings.language.name']);
  assert.equal(app.commands.get(commandId).name, zh['commands.convertClipboard']);
  assert.equal(app.ribbon['aria-label'], zh['commands.convertClipboard']);
  assert.equal(app.menuTitle(), zh['menu.convertImage']);
  await app.plugin.convertClipboardImage();
  const clipboard = zh['source.clipboardImage'];
  assert.equal(app.spinner['aria-label'], zh['status.converting'].replace('{source}', clipboard));
  assert.ok(app.spinner.removed);
  assert.equal(app.notices.length, 1);
  assert.equal(app.notices[0], zh['notice.conversionFailed']
    .replace('{source}', clipboard).replace('{reason}', zh['errors.clipboardEmpty']));
  await app.plugin.convertVaultImage({ path: 'photo.png', name: 'photo.png', basename: 'photo' });
  assert.equal(app.notices[1], zh['notice.conversionFailed'].replace('{source}', 'photo.png')
    .replace('{reason}', zh['errors.ai.apiKeyRequired'].replace('{provider}', 'Google Gemini')));
  assert.equal(app.saved.language, 'zh-TW');

  const reopened = await launch({ appLanguage: 'pt', saved: app.saved });
  assert.equal(reopened.language.value, 'zh-TW');
  assert.equal(reopened.language.name, zh['settings.language.name']);
  await reopened.language.change('auto');
  assert.equal(reopened.saved.language, 'auto');
  assert.equal(reopened.language.name, pt['settings.language.name']);
});

test('legacy installations and unavailable or unsupported locales have usable defaults', async () => {
  const saved = { aiProvider: 'remote', apiKey: 'test-key', modelName: 'test-model', autoOpenCanvas: false };
  const app = await launch({ legacyLanguage: 'zh-Hant', oldApp: true, saved });
  assert.equal(app.language.value, 'auto');
  assert.equal(app.language.name, zh['settings.language.name']);
  await app.language.change('pt-BR');
  assert.equal(app.language.name, pt['settings.language.name']);
  assert.equal(app.commands.size, 1);
  assert.equal(app.commands.get(commandId).name, zh['commands.convertClipboard']);
  assert.equal(app.ribbon.title, pt['commands.convertClipboard']);
  assert.equal(app.saved.autoOpenCanvas, false);
  assert.equal(app.saved.connections.gemini.apiKey, 'test-key');
  const reopened = await launch({ oldApp: true, legacyLanguage: 'zh-TW', saved: app.saved });
  assert.equal(reopened.commands.get(commandId).name, pt['commands.convertClipboard']);
  await app.plugin.convertVaultImage({ path: 'input.png', name: 'input.png', basename: 'input' });
  assert.equal(app.files.length, 1);
  assert.match(app.files[0].name, /^Original_.*\.canvas$/);
  assert.equal(JSON.parse(app.files[0].content).nodes[0].text, 'Texto original');
  assert.deepEqual(app.notices, [pt['notice.canvasCreated'].replace('{filename}', app.files[0].name)]);
  for (const options of [{ appLanguage: 'zh' }, { appLanguage: 'de' }, { oldApp: true, lockedStorage: true }]) {
    const fallback = await launch(options);
    assert.equal(fallback.language.name, en['settings.language.name']);
  }
});
