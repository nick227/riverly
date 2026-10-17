import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/patterns/Badge'
import { EmptyState, Notice } from '@/components/patterns/States'
import { useEntityTitle } from '@/lib/pageTitle'
import { docDate, findCompanyDoc } from '../config/companyDocs'

/** A company document opened from the home page. Sample content until companies add their own. */
export default function DocumentView() {
  const doc = findCompanyDoc(useParams().docId)

  useEntityTitle(
    {
      type: 'document',
      name: doc?.title,
      context: doc?.kind || 'Company Documentation',
      description: doc?.summary,
    },
    [doc?.title, doc?.kind, doc?.summary],
  )
  return (
    <main className="crm-page crm-doc">
      <Link to="/" className="text text--sm link crm-home__more">
        <ArrowLeft size={14} aria-hidden /> Company home
      </Link>
      {doc ? (
        <article className="crm-doc__article">
          <header className="stack gap-2">
            <span className="row gap-2">
              <Badge tone="outline">{doc.kind}</Badge>
              <span className="text text--xs text--muted">Updated {docDate(doc.updated)}</span>
            </span>
            <h1 className="heading heading--1">{doc.title}</h1>
            <p className="text text--secondary">{doc.summary}</p>
          </header>
          <Notice>This is a sample document. Your company’s own version will replace it.</Notice>
          {doc.sections.map((s) => (
            <section key={s.heading} className="stack gap-2">
              <h2 className="heading heading--4">{s.heading}</h2>
              {s.body ? <p className="crm-doc__body">{s.body}</p> : null}
              {s.items ? (
                <ul className="crm-doc__list">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      ) : (
        <EmptyState title="That document is not here any more." />
      )}
    </main>
  )
}
