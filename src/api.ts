import { TFile } from 'obsidian';

import { bake as bakeUtil } from './bake';
import EasyBake, { BakeSettings } from './main';

export class EasyBakeApi {
  private plugin: EasyBake;

  constructor(plugin: EasyBake) {
    this.plugin = plugin;
  }

  public async bakeToString(inputPath: string, settings: BakeSettings) {
    const app = this.plugin.app;
    const file = app.vault.getAbstractFileByPath(inputPath);

    if (!(file instanceof TFile)) {
      console.error('Input file does not exist');
      return;
    }

    return await bakeUtil(app, file, null, new Set(), settings);
  }

  public async bakeToFile(
    inputPath: string,
    outputPath: string,
    settings: BakeSettings
  ) {
    const baked = await this.bakeToString(inputPath, settings);
    if (!baked) return;

    const app = this.plugin.app;
    let existing = app.vault.getAbstractFileByPath(outputPath);
    if (existing instanceof TFile) {
      await app.vault.modify(existing, baked);
    } else {
      existing = await app.vault.create(outputPath, baked);
    }
  }

  public async bakeAndOpen(
    inputPath: string,
    outputPath: string,
    settings: BakeSettings
  ) {
    await this.bakeToFile(inputPath, outputPath, settings);

    const app = this.plugin.app;
    const existing = app.vault.getAbstractFileByPath(outputPath);
    if (existing instanceof TFile) {
      await app.workspace.getLeaf('tab').openFile(existing);
    }
  }
}
