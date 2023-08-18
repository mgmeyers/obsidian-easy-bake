import { App, Modal, Setting, TFile } from 'obsidian';
import EasyBake, { BakeSettings } from './main';
import { getWordCount } from './util';

const lineStartRE = /(?:^|[\r\n]) *$/;
const lineEndRE = /^ *(?:[\r\n]|$)/;

async function bake(
  app: App,
  file: TFile,
  ancestors: Set<TFile>,
  settings: BakeSettings
) {
  const { vault, metadataCache } = app;

  let text = await vault.cachedRead(file);
  const cache = metadataCache.getFileCache(file);

  if (!cache) return text;

  const links = settings.bakeLinks ? cache.links || [] : [];
  const embeds = settings.bakeEmbeds ? cache.embeds || [] : [];

  if (links.length + embeds.length === 0) return text;

  const targets = [...links, ...embeds].filter((v) => {
    const linkedFile = metadataCache.getFirstLinkpathDest(v.link, file.path);
    return linkedFile?.extension === 'md';
  });

  targets.sort((a, b) => a.position.start.offset - b.position.start.offset);

  const newAncestors = new Set(ancestors);
  newAncestors.add(file);

  let posOffset = 0;
  for (const target of targets) {
    const linkedFile = metadataCache.getFirstLinkpathDest(
      target.link,
      file.path
    );
    if (!linkedFile) continue;

    const start = target.position.start.offset + posOffset;
    const end = target.position.end.offset + posOffset;
    const prevLen = end - start;

    const before = text.substring(0, start);
    const after = text.substring(end);

    const isInline = !lineStartRE.test(before) || !lineEndRE.test(after);

    const replaceTarget = (replacement: string) => {
      text = before + replacement + after;
      posOffset += replacement.length - prevLen;
    };

    if (newAncestors.has(linkedFile) || isInline) {
      replaceTarget(target.displayText || target.link);
      continue;
    }

    replaceTarget(await bake(app, linkedFile, newAncestors, settings));
  }

  return text;
}

function disableBtn(btn: HTMLButtonElement) {
  btn.removeClass('mod-cta');
  btn.addClass('mod-muted');
  btn.setAttrs({
    disabled: 'true',
    'aria-disabled': 'true',
  });
}

function enableBtn(btn: HTMLButtonElement) {
  btn.removeClass('mod-muted');
  btn.addClass('mod-cta');
  btn.setAttrs({
    disabled: 'false',
    'aria-disabled': 'false',
  });
}

export class BakeModal extends Modal {
  constructor(plugin: EasyBake, file: TFile) {
    super(plugin.app);

    const { contentEl } = this;
    const { settings } = plugin;

    this.titleEl.setText('Bake file');
    this.modalEl.addClass('mod-narrow');
    this.contentEl
      .createEl('p', { text: 'Input file: ' })
      .createEl('strong', { text: file.path });

    new Setting(contentEl)
      .setName('Bake embedded markdown')
      .setDesc(
        'Include the content of ![[embedded markdown files]] when the link is on its own line.'
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.bakeEmbeds).onChange((value) => {
          settings.bakeEmbeds = value;
          plugin.saveSettings();
        })
      );

    new Setting(contentEl)
      .setName('Bake links')
      .setDesc(
        'Include the content of [[any link]] when it is on its own line.'
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.bakeLinks).onChange((value) => {
          settings.bakeLinks = value;
          plugin.saveSettings();
        })
      );

    new Setting(contentEl).setName('Output file name').then((setting) => {
      new Setting(contentEl).then((setting) => {
        setting.addButton((btn) =>
          btn.setButtonText('Calculate word count').onClick(async () => {
            const baked = await bake(this.app, file, new Set(), settings);

            setting.descEl.setText(getWordCount(baked).toString());
          })
        );
      });

      contentEl.createDiv('modal-button-container', (el) => {
        let outputName = file.basename + '.baked';
        let outputFolder = file.parent?.path || '';

        if (outputFolder) outputFolder += '/';

        const btn = el.createEl('button', {
          cls: 'mod-cta',
          text: 'Bake',
        });

        activeWindow.setTimeout(() => {
          // Set focus so users can quickly press enter
          btn.focus();
        });

        btn.addEventListener('click', async () => {
          disableBtn(btn);
          if (outputName) {
            const { vault } = this.app;
            const baked = await bake(this.app, file, new Set(), settings);
            const nextPath = outputFolder + outputName + '.md';
            let existing = vault.getAbstractFileByPath(nextPath);

            if (existing instanceof TFile) {
              await vault.modify(existing, baked);
            } else {
              existing = await vault.create(nextPath, baked);
            }

            if (existing instanceof TFile) {
              this.app.workspace.getLeaf('tab').openFile(existing);
            }
          }

          this.close();
        });

        setting.addText((text) =>
          text.setValue(outputName).onChange((value) => {
            outputName = value;
            if (!value) {
              disableBtn(btn);
            } else if (btn.disabled) {
              enableBtn(btn);
            }
          })
        );
      });
    });
  }
}
