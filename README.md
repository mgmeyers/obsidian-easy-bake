<p align="center">
  <img align="center" width="175" src="https://github.com/mgmeyers/obsidian-easy-bake/blob/master/assets/logo.png?raw=true">
</p>

<h1 align="center">Easy Bake</h1>

<p align="center">
Easy Bake is an Obsidian plugin that allows compiling your notes into larger documents. This plugin is focused on simplicity. For more complex compilation scenarios, try <a href="https://github.com/kevboh/longform">kevboh's longform plugin</a>.
</p>
<p align="center">
Activate the plugin using the <code>Bake current file</code> command in <a href="https://help.obsidian.md/Plugins/Command+palette" rel="nofollow">Obsidian's command palette</a>.
</p>

---

<img width="500" src="https://github.com/mgmeyers/obsidian-easy-bake/blob/master/assets/screenshot.png?raw=true">

Links and embeds that exist on their own line will be copied into the compiled document. Inline links will be replaced with the link's text. This process is recursive, meaning links in linked files will also be copied into the final document.

For example,

```markdown
## Section One

[[File one]]
[[File two]]

## Section Three

This is an [[File three|inline link]].

[[File four]]
```

will be compiled to:

```markdown
## Section One

Content of file one
Content of file two

## Section Three

This is an inline link.

Content of file four
```
