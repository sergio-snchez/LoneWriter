import PropTypes from 'prop-types'
import DOMPurify from 'dompurify'
import { renderMarkdown } from '../utils'

export default function MarkdownRenderer({ content, className, clamped, clampLines }) {
  const html = DOMPurify.sanitize(renderMarkdown(content))
  return (
    <div
      className={
        className +
        (clamped ? (clampLines ? ` md-clamped md-clamped--${clampLines}` : ' md-clamped md-clamped--5') : '')
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

MarkdownRenderer.propTypes = {
  content: PropTypes.string,
  className: PropTypes.string,
  clamped: PropTypes.bool,
  clampLines: PropTypes.number,
}
