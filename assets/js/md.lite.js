// Minimal markdown renderer for headings, paragraphs, bold, italic, links, lists
function renderMarkdown(md) {
  if(!md) return '';
  let out = md
    .replace(/\r\n/g,'\n')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/(^|\n)\- (.+)/g,'$1<li>$2</li>').replace(/(<li>.+<\/li>)/gs,'<ul>$1</ul>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/

\[([^\]

]+)\]

\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .split('\n\n').map(p=> p.match(/^<h|^<ul/)?p:p='<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
  return out;
}

