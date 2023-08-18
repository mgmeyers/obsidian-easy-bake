# Easy Bake

![](screenshot.png)

Easy Bake is an Obsidian plugin that allows compiling your notes into larger documents. Links and embeds that exist on their own line will be copied into the compiled document. Inline links will be replaced with the link's text.

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
