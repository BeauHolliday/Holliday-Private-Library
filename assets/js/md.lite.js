// Minimal markdown renderer for headings, paragraphs, bold, italic, links, lists
function renderMarkdown(md){
  if(!md) return '';
  let out = md.replace(/\r\n/g,'\n');
  // headings
  out = out.replace(/^### (.+)$/gm,'<h3>$1</h3>')
           .replace(/^## (.+)$/gm,'<h2>$1</h2>')
           .replace(/^# (.+)$/gm,'<h1>$1</h1>');
  // lists (simple)
  out = out.replace(/(^|\n)- (.+)/g,'$1<li>$2</li>').replace(/(<li>[\s\S]+?<\/li>)/g, m => '<ul>'+m+'</ul>');
  // inline formatting
  out = out.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
           .replace(/\*(.+?)\*/g,'<em>$1</em>')
           .replace(/

\[([^\]

]+)\]

\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  // paragraphs
  out = out.split('\n\n').map(p=> p.match(/^<h|^<ul/) ? p : '<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
  return out;
}
