# Easy Bake

<img width="300" src="https://github.com/mgmeyers/obsidian-easy-bake/blob/master/screenshot.png?raw=true">

Easy Bake is an Obsidian plugin that allows compiling your notes into larger documents. Links and embeds that exist on their own line will be copied into the compiled document. Inline links will be replaced with the link's text. This process is recursive, meaning links in linked files will also be copied into the final document.

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
