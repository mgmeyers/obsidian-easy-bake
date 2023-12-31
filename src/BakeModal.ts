import {
  App,
  FileSystemAdapter,
  Modal,
  Platform,
  Setting,
  TFile,
  parseLinktext,
  resolveSubpath,
} from 'obsidian';

import EasyBake, { BakeSettings } from './main';
import {
  applyIndent,
  extractSubpath,
  getWordCount,
  sanitizeBakedContent,
  stripFirstBullet,
} from './util';

const lineStartRE = /(?:^|\n) *$/;
const listLineStartRE = /(?:^|\n)([ \t]*)(?:[-*+]|[0-9]+[.)]) +$/;
const lineEndRE = /^ *(?:\r?\n|$)/;

async function bake(
  app: App,
  file: TFile,
  subpath: string | null,
  ancestors: Set<TFile>,
  settings: BakeSettings
) {
  const { vault, metadataCache } = app;

  let text = await vault.cachedRead(file);
  const cache = metadataCache.getFileCache(file);

  // No cache? Return the file as is...
  if (!cache) return text;

  // Get the target block or section if we have a subpath
  const resolvedSubpath = subpath ? resolveSubpath(cache, subpath) : null;
  if (resolvedSubpath) {
    text = extractSubpath(text, resolvedSubpath, cache);
  }

  const links = settings.bakeLinks ? cache.links || [] : [];
  const embeds = settings.bakeEmbeds ? cache.embeds || [] : [];
  const targets = [...links, ...embeds];

  // No links in the current file; we can stop here...
  if (targets.length === 0) return text;

  targets.sort((a, b) => a.position.start.offset - b.position.start.offset);

  const newAncestors = new Set(ancestors);
  newAncestors.add(file);

  // This helps us keep track of edits we make to the text and sync them with
  // position data held in the metadata cache
  let posOffset = 0;
  for (const target of targets) {
    const { path, subpath } = parseLinktext(target.link);
    const linkedFile = metadataCache.getFirstLinkpathDest(path, file.path);

    if (!linkedFile) continue;

    const start = target.position.start.offset + posOffset;
    const end = target.position.end.offset + posOffset;
    const prevLen = end - start;

    const before = text.substring(0, start);
    const after = text.substring(end);

    const listMatch = settings.bakeInList
      ? before.match(listLineStartRE)
      : null;
    const isInline =
      !(listMatch || lineStartRE.test(before)) || !lineEndRE.test(after);
    const isMarkdownFile = linkedFile.extension === 'md';

    const replaceTarget = (replacement: string) => {
      text = before + replacement + after;
      posOffset += replacement.length - prevLen;
    };

    if (!isMarkdownFile) {
      // Skip link processing if we're not converting file links...
      if (!settings.convertFileLinks) continue;

      const adapter = app.vault.adapter as FileSystemAdapter;

      // FYI: The mobile adapter also has getFullPath so this should work on mobile and desktop
      //      The mobile adapter isn't exported in the public API, however
      if (!adapter.getFullPath) continue;
      const fullPath = adapter.getFullPath(linkedFile.path);
      const protocol = Platform.isWin ? 'file:///' : 'file://';
      replaceTarget(`![](${protocol}${encodeURI(fullPath)})`);
      continue;
    }

    // Replace the link with its text if the it's inline or would create an infinite loop
    if (newAncestors.has(linkedFile) || isInline) {
      replaceTarget(target.displayText || path);
      continue;
    }

    // Recurse and bake the linked file...
    const baked = sanitizeBakedContent(
      await bake(app, linkedFile, subpath, newAncestors, settings)
    );
    replaceTarget(
      listMatch ? applyIndent(stripFirstBullet(baked), listMatch[1]) : baked
    );
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
    this.modalEl.addClass('mod-narrow', 'easy-bake-modal');
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

    new Setting(contentEl)
      .setName('Bake links and embeds in lists')
      .setDesc(
        'Include the content of [[any link]] or ![[embedded markdown file]] when it takes up an entire list bullet.'
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.bakeInList).onChange((value) => {
          settings.bakeInList = value;
          plugin.saveSettings();
        })
      );

    new Setting(contentEl)
      .setName('Bake file links')
      .setDesc(
        'Convert links to ![[non-markdown files.png]] to ![](file:///full/path/to/non-markdown%20files.png)'
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.convertFileLinks).onChange((value) => {
          settings.convertFileLinks = value;
          plugin.saveSettings();
        })
      );

    new Setting(contentEl).setName('Output file name').then((setting) => {
      new Setting(contentEl).then((setting) => {
        setting.addButton((btn) =>
          btn.setButtonText('Calculate word count').onClick(async () => {
            const baked = await bake(this.app, file, null, new Set(), settings);

            setting.descEl.setText(getWordCount(baked).toString());
          })
        );
      });

      this.modalEl.createDiv('modal-button-container', (el) => {
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
            const baked = await bake(this.app, file, null, new Set(), settings);
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
