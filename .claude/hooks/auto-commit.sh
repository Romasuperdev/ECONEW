#!/usr/bin/env bash
# Auto-commit the single file just modified by Write/Edit/NotebookEdit.
# Silent no-op on any failure so it never blocks the tool call.

file=$(node -e '
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const f = (j.tool_input && (j.tool_input.file_path || j.tool_input.notebook_path)) || "";
    process.stdout.write(f);
  } catch (e) {}
});
')

if [ -z "$file" ]; then
  exit 0
fi

repo_root="c:/ROMARIC/ECONEW/ECONEW"

if ! git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

git -C "$repo_root" add -- "$file" >/dev/null 2>&1

if git -C "$repo_root" diff --cached --quiet -- "$file" 2>/dev/null; then
  exit 0
fi

git -C "$repo_root" commit -m "Auto: $(basename "$file")" --quiet >/dev/null 2>&1
exit 0
