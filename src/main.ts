import { MarkdownView, Plugin } from 'obsidian';
import { BakeModal } from './BakeModal';

export interface BakeSettings {
  bakeLinks: boolean;
  bakeEmbeds: boolean;
}

const DEFAULT_SETTINGS: BakeSettings = {
  bakeLinks: true,
  bakeEmbeds: true,
};

export default class EasyBake extends Plugin {
  settings: BakeSettings;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  get activeMarkdownFile() {
    return this.app.workspace.getActiveViewOfType(MarkdownView)?.file || null;
  }

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'bake-file',
      name: 'Bake current file',
      checkCallback: (checking) => {
        const file = this.activeMarkdownFile;
        if (checking || !file) return !!file;

        new BakeModal(this, file).open();
      },
    });
  }
}
