export function popupElement(lines: string[]) {
  const root = document.createElement('div');
  lines.forEach((line, i) => {
    const el = document.createElement(i === 0 ? 'strong' : 'div');
    el.textContent = line;
    root.appendChild(el);
  });
  return root;
}
