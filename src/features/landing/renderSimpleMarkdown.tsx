import type { ReactNode } from 'react'

/** Minimal markdown: `#` / `##` headings, paragraphs, and `- ` bullets. */
export function renderSimpleMarkdown(source: string): ReactNode[] {
    const blocks = source.replace(/\r\n/g, '\n').trim().split(/\n{2,}/)
    const nodes: ReactNode[] = []

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim()
        if (!block) continue

        if (block.startsWith('# ')) {
            nodes.push(<h1 key={i}>{inlineBold(block.slice(2))}</h1>)
            continue
        }
        if (block.startsWith('## ')) {
            nodes.push(<h2 key={i}>{inlineBold(block.slice(3))}</h2>)
            continue
        }

        const lines = block.split('\n')
        if (lines.every((line) => line.trim().startsWith('- '))) {
            nodes.push(
                <ul key={i}>
                    {lines.map((line, j) => (
                        <li key={j}>{inlineBold(line.trim().slice(2))}</li>
                    ))}
                </ul>,
            )
            continue
        }

        nodes.push(<p key={i}>{inlineBold(block.replace(/\n/g, ' '))}</p>)
    }

    return nodes
}

function inlineBold(text: string): ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return part
    })
}
