import { FileText } from 'lucide-react'
import type { AttachmentRef } from '@project/sdk'

const isImage = (m: string) => m.startsWith('image/')

/** Thumbnails for images, chips for documents. Every item opens the signed source file. */
export function AttachmentGrid({ items, limit, onMore }: { items: AttachmentRef[]; limit?: number; onMore?: () => void }) {
  const images = items.filter((a) => isImage(a.mimeType))
  const files = items.filter((a) => !isImage(a.mimeType))
  const shown = limit ? images.slice(0, limit) : images
  const hidden = images.length - shown.length
  return (
    <div className="stack gap-2">
      {shown.length ? (
        <div className="attachment-grid">
          {shown.map((a) => (
            <a key={a.id} className="attachment-grid__item" href={a.url} target="_blank" rel="noreferrer" title={a.fileName}>
              <img src={a.url} alt={a.fileName} loading="lazy" />
            </a>
          ))}
          {hidden > 0 ? (
            <button type="button" className="attachment-grid__item attachment-grid__more" onClick={onMore}>
              +{hidden}
            </button>
          ) : null}
        </div>
      ) : null}
      {files.length ? (
        <div className="row row--wrap gap-2">
          {files.map((a) => (
            <FileChip key={a.id} file={a} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FileChip({ file }: { file: AttachmentRef }) {
  return (
    <a className="file-chip" href={file.url} target="_blank" rel="noreferrer">
      <span className="file-chip__icon">
        <FileText aria-hidden />
      </span>
      <span className="text--truncate">{file.fileName}</span>
    </a>
  )
}
